#!/usr/bin/env bun

import { createLogger, moduleRegistry } from "@peerbot/core";
import { App, ExpressReceiver, LogLevel } from "@slack/bolt";
import type { GatewayConfig } from "../cli/config";
import { SocketHealthMonitor } from "../health/socket-health-monitor";
import type { CoreServices } from "../services/core-services";
import { SlackEventHandlers } from "../slack/event-router";
import { ThreadResponseConsumer } from "../slack/thread-processor";
import type { PlatformAdapter } from "./platform-adapter";

const logger = createLogger("slack-platform");

/**
 * Slack platform adapter
 * Handles all Slack-specific functionality
 * Uses core services provided by Gateway
 */
export class SlackPlatform implements PlatformAdapter {
  readonly name = "slack";

  private app!: App;
  private threadResponseConsumer?: ThreadResponseConsumer;
  private socketHealthMonitor?: SocketHealthMonitor;
  private services!: CoreServices;

  constructor(private readonly config: GatewayConfig) {
    // Initialize Slack app (doesn't connect yet)
    this.initializeSlackApp();
  }

  /**
   * Initialize Slack app (HTTP or Socket Mode)
   */
  private initializeSlackApp(): void {
    if (this.config.slack.socketMode === false) {
      // HTTP mode
      const receiver = new ExpressReceiver({
        signingSecret: this.config.slack.signingSecret!,
        endpoints: { events: "/slack/events" },
        processBeforeResponse: true,
        logLevel: LogLevel.DEBUG,
      });

      // URL verification challenge handler
      receiver.router.use("/slack/events", (req, res, next) => {
        if (req.body && req.body.type === "url_verification") {
          logger.info("Handling Slack URL verification challenge");
          return res.status(200).json({ challenge: req.body.challenge });
        }
        next();
      });

      this.app = new App({
        token: this.config.slack.token,
        receiver,
        logLevel: this.config.logLevel || LogLevel.DEBUG,
        ignoreSelf: false,
      });

      logger.info("Slack app initialized in HTTP mode");
    } else {
      // Socket mode
      const appConfig: any = {
        signingSecret: this.config.slack.signingSecret,
        socketMode: true,
        appToken: this.config.slack.appToken,
        port: this.config.slack.port || 3000,
        logLevel: this.config.logLevel || LogLevel.INFO,
        ignoreSelf: false,
        processBeforeResponse: true,
      };

      if (this.config.slack.token) {
        appConfig.token = this.config.slack.token;
      } else {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      this.app = new App(appConfig);
      logger.info("Slack app initialized in Socket mode");
    }

    this.setupErrorHandling();
    this.setupGracefulShutdown();

    // Add global middleware to log events
    this.app.use(async ({ payload, next }) => {
      const event = (payload as any).event || payload;
      logger.debug(
        `[Slack Event] Type: ${event?.type}, Subtype: ${event?.subtype}`
      );
      await next();
    });
  }

  /**
   * Initialize with core services
   */
  async initialize(services: CoreServices): Promise<void> {
    logger.info("Initializing Slack platform...");
    this.services = services;

    // Get bot info
    await this.initializeBotInfo();

    // Create thread response consumer
    this.threadResponseConsumer = new ThreadResponseConsumer(
      services.getQueue(),
      this.config.slack.token,
      moduleRegistry
    );

    // Initialize event handlers
    new SlackEventHandlers(
      this.app,
      services.getQueueProducer(),
      this.config,
      moduleRegistry,
      services.getQueue()
    );

    logger.info("✅ Slack platform initialized");
  }

  /**
   * Start Slack platform
   */
  async start(): Promise<void> {
    logger.info("Starting Slack platform...");

    // Start thread response consumer
    if (this.threadResponseConsumer) {
      await this.threadResponseConsumer.start();
    }

    // Start Slack app
    if (this.config.slack.socketMode === false) {
      await this.initializeHttpMode();
    } else {
      await this.initializeSocketMode();
    }

    const mode = this.config.slack.socketMode
      ? "Socket Mode"
      : `HTTP on port ${this.config.slack.port}`;
    logger.info(`✅ Slack platform running in ${mode}`);
  }

  /**
   * Stop Slack platform
   */
  async stop(): Promise<void> {
    logger.info("Stopping Slack platform...");

    // Stop health monitor
    if (this.socketHealthMonitor) {
      this.socketHealthMonitor.stop();
    }

    // Stop Slack app
    await this.app.stop();

    // Stop thread response consumer
    if (this.threadResponseConsumer) {
      await this.threadResponseConsumer.stop();
    }

    logger.info("✅ Slack platform stopped");
  }

  /**
   * Check health
   */
  isHealthy(): boolean {
    // Check if app is running and queue is healthy
    return this.services?.getQueueProducer().isHealthy() ?? false;
  }

  /**
   * Initialize bot info (bot user ID and bot ID)
   */
  private async initializeBotInfo(): Promise<void> {
    if (!this.config.slack.botUserId || !this.config.slack.botId) {
      logger.info("Bot IDs not configured, calling auth.test...");

      const response = await fetch(`${this.config.slack.apiUrl}/auth.test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.slack.token}`,
          "Content-Type": "application/json",
        },
      });

      const authResult = (await response.json()) as {
        ok: boolean;
        user_id?: string;
        bot_id?: string;
        error?: string;
      };

      if (!authResult.ok || !authResult.user_id || !authResult.bot_id) {
        throw new Error(
          `Auth test failed: ${authResult.error || "Unknown error"}`
        );
      }

      this.config.slack.botUserId = authResult.user_id;
      this.config.slack.botId = authResult.bot_id;

      logger.info(
        `Bot initialized - User ID: ${authResult.user_id}, Bot ID: ${authResult.bot_id}`
      );
    } else {
      logger.info(
        `Using configured bot IDs - User ID: ${this.config.slack.botUserId}, Bot ID: ${this.config.slack.botId}`
      );
    }
  }

  /**
   * Initialize HTTP Mode
   */
  private async initializeHttpMode(): Promise<void> {
    await this.app.start(this.config.slack.port || 3000);

    const receiver = (this.app as any).receiver as ExpressReceiver;
    const expressApp = receiver.app;

    // Add request logging middleware
    expressApp.use((req: any, _res: any, next: any) => {
      logger.debug(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    logger.info(
      `✅ Slack HTTP mode started on port ${this.config.slack.port || 3000}`
    );
  }

  /**
   * Initialize Socket Mode
   */
  private async initializeSocketMode(): Promise<void> {
    const socketModeClient = (this.app as any).receiver?.client;
    if (!socketModeClient) {
      logger.warn("No Socket Mode client found");
      return;
    }

    // Circuit breaker for reconnection loops
    let connectionCount = 0;
    let lastConnectionTime = Date.now();
    const RECONNECTION_THRESHOLD = 5;
    const RECONNECTION_WINDOW_MS = 30000;

    const checkReconnectionLoop = () => {
      const now = Date.now();
      const timeSinceLastConnection = now - lastConnectionTime;

      if (timeSinceLastConnection > RECONNECTION_WINDOW_MS) {
        connectionCount = 0;
      }

      connectionCount++;
      lastConnectionTime = now;

      if (
        connectionCount >= RECONNECTION_THRESHOLD &&
        timeSinceLastConnection < RECONNECTION_WINDOW_MS
      ) {
        logger.error(
          `❌ FATAL: Detected reconnection loop (${connectionCount} reconnections in ${timeSinceLastConnection}ms)`
        );
        process.exit(1);
      }
    };

    // Initialize health monitor
    this.socketHealthMonitor = new SocketHealthMonitor(this.config.health);

    socketModeClient.on("slack_event", (event: any) => {
      logger.debug("Socket Mode event:", event.type);
      this.socketHealthMonitor?.recordSocketEvent();
    });

    socketModeClient.on("disconnect", () => {
      logger.warn("Socket Mode disconnected, will auto-reconnect");
    });

    socketModeClient.on("error", (error: Error) => {
      logger.error("Socket Mode error:", error);
    });

    socketModeClient.on("ready", () => {
      logger.info("Socket Mode client ready");
      this.socketHealthMonitor?.recordSocketEvent();
    });

    socketModeClient.on("connecting", () => {
      logger.info("Socket Mode connecting...");
      checkReconnectionLoop();
    });

    socketModeClient.on("connected", () => {
      logger.info("Socket Mode connected!");
      this.socketHealthMonitor?.recordSocketEvent();

      // Reset counter on stable connection
      setTimeout(() => {
        connectionCount = 0;
        logger.debug("Connection stable - reset reconnection counter");
      }, 5000);

      // Start health monitoring
      if (this.socketHealthMonitor && this.services.getWorkerGateway()) {
        this.socketHealthMonitor.start(
          () =>
            this.services.getWorkerGateway()?.getActiveConnections().length || 0
        );
        logger.info("✅ Socket health monitoring enabled");
      }
    });

    // Start Socket Mode app
    this.app.start();

    // Wait for connection
    const connectionPromise = new Promise<void>((resolve, reject) => {
      const connectedHandler = () => {
        logger.info("✅ Socket Mode connection established!");
        clearTimeout(timeoutId);
        resolve();
      };

      const timeoutId = setTimeout(() => {
        socketModeClient.removeListener("connected", connectedHandler);
        reject(new Error("Socket Mode connection timeout"));
      }, 10000);

      if (
        socketModeClient.isConnected?.() ||
        socketModeClient.stateMachine?.getCurrentState?.() === "connected"
      ) {
        connectedHandler();
      } else {
        socketModeClient.once("connected", connectedHandler);
      }
    });

    await connectionPromise.catch((error) => {
      logger.warn("Socket Mode connection warning:", error.message);
    });

    // Stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.error(async (error: Error) => {
      logger.error("Slack app error:", error);
    });

    process.on("unhandledRejection", (reason) => {
      const reasonStr = String(reason);
      if (
        reasonStr.includes("server explicit disconnect") ||
        reasonStr.includes("Unhandled event")
      ) {
        logger.debug(
          "Socket Mode connection event (expected):",
          reasonStr.substring(0, 100)
        );
        return;
      }
      logger.error("Unhandled Rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      const errorStr = error?.toString() || "";
      if (
        errorStr.includes("server explicit disconnect") ||
        errorStr.includes("Unhandled event")
      ) {
        logger.debug(
          "Socket Mode exception (expected):",
          errorStr.substring(0, 100)
        );
        return;
      }
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      logger.info("Graceful shutdown initiated...");
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }
}
