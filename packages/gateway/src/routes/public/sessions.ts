#!/usr/bin/env bun

import {
  createLogger,
  generateWorkerToken,
  verifyWorkerToken,
  type WorkerTokenData,
} from "@peerbot/core";
import type { Request, Response, Router } from "express";
import { randomUUID } from "node:crypto";
import type { InteractionService } from "../../interactions";
import type { QueueProducer } from "../../infrastructure/queue/queue-producer";
import type { ISessionManager, ThreadSession } from "../../session";

const logger = createLogger("sessions-api");

/**
 * Session creation request body
 */
interface CreateSessionRequest {
  /** Working directory for the agent */
  workingDirectory?: string;
  /** Agent provider (default: claude) */
  provider?: string;
  /** Optional user identifier for multi-user scenarios */
  userId?: string;
  /** Optional space ID for multi-tenant isolation */
  spaceId?: string;
}

/**
 * Session response
 */
interface SessionResponse {
  sessionId: string;
  token: string;
  expiresAt: number;
  sseUrl: string;
  messagesUrl: string;
  approveUrl: string;
}

/**
 * Message request body
 */
interface SendMessageRequest {
  content: string;
  /** Optional message ID for idempotency */
  messageId?: string;
}

/**
 * Approval request body
 */
interface ApprovalRequest {
  interactionId: string;
  answer?: string;
  formData?: Record<string, unknown>;
}

// Active SSE connections by session ID
const sseConnections = new Map<string, Set<Response>>();

// Session token expiration (24 hours)
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Extract and verify session token from request
 */
function authenticateSession(
  req: Request,
  res: Response
): WorkerTokenData | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error:
        "Missing or invalid Authorization header. Use: Authorization: Bearer <token>",
    });
    return null;
  }

  const token = authHeader.substring(7);
  const tokenData = verifyWorkerToken(token);

  if (!tokenData) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired session token",
    });
    return null;
  }

  // Verify session ID matches route param
  const sessionId = req.params.sessionId;
  if (tokenData.sessionKey !== sessionId) {
    res.status(403).json({
      success: false,
      error: "Token does not match session",
    });
    return null;
  }

  return tokenData;
}

/**
 * Check API key for session creation (cloud mode)
 * Returns true if auth passes, false otherwise
 */
function checkApiKey(req: Request, res: Response): boolean {
  const apiKey = process.env.PEERBOT_API_KEY;

  // Local mode: no API key required
  if (!apiKey) {
    return true;
  }

  // Cloud mode: require API key
  const providedKey = req.headers["x-api-key"] as string;
  if (!providedKey || providedKey !== apiKey) {
    res.status(401).json({
      success: false,
      error: "Invalid or missing API key. Use: X-API-Key: <your-api-key>",
    });
    return false;
  }

  return true;
}

/**
 * Broadcast message to all SSE connections for a session
 */
export function broadcastToSession(
  sessionId: string,
  event: string,
  data: unknown
): void {
  const connections = sseConnections.get(sessionId);
  if (!connections || connections.size === 0) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of connections) {
    try {
      res.write(message);
    } catch (error) {
      logger.error(
        `Failed to write to SSE connection for session ${sessionId}:`,
        error
      );
      connections.delete(res);
    }
  }
}

/**
 * Register public sessions HTTP routes
 * These are direct API endpoints for browser/CLI clients
 */
