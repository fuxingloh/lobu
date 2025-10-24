#!/usr/bin/env bun

import type { CoreServices } from "../services/core-services";

/**
 * Interface that all platform adapters must implement
 * Platforms include: Slack, Discord, Teams, etc.
 *
 * Each platform adapter:
 * 1. Receives CoreServices during initialization
 * 2. Sets up platform-specific event handlers
 * 3. Manages its own platform client/connection
 * 4. Uses core services (MCP, Anthropic, Redis) provided by Gateway
 */
export interface PlatformAdapter {
  /**
   * Platform name (e.g., "slack", "discord")
   */
  readonly name: string;

  /**
   * Initialize the platform with core services
   * This is called by Gateway after core services are initialized
   *
   * @param services - Core services provided by Gateway
   */
  initialize(services: CoreServices): Promise<void>;

  /**
   * Start the platform (connect to platform API, start event listeners)
   * This is called after initialization
   */
  start(): Promise<void>;

  /**
   * Stop the platform gracefully
   */
  stop(): Promise<void>;

  /**
   * Check if platform is healthy and running
   */
  isHealthy(): boolean;
}
