import { createLogger, moduleRegistry } from "@peerbot/core";
import { App, ExpressReceiver, LogLevel } from "@slack/bolt";
import type { GatewayConfig } from "../cli/config";
import { SocketHealthMonitor } from "../health/socket-health-monitor";
import type { PlatformAdapter } from "../platform/platform-adapter";
import type { CoreServices } from "../services/core-services";
import { SlackEventHandlers } from "./event-router";
import { ThreadResponseConsumer } from "./thread-processor";

const logger = createLogger("slack-dispatcher");

/**
 * Slack platform adapter
 * Implements PlatformAdapter interface to integrate Slack with the gateway
 */
export class SlackDispatcher implements PlatformAdapter {
  readonly name = "slack";

  private app: App;
  private services!: CoreServices;
  private threadResponseConsumer?: ThreadResponseConsumer;
  private socketHealthMonitor?: SocketHealthMonitor;
  private isRunning = false;

  constructor(private readonly config: GatewayConfig) {
    // Initialize Slack app based on mode
    if (config.slack.socketMode === false) {
      // HTTP mode - use ExpressReceiver
      const receiver = new ExpressReceiver({
        signingSecret: config.slack.signingSecret!,
        endpoints: {
          events: "/slack/events",
        },
        processBeforeResponse: true,
        logLevel: LogLevel.DEBUG,
      });

      // Add URL verification challenge handler BEFORE Slack middleware
      receiver.router.use("/slack/events", (req, res, next) => {
        if (req.body && req.body.type === "url_verification") {
          logger.info("Handling Slack URL verification challenge");
          return res.status(200).json({ challenge: req.body.challenge });
        }
        next();
      });

      this.app = new App({
        token: config.slack.token,
        receiver,
        logLevel: config.logLevel || LogLevel.DEBUG,
        ignoreSelf: false,
      });

      logger.info("Initialized Slack app in HTTP mode");
    } else {
      // Socket mode
      const appConfig: any = {
        signingSecret: config.slack.signingSecret,
        socketMode: true,
        appToken: config.slack.appToken,
        port: config.slack.port || 3000,
        logLevel: config.logLevel || LogLevel.INFO,
        ignoreSelf: false,
        processBeforeResponse: true,
      };

      if (config.slack.token) {
        appConfig.token = config.slack.token;
      } else {
        throw new Error("SLACK_BOT_TOKEN is required");
      }

      this.app = new App(appConfig);
      logger.info("Initialized Slack app in Socket mode");
    }

    this.setupErrorHandling();
    this.setupGracefulShutdown();

    // Add global middleware to log all events
    this.app.use(async ({ payload, next }) => {
      const event = (payload as any).event || payload;
      logger.debug(
        `[Slack Event] Type: ${event?.type}, Subtype: ${event?.subtype}`
      );
      if (event) {
        logger.debug(
          `[Slack Event Details]`,
          JSON.stringify(event).substring(0, 200)
        );
      }
      await next();
    });
  }

  /**
   * Initialize the platform with core services (PlatformAdapter interface)
   * This is called by Gateway after core services are initialized
   */
  async initialize(services: CoreServices): Promise<void> {
    logger.info("Initializing Slack platform adapter...");
    this.services = services;

    // Initialize bot info and event handlers
    await this.initializeBotInfo();

    logger.info("✅ Slack platform adapter initialized");
  }

  /**
   * Initialize Socket Mode connection and monitoring
   */
  private async initializeSocketMode(): Promise<void> {
    const socketModeClient = (this.app as any).receiver?.client;
    if (!socketModeClient) {
      logger.warn("No Socket Mode client found in receiver");
      return;
    }

    // Circuit breaker: detect reconnection loops and exit
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

      logger.info(
        `Socket Mode connection attempt ${connectionCount}/${RECONNECTION_THRESHOLD} (window: ${timeSinceLastConnection}ms)`
      );

      if (
        connectionCount >= RECONNECTION_THRESHOLD &&
        timeSinceLastConnection < RECONNECTION_WINDOW_MS
      ) {
        logger.error(
          `❌ FATAL: Detected reconnection loop (${connectionCount} reconnections in ${timeSinceLastConnection}ms)`
        );
        logger.error(
          "Exiting process - Docker/K8s will restart with clean state"
        );
        process.exit(1);
      }
    };

