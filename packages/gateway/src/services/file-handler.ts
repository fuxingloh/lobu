import { Readable } from "node:stream";
import { createLogger, sanitizeFilename } from "@peerbot/core";
import jwt from "jsonwebtoken";
import type { WebClient } from "@slack/web-api";

const logger = createLogger("file-handler");

// Use existing ENCRYPTION_KEY for JWT signing (32-byte key required by system)
function getJwtSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for secure file token generation"
    );
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

interface SlackFileMetadata {
  id: string;
  name: string;
  mimetype?: string;
  size: number;
  url_private: string;
  url_private_download: string;
  permalink?: string;
  timestamp: number;
}

interface FileUploadResult {
  fileId: string;
  permalink: string;
  name: string;
  size: number;
}

/**
 * Handles file operations between Slack and workers
 */
export class FileHandler {
  private uploadedFiles: Map<string, Set<string>> = new Map(); // sessionKey -> fileIds

  constructor(private slackClient: WebClient) {}

  /**
   * Download a file from Slack
   */
  async downloadFile(
    fileId: string,
    bearerToken: string
  ): Promise<{ stream: Readable; metadata: SlackFileMetadata }> {
    try {
      // Get file info
      const fileInfo = await this.slackClient.files.info({
        file: fileId,
      });

      if (!fileInfo.ok || !fileInfo.file) {
        throw new Error(`Failed to get file info: ${fileInfo.error}`);
      }

      const file = fileInfo.file as any;
      const metadata: SlackFileMetadata = {
        id: file.id,
        name: file.name,
        mimetype: file.mimetype,
        size: file.size,
        url_private: file.url_private,
        url_private_download: file.url_private_download,
        permalink: file.permalink,
        timestamp: file.timestamp,
      };

      // Download file using the bearer token
      const response = await fetch(metadata.url_private_download, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Convert web stream to Node.js readable stream
      const nodeStream = Readable.fromWeb(response.body as any);

      return { stream: nodeStream, metadata };
    } catch (error) {
      logger.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(
    fileStream: Readable,
    options: {
      filename: string;
      channelId: string;
      threadTs?: string;
      title?: string;
      initialComment?: string;
      sessionKey?: string;
    }
  ): Promise<FileUploadResult> {
    try {
      // Sanitize filename to prevent path traversal
      const safeFilename = sanitizeFilename(options.filename);

      if (safeFilename !== options.filename) {
        logger.warn(
          `Filename sanitized from "${options.filename}" to "${safeFilename}"`
        );
      }

      // Convert stream to buffer for Slack API
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fileBuffer = Buffer.concat(chunks);

      logger.info(
        `Uploading file ${safeFilename} (${fileBuffer.length} bytes) to channel ${options.channelId}, thread ${options.threadTs}`
      );

      // Use files.uploadV2 for better performance
      const uploadParams: any = {
        channel_id: options.channelId,
        filename: safeFilename,
        file: fileBuffer,
        title: options.title || safeFilename,
      };

      if (options.threadTs) {
        uploadParams.thread_ts = options.threadTs;
      }

      if (options.initialComment) {
        uploadParams.initial_comment = options.initialComment;
      }

      const result = await this.slackClient.files.uploadV2(uploadParams);

      if (!result.ok) {
        throw new Error(`Failed to upload file: ${result.error}`);
      }

      // files.uploadV2 response structure: { files: [ { id, name, ... } ] }
      const files = (result as any).files;
      if (!files || files.length === 0) {
        throw new Error("Upload succeeded but no file info returned");
      }

      const file = files[0];

      // Track uploaded files per session
      if (options.sessionKey) {
        if (!this.uploadedFiles.has(options.sessionKey)) {
          this.uploadedFiles.set(options.sessionKey, new Set());
        }
        this.uploadedFiles.get(options.sessionKey)!.add(file.id);
      }

      logger.info(`Successfully uploaded file: ${file.id} - ${file.name}`);

      return {
        fileId: file.id,
        permalink: file.permalink || file.url_private,
        name: file.name,
        size: file.size || fileBuffer.length,
      };
    } catch (error) {
      logger.error(`Failed to upload file ${options.filename}:`, error);
      throw error;
    }
  }

  /**
   * Get uploaded files for a session
   */
  getSessionFiles(sessionKey: string): string[] {
    return Array.from(this.uploadedFiles.get(sessionKey) || []);
  }

  /**
   * Clean up session files
   */
  cleanupSession(sessionKey: string): void {
    this.uploadedFiles.delete(sessionKey);
  }

  /**
   * Generate a secure file token using JWT
   */
  generateFileToken(
    sessionKey: string,
    fileId: string,
    expiresIn: number = 3600
  ): string {
    const payload = {
      sessionKey,
      fileId,
      type: "file_access",
      iat: Math.floor(Date.now() / 1000),
    };

    try {
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn, // seconds
        algorithm: "HS256",
        issuer: "peerbot-gateway",
        audience: "peerbot-worker",
      });

      logger.debug(
        `Generated JWT file token for session ${sessionKey}, file ${fileId}`
      );
      return token;
    } catch (error) {
      logger.error("Failed to generate file token:", error);
      throw new Error("Failed to generate secure file token");
    }
  }

  /**
   * Validate file token using JWT verification
   */
  validateFileToken(token: string): {
    valid: boolean;
    sessionKey?: string;
    fileId?: string;
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "peerbot-gateway",
        audience: "peerbot-worker",
      });

      // Runtime type check - jwt.verify returns string | JwtPayload
      if (typeof decoded === "string") {
        logger.error("JWT decoded to string instead of object");
        return { valid: false, error: "Invalid token format" };
      }

      // Now we know it's JwtPayload, verify our custom fields exist
      if (
        !decoded ||
        typeof decoded.sessionKey !== "string" ||
        typeof decoded.fileId !== "string" ||
        typeof decoded.type !== "string"
      ) {
        logger.error("JWT missing required fields");
        return { valid: false, error: "Invalid token structure" };
      }

      // Additional validation: ensure token type is correct
      if (decoded.type !== "file_access") {
        logger.warn("Invalid token type:", decoded.type);
        return { valid: false, error: "Invalid token type" };
      }

      const validatedToken = decoded as {
        sessionKey: string;
        fileId: string;
        type: string;
      };

      logger.debug(
        `Validated JWT file token for session ${validatedToken.sessionKey}, file ${validatedToken.fileId}`
      );
      return {
        valid: true,
        sessionKey: validatedToken.sessionKey,
        fileId: validatedToken.fileId,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`File token validation failed: ${errorMsg}`);

      // Provide specific error messages for debugging
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: "Token expired" };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: "Invalid token signature" };
      }

      return { valid: false, error: "Token validation failed" };
    }
  }
}
