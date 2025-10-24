#!/usr/bin/env bun

import { createLogger } from "@peerbot/core";
import type { GatewayConfig } from "./cli/config";
import type { PlatformAdapter } from "./platform/platform-adapter";
import { CoreServices } from "./services/core-services";

const logger = createLogger("gateway");

/**
 * Main Gateway class that orchestrates all platform adapters
 *
 * Architecture:
 * - CoreServices: Platform-agnostic services (Redis, MCP, Anthropic)
 * - PlatformAdapters: Platform-specific integrations (Slack, Discord, etc.)
 *
 * Lifecycle:
 * 1. Gateway initializes CoreServices
 * 2. Platforms register themselves via registerPlatform()
 * 3. Gateway calls initialize() on each platform with CoreServices
 * 4. Gateway calls start() on each platform
 */
export class Gateway {
  private coreServices: CoreServices;
  private platforms: Map<string, PlatformAdapter> = new Map();
  private isRunning = false;

  constructor(private readonly config: GatewayConfig) {
    this.coreServices = new CoreServices(config);
  }

  /**
   * Register a platform adapter
   * Platforms register themselves via dependency injection
   *
   * @param platform - Platform adapter to register
   * @returns This gateway for chaining
   */
  registerPlatform(platform: PlatformAdapter): this {
    if (this.platforms.has(platform.name)) {
      throw new Error(`Platform ${platform.name} is already registered`);
    }

    this.platforms.set(platform.name, platform);
    logger.info(`Platform registered: ${platform.name}`);
    return this;
  }

  /**
   * Start the gateway
   * 1. Initialize core services
   * 2. Initialize all platforms
   * 3. Start all platforms
   */
  async start(): Promise<void> {
    logger.info("Starting gateway...");

    // 1. Initialize core services (Redis, MCP, Anthropic, etc.)
    logger.info("Step 1/3: Initializing core services");
    await this.coreServices.initialize();

    // 2. Initialize each platform with core services
    logger.info(`Step 2/3: Initializing ${this.platforms.size} platform(s)`);
    for (const [name, platform] of this.platforms) {
      logger.info(`Initializing platform: ${name}`);
      await platform.initialize(this.coreServices);
    }

    // 3. Start all platforms
    logger.info(`Step 3/3: Starting ${this.platforms.size} platform(s)`);
    for (const [name, platform] of this.platforms) {
      logger.info(`Starting platform: ${name}`);
      await platform.start();
    }

    this.isRunning = true;
    logger.info(
      `✅ Gateway started successfully with ${this.platforms.size} platform(s)`
    );
  }

  /**
   * Stop the gateway gracefully
   * 1. Stop all platforms
   * 2. Shutdown core services
   */
  async stop(): Promise<void> {
    logger.info("Stopping gateway...");

    // Stop all platforms
    for (const [name, platform] of this.platforms) {
      logger.info(`Stopping platform: ${name}`);
      try {
        await platform.stop();
      } catch (error) {
        logger.error(`Failed to stop platform ${name}:`, error);
      }
    }

    // Shutdown core services
    await this.coreServices.shutdown();

    this.isRunning = false;
    logger.info("✅ Gateway stopped");
  }

  /**
   * Get gateway status
   */
  getStatus(): {
    isRunning: boolean;
    platforms: string[];
    config: Partial<GatewayConfig>;
  } {
    return {
      isRunning: this.isRunning,
      platforms: Array.from(this.platforms.keys()),
      config: {
        slack: this.config.slack,
        queues: this.config.queues,
      },
    };
  }

  /**
   * Get core services (for platform adapters during initialization)
   */
  getCoreServices(): CoreServices {
    return this.coreServices;
  }
}
