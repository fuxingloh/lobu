#!/usr/bin/env bun

import {
  createLogger,
  createMessageQueue,
  type IMessageQueue,
  moduleRegistry,
} from "@peerbot/core";
import { ClaudeCredentialStore } from "../claude-oauth/credential-store";
import { ClaudeModelPreferenceStore } from "../claude-oauth/model-preference-store";
import { ClaudeModelService } from "../claude-oauth/model-service";
import { ClaudeOAuthModule } from "../claude-oauth/oauth-module";
import { ClaudeOAuthStateStore } from "../claude-oauth/oauth-state-store";
import type { GatewayConfig } from "../cli/config";
import { WorkerGateway } from "../gateway";
import { McpConfigService } from "../mcp/config-service";
import { McpCredentialStore } from "../mcp/credential-store";
import { McpInputStore } from "../mcp/input-store";
import { McpOAuthDiscoveryService } from "../mcp/oauth-discovery";
import { McpOAuthModule } from "../mcp/oauth-module";
import { OAuthStateStore } from "../mcp/oauth-state-store";
import { McpProxy } from "../mcp/proxy";
import { AnthropicProxy } from "../model-provider/anthropic-proxy";
import { QueueProducer } from "../session/queue-producer";

const logger = createLogger("core-services");

/**
 * Manages all platform-agnostic core services
 * Including: Redis, Claude OAuth, Anthropic proxy, MCP services, Worker Gateway
 * These services are shared across all platform adapters (Slack, Discord, etc.)
 */
export class CoreServices {
  private queue?: IMessageQueue;
  private queueProducer?: QueueProducer;
  private anthropicProxy?: AnthropicProxy;
  private workerGateway?: WorkerGateway;
  private mcpProxy?: McpProxy;
  private claudeCredentialStore?: ClaudeCredentialStore;
  private claudeModelPreferenceStore?: ClaudeModelPreferenceStore;

  constructor(private readonly config: GatewayConfig) {}

  /**
   * Initialize all core services
   */
  async initialize(): Promise<void> {
    logger.info("Initializing core services...");

    // Initialize Redis/Queue
    await this.initializeQueue();

    // Initialize Claude OAuth
    await this.initializeClaudeOAuth();

    // Initialize Anthropic proxy
    await this.initializeAnthropicProxy();

    // Initialize MCP services
    await this.initializeMcpServices();

    // Initialize queue producer
    await this.initializeQueueProducer();

    logger.info("✅ Core services initialized successfully");
  }

  /**
   * Initialize Redis/Queue connection
   */
  private async initializeQueue(): Promise<void> {
    if (!this.config.queues?.connectionString) {
      throw new Error("Queue connection string is required");
    }

    this.queue = createMessageQueue(this.config.queues.connectionString);
    await this.queue.start();
    logger.info("✅ Queue connection established");
  }

  /**
   * Initialize Claude OAuth services
   */
  private async initializeClaudeOAuth(): Promise<void> {
    if (!this.queue) {
      throw new Error("Queue must be initialized before Claude OAuth");
    }

    const redisClient = this.queue.getRedisClient();

    // Initialize Claude credential store
    this.claudeCredentialStore = new ClaudeCredentialStore(redisClient);
    logger.info("✅ Claude credential store initialized");

    // Initialize Claude model preference store
    this.claudeModelPreferenceStore = new ClaudeModelPreferenceStore(
      redisClient
    );
    logger.info("✅ Claude model preference store initialized");

    // Initialize Claude model service
    const claudeModelService = new ClaudeModelService(
      redisClient,
      this.config.anthropicProxy.anthropicApiKey
    );
    logger.info("✅ Claude model service initialized");

    // Check if system token is available
    const systemTokenAvailable = !!this.config.anthropicProxy.anthropicApiKey;

    const claudeOAuthStateStore = new ClaudeOAuthStateStore(redisClient);
    const claudeOAuthModule = new ClaudeOAuthModule(
      this.claudeCredentialStore,
      claudeOAuthStateStore,
      this.claudeModelPreferenceStore,
      claudeModelService,
      this.config.mcp.publicGatewayUrl,
      systemTokenAvailable
    );
    moduleRegistry.register(claudeOAuthModule);
    logger.info(
      `✅ Claude OAuth module registered (system token: ${systemTokenAvailable ? "available" : "not available"})`
    );
  }

  /**
   * Initialize Anthropic proxy service
   */
  private async initializeAnthropicProxy(): Promise<void> {
    this.anthropicProxy = new AnthropicProxy(
      this.config.anthropicProxy,
      this.claudeCredentialStore
    );
    logger.info("✅ Anthropic proxy initialized");
  }

