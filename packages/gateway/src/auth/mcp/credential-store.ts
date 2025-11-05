import { BaseCredentialStore } from "@peerbot/core";
import type Redis from "ioredis";

export interface McpCredentialRecord {
  accessToken: string;
  tokenType?: string;
  expiresAt?: number;
  refreshToken?: string;
  metadata?: Record<string, unknown>;
}

/**
 * MCP credential store with multi-part keys (userId, mcpId)
 * Extends BaseCredentialStore for consistent pattern
 */
export class McpCredentialStore extends BaseCredentialStore<McpCredentialRecord> {
  constructor(redis: Redis) {
    super({
      redis,
      keyPrefix: "mcp:credential",
      loggerName: "mcp-credentials",
    });
  }

  async getCredentials(
    userId: string,
    mcpId: string
  ): Promise<McpCredentialRecord | null> {
    const key = this.buildKey(userId, mcpId);
    return this.get(key);
  }

  async setCredentials(
    userId: string,
    mcpId: string,
    record: McpCredentialRecord,
    ttlSeconds?: number
  ): Promise<void> {
    const key = this.buildKey(userId, mcpId);
    await this.set(key, record, ttlSeconds);
  }

  async deleteCredentials(userId: string, mcpId: string): Promise<void> {
    const key = this.buildKey(userId, mcpId);
    await this.delete(key);
  }
}