    // Initialize health monitor for zombie connection detection
    this.socketHealthMonitor = new SocketHealthMonitor(this.config.health);

    socketModeClient.on("slack_event", (event: any, _body: any) => {
      logger.info("Socket Mode event received:", event.type);
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
      logger.info("Socket Mode connected successfully!");
      this.socketHealthMonitor?.recordSocketEvent();

      // Reset counter on successful stable connection
      setTimeout(() => {
        connectionCount = 0;
        logger.debug("Connection stable - reset reconnection counter");
      }, require("../constants").TIME.FIVE_SECONDS_MS);

      // Start health monitoring after successful connection
      if (this.socketHealthMonitor) {
        const workerGateway = this.services.getWorkerGateway();
        this.socketHealthMonitor.start(
          () => workerGateway?.getActiveConnections().length || 0
        );
        logger.info("✅ Socket health monitoring enabled");
      }
    });

    // Start the Socket Mode app
    this.app.start();

    // Wait for connection or timeout
    const connectionPromise = new Promise<void>((resolve, reject) => {
      if (!socketModeClient) {
        reject(new Error("Socket Mode client not found"));
        return;
      }

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

    // Give it a moment to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
      logger.debug("Headers:", req.headers);
      if (req.method === "POST" && req.body) {
        logger.debug("Body:", JSON.stringify(req.body).substring(0, 200));
      }
      next();
    });

