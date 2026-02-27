/**
 * Telegram file handler implementation.
 */

import path from "node:path";
import { Readable } from "node:stream";
import { createLogger, sanitizeFilename } from "@lobu/core";
import type { Bot } from "grammy";
import { InputFile } from "grammy";
import jwt from "jsonwebtoken";
import type {
  FileMetadata,
  FileUploadOptions,
  FileUploadResult,
  IFileHandler,
} from "../platform/file-handler";

const logger = createLogger("telegram-file-handler");

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".m4v",
]);

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".opus",
  ".aac",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".md": "text/markdown",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

type UploadKind = "voice" | "photo" | "video" | "audio" | "document";

function getJwtSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY required for file token generation");
  }
  return secret;
}

function toTelegramChatId(channelId: string): number | string {
  const parsed = Number(channelId);
  return Number.isFinite(parsed) ? parsed : channelId;
}

function inferMimeType(filename: string): string | undefined {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXTENSION[ext];
}

async function streamToBuffer(fileStream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function inferUploadKind(filename: string, voiceMessage?: boolean): UploadKind {
  if (voiceMessage) return "voice";

  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "photo";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  return "document";
}

function getReplyToMessageId(options: FileUploadOptions): number | undefined {
  if (!options.threadTs) return undefined;
  if (options.threadTs === options.channelId) return undefined;

  const parsed = Number(options.threadTs);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function buildPermalink(chatId: string, messageId: number): string {
  return `tg://msg?chat_id=${chatId}&message_id=${messageId}`;
}

function extractSentFile(sent: any): {
  fileId: string;
  fileSize: number | undefined;
} {
  const photo =
    Array.isArray(sent?.photo) && sent.photo.length > 0
      ? sent.photo[sent.photo.length - 1]
      : undefined;
  const media =
    photo ??
    sent?.document ??
    sent?.video ??
    sent?.audio ??
    sent?.voice ??
    sent?.animation;

  if (!media?.file_id) {
    throw new Error("Telegram did not return a file_id for uploaded file");
  }

  return {
    fileId: String(media.file_id),
    fileSize: typeof media.file_size === "number" ? media.file_size : undefined,
  };
}

export class TelegramFileHandler implements IFileHandler {
  private uploadedFiles = new Map<string, Set<string>>();
  private jwtSecret: string;

  constructor(
    private readonly bot: Bot,
    private readonly botToken: string
  ) {
    this.jwtSecret = getJwtSecret();
  }

  async downloadFile(
    fileId: string
  ): Promise<{ stream: Readable; metadata: FileMetadata }> {
    const file = await this.bot.api.getFile(fileId);
    if (!file.file_path) {
      throw new Error(`Telegram file ${fileId} has no file_path`);
    }

    const downloadUrl = `https://api.telegram.org/file/bot${this.botToken}/${file.file_path}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download Telegram file: ${response.status} ${response.statusText}`
      );
    }
    if (!response.body) {
      throw new Error("Telegram file download returned an empty body");
    }

    const rawName = path.basename(file.file_path) || `${fileId}.bin`;
    const safeName = sanitizeFilename(rawName) || `${fileId}.bin`;
    const headerSize = Number(response.headers.get("content-length") || 0);
    const size = file.file_size || headerSize || 0;

    const metadata: FileMetadata = {
      id: fileId,
      name: safeName,
      mimetype: inferMimeType(safeName),
      size,
      url: downloadUrl,
      downloadUrl,
    };

    return {
      stream: Readable.fromWeb(response.body as any),
      metadata,
    };
  }

  async uploadFile(
    fileStream: Readable,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    const safeFilename = sanitizeFilename(options.filename);
    const fileBuffer = await streamToBuffer(fileStream);
    const chatId = toTelegramChatId(options.channelId);
    const replyToMessageId = getReplyToMessageId(options);
    const caption = options.initialComment?.trim() || undefined;
    const uploadKind = inferUploadKind(safeFilename, options.voiceMessage);
    const inputFile = new InputFile(fileBuffer, safeFilename);

    const sendOptions: Record<string, unknown> = {};
    if (caption) sendOptions.caption = caption;
    if (replyToMessageId) sendOptions.reply_to_message_id = replyToMessageId;

    logger.info(
      {
        chatId: options.channelId,
        filename: safeFilename,
        size: fileBuffer.length,
        uploadKind,
      },
      "Uploading file to Telegram"
    );

    let sent: any;
    switch (uploadKind) {
      case "voice":
        sent = await this.bot.api.sendVoice(
          chatId,
          inputFile,
          sendOptions as any
        );
        break;
      case "photo":
        sent = await this.bot.api.sendPhoto(
          chatId,
          inputFile,
          sendOptions as any
        );
        break;
      case "video":
        sent = await this.bot.api.sendVideo(
          chatId,
          inputFile,
          sendOptions as any
        );
        break;
      case "audio":
        sent = await this.bot.api.sendAudio(
          chatId,
          inputFile,
          sendOptions as any
        );
        break;
      default:
        sent = await this.bot.api.sendDocument(
          chatId,
          inputFile,
          sendOptions as any
        );
        break;
    }

    const { fileId, fileSize } = extractSentFile(sent);
    if (options.sessionKey) {
      if (!this.uploadedFiles.has(options.sessionKey)) {
        this.uploadedFiles.set(options.sessionKey, new Set());
      }
      this.uploadedFiles.get(options.sessionKey)?.add(fileId);
    }

    return {
      fileId,
      permalink: buildPermalink(options.channelId, sent.message_id),
      name: safeFilename,
      size: fileSize || fileBuffer.length,
    };
  }

  generateFileToken(
    sessionKey: string,
    fileId: string,
    expiresIn = 3600
  ): string {
    return jwt.sign(
      {
        sessionKey,
        fileId,
        type: "file_access",
        iat: Math.floor(Date.now() / 1000),
      },
      this.jwtSecret,
      {
        expiresIn,
        algorithm: "HS256",
        issuer: "lobu-gateway",
        audience: "lobu-worker",
      }
    );
  }

  validateFileToken(token: string): {
    valid: boolean;
    sessionKey?: string;
    fileId?: string;
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ["HS256"],
        issuer: "lobu-gateway",
        audience: "lobu-worker",
      });

      if (
        typeof decoded === "string" ||
        typeof decoded.sessionKey !== "string" ||
        typeof decoded.fileId !== "string" ||
        decoded.type !== "file_access"
      ) {
        return { valid: false, error: "Invalid token structure" };
      }

      return {
        valid: true,
        sessionKey: decoded.sessionKey,
        fileId: decoded.fileId,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: "Token expired" };
      }
      return { valid: false, error: "Invalid token" };
    }
  }

  getSessionFiles(sessionKey: string): string[] {
    return Array.from(this.uploadedFiles.get(sessionKey) || []);
  }

  cleanupSession(sessionKey: string): void {
    this.uploadedFiles.delete(sessionKey);
  }
}