export function registerSessionsRoutes(
  router: Router,
  queueProducer: QueueProducer,
  sessionManager: ISessionManager,
  interactionService: InteractionService,
  publicGatewayUrl: string
): void {
  /**
   * Create a new session
   * POST /api/sessions
   *
   * Headers:
   *   X-API-Key: <api-key> (required in cloud mode, optional locally)
   *
   * Body:
   *   workingDirectory?: string - Working directory for agent
   *   provider?: string - Agent provider (default: claude)
   *   userId?: string - Optional user ID
   *   spaceId?: string - Optional space ID for isolation
   *
   * Response:
   *   sessionId: string - Unique session identifier
   *   token: string - Bearer token for subsequent requests
   *   expiresAt: number - Token expiration timestamp
   *   sseUrl: string - SSE endpoint for streaming
   *   messagesUrl: string - Endpoint for sending messages
   *   approveUrl: string - Endpoint for tool approvals
   */
  router.post("/api/sessions", async (req: Request, res: Response) => {
    try {
      // Check API key (no-op in local mode)
      if (!checkApiKey(req, res)) {
        return;
      }

      const body = req.body as CreateSessionRequest;
      const {
        workingDirectory = process.cwd(),
        provider = "claude",
        userId = `api-${randomUUID().slice(0, 8)}`,
        spaceId,
      } = body;

      // Generate unique session ID
      const sessionId = randomUUID();
      const threadId = sessionId; // For API sessions, threadId equals sessionId
      const channelId = `api-${sessionId.slice(0, 8)}`;

      // Generate deployment name (consistent with platform deployments)
      const deploymentName = `api-${userId.slice(0, 8)}-${sessionId.slice(0, 8)}`;

      // Create session token
      const token = generateWorkerToken(userId, threadId, deploymentName, {
        channelId,
        spaceId: spaceId || `api-${userId}`,
        platform: "api",
        sessionKey: sessionId,
      });

      const expiresAt = Date.now() + TOKEN_EXPIRATION_MS;

      // Create session record
      const session: ThreadSession = {
        sessionKey: sessionId,
        threadId,
        channelId,
        userId,
        threadCreator: userId,
        lastActivity: Date.now(),
        createdAt: Date.now(),
        // Store additional metadata
        status: "created",
      };
      await sessionManager.setSession(session);

      logger.info(`Created API session: ${sessionId} for user ${userId}`);

      // Build response URLs
      const baseUrl = publicGatewayUrl || `http://localhost:8080`;
      const response: SessionResponse = {
        sessionId,
        token,
        expiresAt,
        sseUrl: `${baseUrl}/api/sessions/${sessionId}/events`,
        messagesUrl: `${baseUrl}/api/sessions/${sessionId}/messages`,
        approveUrl: `${baseUrl}/api/sessions/${sessionId}/approve`,
      };

      res.status(201).json({
        success: true,
        ...response,
      });
    } catch (error) {
      logger.error("Failed to create session:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create session",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * SSE stream for session events
   * GET /api/sessions/:sessionId/events
   *
   * Headers:
   *   Authorization: Bearer <token>
   *
   * SSE Events:
   *   connected - Connection established
   *   output - Agent output (text, tool use, etc.)
   *   tool_approval - Tool approval required
   *   complete - Agent turn complete
   *   error - Error occurred
   */
  router.get(
    "/api/sessions/:sessionId/events",
    async (req: Request, res: Response) => {
      const tokenData = authenticateSession(req, res);
      if (!tokenData) {
        return;
      }

      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID is required" });
      }

      // Verify session exists
      const session = await sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
        });
      }

      // Setup SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/proxy buffering
      res.flushHeaders();

      // Disable socket buffering
      const socket = (res as any).socket || (res as any).connection;
      if (socket) {
        socket.setNoDelay(true);
      }

      // Add to connections map
      if (!sseConnections.has(sessionId)) {
        sseConnections.set(sessionId, new Set());
      }
      sseConnections.get(sessionId)!.add(res);

      logger.info(`SSE connection established for session ${sessionId}`);

      // Send connected event
      res.write(
        `event: connected\ndata: ${JSON.stringify({ sessionId, timestamp: Date.now() })}\n\n`
      );

      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(
            `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`
          );
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle disconnect
      req.on("close", () => {
        clearInterval(heartbeatInterval);
        const connections = sseConnections.get(sessionId);
        if (connections) {
          connections.delete(res);
          if (connections.size === 0) {
            sseConnections.delete(sessionId);
          }
        }
        logger.info(`SSE connection closed for session ${sessionId}`);
      });
    }
  );

  /**
   * Send a message to the session
   * POST /api/sessions/:sessionId/messages
   *
   * Headers:
   *   Authorization: Bearer <token>
   *
   * Body:
   *   content: string - Message content
   *   messageId?: string - Optional message ID for idempotency
   */
  router.post(
    "/api/sessions/:sessionId/messages",
    async (req: Request, res: Response) => {
      const tokenData = authenticateSession(req, res);
      if (!tokenData) {
        return;
      }

      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID is required" });
      }
      const body = req.body as SendMessageRequest;
      const { content, messageId = randomUUID() } = body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({
          success: false,
          error: "content is required and must be a string",
        });
      }

      try {
        // Verify session exists
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: "Session not found",
          });
        }

        // Update session activity
        await sessionManager.touchSession(sessionId);

        // Enqueue message for worker processing
        const jobId = await queueProducer.enqueueMessage({
          userId: tokenData.userId,
          threadId: tokenData.threadId || sessionId,
          messageId,
          channelId: tokenData.channelId,
          teamId: tokenData.teamId || "api",
          spaceId: tokenData.spaceId || `api-${tokenData.userId}`,
          botId: "peerbot-api",
          platform: "api",
          messageText: content,
          platformMetadata: {
            sessionId,
            source: "direct-api",
          },
          agentOptions: {},
        });

        logger.info(
          `Enqueued message ${messageId} for session ${sessionId}, jobId: ${jobId}`
        );

        res.json({
          success: true,
          messageId,
          jobId,
          queued: true,
        });
      } catch (error) {
        logger.error(`Failed to send message to session ${sessionId}:`, error);
        res.status(500).json({
          success: false,
          error: "Failed to send message",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Respond to a tool approval request
   * POST /api/sessions/:sessionId/approve
   *
   * Headers:
   *   Authorization: Bearer <token>
   *
   * Body:
   *   interactionId: string - Interaction ID
   *   answer?: string - For radio/button interactions
   *   formData?: object - For form interactions
   */
  router.post(
    "/api/sessions/:sessionId/approve",
    async (req: Request, res: Response) => {
      const tokenData = authenticateSession(req, res);
      if (!tokenData) {
        return;
      }

      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID is required" });
      }
      const body = req.body as ApprovalRequest;
      const { interactionId, answer, formData } = body;

      if (!interactionId) {
        return res.status(400).json({
          success: false,
          error: "interactionId is required",
        });
      }

      const hasAnswer = answer !== undefined;
      const hasFormData = formData !== undefined;

      if (!hasAnswer && !hasFormData) {
        return res.status(400).json({
          success: false,
          error:
            "Provide either 'answer' (for radio/buttons) or 'formData' (for forms)",
        });
      }

      if (hasAnswer && hasFormData) {
        return res.status(400).json({
          success: false,
          error: "Provide only one: 'answer' or 'formData', not both",
        });
      }

      try {
        // Get interaction
        const interaction =
          await interactionService.getInteraction(interactionId);

        if (!interaction) {
          return res.status(404).json({
            success: false,
            error: "Interaction not found or expired",
          });
        }

        // Verify interaction belongs to this session
        if (
          interaction.threadId !== sessionId &&
          interaction.threadId !== tokenData.threadId
        ) {
          return res.status(403).json({
            success: false,
            error: "Interaction does not belong to this session",
          });
        }

        if (interaction.status === "responded") {
          return res.status(400).json({
            success: false,
            error: "Interaction already responded to",
          });
        }

        if (interaction.expiresAt < Date.now()) {
          return res.status(410).json({
            success: false,
            error: "Interaction expired",
          });
        }

        logger.info(
          `API approval for session ${sessionId}, interaction ${interactionId}: ${answer || "formData"}`
        );

        // Process the response
        await interactionService.respond(interactionId, { answer, formData });

        res.json({
          success: true,
          message: "Approval processed",
          interactionId,
        });
      } catch (error) {
        logger.error(
          `Failed to process approval for session ${sessionId}:`,
          error
        );
        res.status(500).json({
          success: false,
          error: "Failed to process approval",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get session status
   * GET /api/sessions/:sessionId
   *
   * Headers:
   *   Authorization: Bearer <token>
   */
  router.get(
    "/api/sessions/:sessionId",
    async (req: Request, res: Response) => {
      const tokenData = authenticateSession(req, res);
      if (!tokenData) {
        return;
      }

      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID is required" });
      }

      try {
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: "Session not found",
          });
        }

        const hasActiveConnection =
          sseConnections.has(sessionId) &&
          sseConnections.get(sessionId)!.size > 0;

        res.json({
          success: true,
          session: {
            sessionId: session.sessionKey,
            userId: session.userId,
            status: session.status || "active",
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            hasActiveConnection,
          },
        });
      } catch (error) {
        logger.error(`Failed to get session ${sessionId}:`, error);
        res.status(500).json({
          success: false,
          error: "Failed to get session",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Delete/end a session
   * DELETE /api/sessions/:sessionId
   *
   * Headers:
   *   Authorization: Bearer <token>
   */
  router.delete(
    "/api/sessions/:sessionId",
    async (req: Request, res: Response) => {
      const tokenData = authenticateSession(req, res);
      if (!tokenData) {
        return;
      }

      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res
          .status(400)
          .json({ success: false, error: "Session ID is required" });
      }

      try {
        // Close all SSE connections for this session
        const connections = sseConnections.get(sessionId);
        if (connections) {
          for (const connection of connections) {
            try {
              connection.write(
                `event: closed\ndata: ${JSON.stringify({ reason: "session_deleted" })}\n\n`
              );
              connection.end();
            } catch {
              // Ignore errors closing connections
            }
          }
          sseConnections.delete(sessionId);
        }

        // Delete session from store
        await sessionManager.deleteSession(sessionId);

        logger.info(`Deleted session ${sessionId}`);

        res.json({
          success: true,
          message: "Session deleted",
          sessionId,
        });
      } catch (error) {
        logger.error(`Failed to delete session ${sessionId}:`, error);
        res.status(500).json({
          success: false,
          error: "Failed to delete session",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  logger.info("✅ Sessions API routes registered");
}
