import { BaseRedisStore } from "@peerbot/core";
import type { IMessageQueue } from "../../infrastructure/queue";

export interface InputValues {
  [inputId: string]: string;
}

/**
 * Storage for MCP input credentials (PATs, API keys, etc.)
 * Unlike OAuth tokens, these don't expire so we store them without TTL
 */
export class McpInputStore extends BaseRedisStore<InputValues> {
  constructor(queue: IMessageQueue) {
    super({
      redis: queue.getRedisClient(),
      keyPrefix: "mcp:inputs",
      loggerName: "mcp-input-store",
    });
  }

  /**
   * Store input values for a user and MCP server
   * No TTL - these are persistent until explicitly deleted
   */
  async setInputs(
    userId: string,
    mcpId: string,
    inputs: InputValues
  ): Promise<void> {
    const key = this.buildKey(userId, mcpId);
    await this.set(key, inputs);
    this.logger.info(`Stored inputs for user ${userId}, MCP ${mcpId}`);
  }

  /**
   * Retrieve input values for a user and MCP server
   */
  async getInputs(userId: string, mcpId: string): Promise<InputValues | null> {
    const key = this.buildKey(userId, mcpId);
    return this.get(key);
  }

  /**
   * Delete input values for a user and MCP server
   */
  async deleteInputs(userId: string, mcpId: string): Promise<void> {
    const key = this.buildKey(userId, mcpId);
    await this.delete(key);
    this.logger.info(`Deleted inputs for user ${userId}, MCP ${mcpId}`);
  }

  /**
   * Check if user has inputs stored for an MCP server
   */
  async has(userId: string, mcpId: string): Promise<boolean> {
    const values = await this.getInputs(userId, mcpId);
    return values !== null;
  }
}