    logger.debug("Express routes after Slack app start:");
    expressApp._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        logger.debug(
          `- ${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${middleware.route.path}`
        );
      } else if (middleware.name === "router") {
        logger.debug("- Router middleware");
      }
    });
  }

  /**
   * Start the platform (PlatformAdapter interface)
   * Connect to Slack API and start event listeners
   */
  async start(): Promise<void> {
    try {
      logger.info("Starting Slack platform adapter...");

      // Start thread response consumer
      if (this.threadResponseConsumer) {
        await this.threadResponseConsumer.start();
        logger.info("✅ Thread response consumer started");
      }

      // Start Slack app based on mode
      logger.debug(
        `Starting Slack app in ${this.config.slack.socketMode ? "Socket Mode" : "HTTP Mode"}`
      );

      if (this.config.slack.socketMode === false) {
        await this.initializeHttpMode();
      } else {
        logger.info("Starting Slack app in Socket Mode...");
        await this.initializeSocketMode();
      }

      this.isRunning = true;

      const mode = this.config.slack.socketMode
        ? "Socket Mode"
        : `HTTP on port ${this.config.slack.port}`;
      logger.info(`🚀 Slack platform adapter is running in ${mode}!`);

      // Log configuration
      logger.info("Configuration:");
      logger.info(
        `- Session Timeout: ${this.config.sessionTimeoutMinutes} minutes`
      );
      logger.info(
        `- Signing Secret: ${this.config.slack.signingSecret?.substring(0, 8)}...`
      );
    } catch (error) {
      logger.error("Failed to start Slack platform adapter:", error);
      throw error;
    }
  }

  /**
   * Stop the platform gracefully (PlatformAdapter interface)
   */
  async stop(): Promise<void> {
    try {
      logger.info("Stopping Slack platform adapter...");
      this.isRunning = false;

      // Stop health monitor first
      if (this.socketHealthMonitor) {
        this.socketHealthMonitor.stop();
        logger.info("Socket health monitor stopped");
      }

      // Stop Slack app
      await this.app.stop();
      logger.info("Slack app stopped");

      // Stop thread response consumer
      if (this.threadResponseConsumer) {
        await this.threadResponseConsumer.stop();
        logger.info("Thread response consumer stopped");
      }

      logger.info("✅ Slack platform adapter stopped");
    } catch (error) {
      logger.error("Error stopping Slack platform adapter:", error);
      throw error;
    }
  }

  /**
   * Check if platform is healthy and running (PlatformAdapter interface)
   */
  isHealthy(): boolean {
    return this.isRunning && this.app !== undefined;
  }

  /**
   * Get dispatcher status
   */
  getStatus(): {
    isRunning: boolean;
    mode: string;
    config: Partial<GatewayConfig>;
  } {
    return {
      isRunning: this.isRunning,
      mode: "queue",
      config: {
        slack: {
          token: this.config.slack.token,
          socketMode: this.config.slack.socketMode,
          port: this.config.slack.port,
          apiUrl: this.config.slack.apiUrl,
        },
        queues: this.config.queues,
      },
    };
  }

  /**
   * Initialize bot info and event handlers
   * CRITICAL: This must be called BEFORE starting the app to ensure
   * all handlers have access to bot IDs during initialization
   */
  private async initializeBotInfo(): Promise<void> {
    try {
      // Validate bot IDs are set or fetch them
      if (!this.config.slack.botUserId || !this.config.slack.botId) {
        logger.info("Bot IDs not configured, calling auth.test via HTTP...");

        // Use direct HTTP call instead of Slack Bolt client
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

        if (!authResult.ok) {
          throw new Error(
            `Auth test failed: ${authResult.error || "Unknown error"}`
          );
        }

        if (!authResult.user_id || !authResult.bot_id) {
          throw new Error("Auth test did not return bot IDs");
        }

        // Store bot info in config
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

      // Now that bot IDs are set, initialize event handlers
      logger.info("Initializing queue-based event handlers");
      new SlackEventHandlers(
        this.app,
        this.services.getQueueProducer(),
        this.config,
        moduleRegistry,
        this.services.getQueue()
      );

      // Create ThreadResponseConsumer with the queue from services
      this.threadResponseConsumer = new ThreadResponseConsumer(
        this.services.getQueue(),
        this.config.slack.token,
        moduleRegistry
      );
    } catch (error) {
      logger.error("Failed to initialize bot:", error);
      throw new Error("Failed to initialize bot - could not get bot user ID");
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.error(async (error: Error) => {
      logger.error("Slack app error:", error);
      logger.error("Error details:", {
        message: error.message,
        code: (error as any).code,
        data: (error as any).data,
        stack: error.stack,
      });
    });

    process.on("unhandledRejection", (reason, promise) => {
      // Filter out expected Socket Mode connection events
      const reasonStr = String(reason);
      if (
        reasonStr.includes("server explicit disconnect") ||
        reasonStr.includes("Unhandled event") ||
        reasonStr.includes("state machine")
      ) {
        // These are expected Socket Mode reconnection events, just log as debug
        logger.debug(
          "Socket Mode connection event (expected):",
          reasonStr.substring(0, 100)
        );
        return;
      }

      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      // Don't exit on unhandled rejections during startup
      // The app might still work despite some initialization errors
    });

    process.on("uncaughtException", (error) => {
      const errorStr = error?.toString() || "";
      const messageStr = (error as any)?.message || "";

      // Check if this is a Socket Mode connection error that should be ignored
      if (
        errorStr.includes("server explicit disconnect") ||
        messageStr.includes("server explicit disconnect") ||
        errorStr.includes("Unhandled event") ||
        messageStr.includes("Unhandled event") ||
        errorStr.includes("state machine") ||
        messageStr.includes("state machine")
      ) {
        // These are expected Socket Mode reconnection events, just log as debug
        logger.debug(
          "Socket Mode connection exception (expected, will reconnect):",
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
      logger.info("Shutting down Slack dispatcher...");

      // Stop accepting new jobs
      await this.stop();

      // Queue cleanup is handled by stop()
      logger.info("Slack dispatcher shutdown complete");
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }
}