  /**
   * Initialize MCP services (config, discovery, OAuth, proxy)
   */
  private async initializeMcpServices(): Promise<void> {
    if (!this.queue) {
      throw new Error("Queue must be initialized before MCP services");
    }

    const redisClient = this.queue.getRedisClient();

    // Initialize MCP OAuth Discovery Service
    const mcpCredentialStore = new McpCredentialStore(this.queue);
    const mcpDiscoveryService = new McpOAuthDiscoveryService({
      cacheStore: {
        get: async (key: string) => {
          try {
            const value = await redisClient.get(key);
            return value;
          } catch (error) {
            logger.error("Failed to get from cache", { key, error });
            return null;
          }
        },
        set: async (key: string, value: string, ttl: number) => {
          try {
            await redisClient.set(key, value, "EX", ttl);
          } catch (error) {
            logger.error("Failed to set cache", { key, error });
          }
        },
        delete: async (key: string) => {
          try {
            await redisClient.del(key);
          } catch (error) {
            logger.error("Failed to delete from cache", { key, error });
          }
        },
      },
      callbackUrl: this.config.mcp.callbackUrl,
      protocolVersion: "2025-03-26",
      cacheTtl: 86400, // 24 hours
    });
    logger.info("✅ MCP OAuth Discovery Service initialized");

    const oauthStateStore = new OAuthStateStore(this.queue);
    const mcpInputStore = new McpInputStore(this.queue);
    const mcpConfigService = new McpConfigService({
      configUrl: this.config.mcp.serversUrl,
      discoveryService: mcpDiscoveryService,
      credentialStore: mcpCredentialStore,
      inputStore: mcpInputStore,
    });

    this.workerGateway = new WorkerGateway(
      this.queue,
      this.config.mcp.publicGatewayUrl,
      mcpConfigService
    );
    logger.info("✅ Worker gateway initialized");

    this.mcpProxy = new McpProxy(
      mcpConfigService,
      mcpCredentialStore,
      mcpInputStore,
      this.queue
    );
    logger.info("✅ MCP proxy initialized");

    // Perform OAuth discovery for all MCP servers
    logger.info("🔍 Discovering OAuth capabilities for MCP servers...");
    await mcpConfigService.enrichWithDiscovery();
    logger.info("✅ MCP OAuth discovery completed");

    // Register MCP OAuth module
    const mcpOAuthModule = new McpOAuthModule(
      mcpConfigService,
      mcpCredentialStore,
      oauthStateStore,
      mcpInputStore,
      this.config.mcp.publicGatewayUrl,
      this.config.mcp.callbackUrl
    );
    moduleRegistry.register(mcpOAuthModule);
    logger.info("✅ MCP OAuth module registered");

    // Discover and register available modules
    await moduleRegistry.registerAvailableModules();

    // Initialize all registered modules
    await moduleRegistry.initAll();
    logger.info("✅ Modules initialized");
  }

  /**
   * Initialize queue producer
   */
  private async initializeQueueProducer(): Promise<void> {
    if (!this.config.queues?.connectionString) {
      throw new Error("Queue connection string is required");
    }

    this.queueProducer = new QueueProducer(this.config.queues.connectionString);
    await this.queueProducer.start();
    logger.info("✅ Queue producer started");
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down core services...");

    if (this.queueProducer) {
      await this.queueProducer.stop();
    }

    if (this.workerGateway) {
      this.workerGateway.shutdown();
      logger.info("Worker gateway shutdown complete");
    }

    if (this.queue) {
      await this.queue.stop();
    }

    logger.info("✅ Core services shutdown complete");
  }

  // Getters for services
  getQueue(): IMessageQueue {
    if (!this.queue) throw new Error("Queue not initialized");
    return this.queue;
  }

  getQueueProducer(): QueueProducer {
    if (!this.queueProducer) throw new Error("Queue producer not initialized");
    return this.queueProducer;
  }

  getAnthropicProxy(): AnthropicProxy | undefined {
    return this.anthropicProxy;
  }

  getWorkerGateway(): WorkerGateway | undefined {
    return this.workerGateway;
  }

  getMcpProxy(): McpProxy | undefined {
    return this.mcpProxy;
  }

  getClaudeCredentialStore(): ClaudeCredentialStore | undefined {
    return this.claudeCredentialStore;
  }

  getClaudeModelPreferenceStore(): ClaudeModelPreferenceStore | undefined {
    return this.claudeModelPreferenceStore;
  }
}
