/**
 * RedisAgentStore — implements AgentStore backed by Redis.
 *
 * Composes the existing Redis-backed stores behind the unified AgentStore interface.
 * Used in CLI/standalone mode. In embedded mode, the host provides its own implementation.
 */

import type {
  AgentMetadata,
  AgentSettings,
  AgentStore,
  ChannelBinding,
  Grant,
  StoredConnection,
} from "@lobu/core";
import { createLogger } from "@lobu/core";
import type Redis from "ioredis";

const logger = createLogger("redis-agent-store");

// ── Redis key helpers ──────────────────────────────────────────────────────

const KEYS = {
  settings: (id: string) => `agent:settings:${id}`,
  metadata: (id: string) => `agent_metadata:${id}`,
  connection: (id: string) => `connection:${id}`,
  connectionsAll: "connections:all",
  connectionsByAgent: (agentId: string) => `connections:agent:${agentId}`,
  grant: (agentId: string, pattern: string) => `grant:${agentId}:${pattern}`,
  userAgents: (platform: string, userId: string) =>
    `user_agents:${platform}:${userId}`,
  channelBinding: (platform: string, channelId: string, teamId?: string) =>
    teamId
      ? `channel_binding:${platform}:${channelId}:${teamId}`
      : `channel_binding:${platform}:${channelId}`,
  channelBindingIndex: (agentId: string) => `channel_binding_index:${agentId}`,
  sandboxes: (connectionId: string) => `sandboxes:connection:${connectionId}`,
};

export class RedisAgentStore implements AgentStore {
  constructor(private readonly redis: Redis) {}

  // ── Agent Settings ──────────────────────────────────────────────────

  async getSettings(agentId: string): Promise<AgentSettings | null> {
    const raw = await this.redis.get(KEYS.settings(agentId));
    return raw ? JSON.parse(raw) : null;
  }

  async saveSettings(agentId: string, settings: AgentSettings): Promise<void> {
    await this.redis.set(
      KEYS.settings(agentId),
      JSON.stringify({ ...settings, updatedAt: Date.now() })
    );
  }

  async updateSettings(
    agentId: string,
    updates: Partial<AgentSettings>
  ): Promise<void> {
    const existing = await this.getSettings(agentId);
    const merged = { ...(existing || {}), ...updates, updatedAt: Date.now() };
    await this.redis.set(KEYS.settings(agentId), JSON.stringify(merged));
  }

  async deleteSettings(agentId: string): Promise<void> {
    await this.redis.del(KEYS.settings(agentId));
  }

  async hasSettings(agentId: string): Promise<boolean> {
    return (await this.redis.exists(KEYS.settings(agentId))) === 1;
  }

  // ── Agent Metadata ────────────────────────────────────────────────

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    const raw = await this.redis.get(KEYS.metadata(agentId));
    return raw ? JSON.parse(raw) : null;
  }

  async saveMetadata(agentId: string, metadata: AgentMetadata): Promise<void> {
    await this.redis.set(KEYS.metadata(agentId), JSON.stringify(metadata));
    if (metadata.parentConnectionId) {
      await this.redis.sadd(
        KEYS.sandboxes(metadata.parentConnectionId),
        agentId
      );
    }
  }

  async updateMetadata(
    agentId: string,
    updates: Partial<AgentMetadata>
  ): Promise<void> {
    const existing = await this.getMetadata(agentId);
    if (!existing) return;
    await this.saveMetadata(agentId, { ...existing, ...updates });
  }

  async deleteMetadata(agentId: string): Promise<void> {
    const metadata = await this.getMetadata(agentId);
    await this.redis.del(KEYS.metadata(agentId));
    if (metadata?.parentConnectionId) {
      await this.redis.srem(
        KEYS.sandboxes(metadata.parentConnectionId),
        agentId
      );
    }
  }

  async hasAgent(agentId: string): Promise<boolean> {
    return (await this.redis.exists(KEYS.metadata(agentId))) === 1;
  }

  async listAgents(): Promise<AgentMetadata[]> {
    const keys = await this.scanKeys("agent_metadata:*");
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => {
        try {
          return JSON.parse(v) as AgentMetadata;
        } catch (error) {
          logger.error("Failed to parse agent metadata", { error, value: v });
          return null;
        }
      })
      .filter((v): v is AgentMetadata => v !== null);
  }

  async listSandboxes(connectionId: string): Promise<AgentMetadata[]> {
    const ids = await this.redis.smembers(KEYS.sandboxes(connectionId));
    const results: AgentMetadata[] = [];
    for (const id of ids) {
      const m = await this.getMetadata(id);
      if (m) results.push(m);
    }
    return results;
  }

  // ── Connections ──────────────────────────────────────────────────

  async getConnection(connectionId: string): Promise<StoredConnection | null> {
    const raw = await this.redis.get(KEYS.connection(connectionId));
    return raw ? JSON.parse(raw) : null;
  }

  async listConnections(filter?: {
    templateAgentId?: string;
    platform?: string;
  }): Promise<StoredConnection[]> {
    let ids: string[];
    if (filter?.templateAgentId) {
      ids = await this.redis.smembers(
        KEYS.connectionsByAgent(filter.templateAgentId)
      );
    } else {
      ids = await this.redis.smembers(KEYS.connectionsAll);
    }

    if (ids.length === 0) return [];

    const keys = ids.map(KEYS.connection);
    const values = await this.redis.mget(...keys);
    let connections = values
      .filter((v): v is string => v !== null)
      .map((v) => {
        try {
          return JSON.parse(v) as StoredConnection;
        } catch (error) {
          logger.error("Failed to parse connection", { error, value: v });
          return null;
        }
      })
      .filter((v): v is StoredConnection => v !== null);

    if (filter?.platform) {
      connections = connections.filter((c) => c.platform === filter.platform);
    }
    return connections;
  }

  async saveConnection(connection: StoredConnection): Promise<void> {
    await this.redis.set(
      KEYS.connection(connection.id),
      JSON.stringify(connection)
    );
    await this.redis.sadd(KEYS.connectionsAll, connection.id);
    if (connection.templateAgentId) {
      await this.redis.sadd(
        KEYS.connectionsByAgent(connection.templateAgentId),
        connection.id
      );
    }
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<StoredConnection>
  ): Promise<void> {
    const existing = await this.getConnection(connectionId);
    if (!existing) return;
    await this.saveConnection({
      ...existing,
      ...updates,
      id: connectionId,
      updatedAt: Date.now(),
    });
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const conn = await this.getConnection(connectionId);
    await this.redis.del(KEYS.connection(connectionId));
    await this.redis.srem(KEYS.connectionsAll, connectionId);
    if (conn?.templateAgentId) {
      await this.redis.srem(
        KEYS.connectionsByAgent(conn.templateAgentId),
        connectionId
      );
    }
  }

  // ── Grants ──────────────────────────────────────────────────────

  async grant(
    agentId: string,
    pattern: string,
    expiresAt: number | null,
    denied?: boolean
  ): Promise<void> {
    const key = KEYS.grant(agentId, pattern);
    const value = JSON.stringify({
      expiresAt,
      grantedAt: Date.now(),
      ...(denied && { denied: true }),
    });
    if (expiresAt === null) {
      await this.redis.set(key, value);
    } else {
      const ttl = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
      await this.redis.set(key, value, "EX", ttl);
    }
  }

  async hasGrant(agentId: string, pattern: string): Promise<boolean> {
    // Exact match
    const exact = await this.redis.get(KEYS.grant(agentId, pattern));
    if (exact) {
      const parsed = JSON.parse(exact);
      return !parsed.denied;
    }

    // MCP wildcard: /mcp/gmail/tools/send_email → /mcp/gmail/tools/*
    if (pattern.startsWith("/mcp/")) {
      const lastSlash = pattern.lastIndexOf("/");
      if (lastSlash > 0) {
        const wildcard = `${pattern.substring(0, lastSlash)}/*`;
        const raw = await this.redis.get(KEYS.grant(agentId, wildcard));
        if (raw) {
          const parsed = JSON.parse(raw);
          return !parsed.denied;
        }
      }
    }

    // Domain wildcard: sub.example.com → *.example.com
    if (!pattern.startsWith("/")) {
      const parts = pattern.split(".");
      if (parts.length > 2) {
        const wildcard = `*.${parts.slice(1).join(".")}`;
        const raw = await this.redis.get(KEYS.grant(agentId, wildcard));
        if (raw) {
          const parsed = JSON.parse(raw);
          return !parsed.denied;
        }
      }
    }

    return false;
  }

  async isDenied(agentId: string, pattern: string): Promise<boolean> {
    const raw = await this.redis.get(KEYS.grant(agentId, pattern));
    if (!raw) return false;
    return JSON.parse(raw).denied === true;
  }

  async listGrants(agentId: string): Promise<Grant[]> {
    const prefix = `grant:${agentId}:`;
    const keys = await this.scanKeys(`${prefix}*`);
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    const grants: Grant[] = [];
    for (let i = 0; i < keys.length; i++) {
      const val = values[i];
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        grants.push({
          pattern: (keys[i] as string).substring(prefix.length),
          expiresAt: parsed.expiresAt ?? null,
          grantedAt: parsed.grantedAt,
          ...(parsed.denied && { denied: true }),
        });
      } catch {
        // skip malformed
      }
    }
    return grants;
  }

  async revokeGrant(agentId: string, pattern: string): Promise<void> {
    await this.redis.del(KEYS.grant(agentId, pattern));
  }

  // ── User-Agent Associations ─────────────────────────────────────

  async addUserAgent(
    platform: string,
    userId: string,
    agentId: string
  ): Promise<void> {
    await this.redis.sadd(KEYS.userAgents(platform, userId), agentId);
  }

  async removeUserAgent(
    platform: string,
    userId: string,
    agentId: string
  ): Promise<void> {
    await this.redis.srem(KEYS.userAgents(platform, userId), agentId);
  }

  async listUserAgents(platform: string, userId: string): Promise<string[]> {
    return this.redis.smembers(KEYS.userAgents(platform, userId));
  }

  async ownsAgent(
    platform: string,
    userId: string,
    agentId: string
  ): Promise<boolean> {
    return (
      (await this.redis.sismember(
        KEYS.userAgents(platform, userId),
        agentId
      )) === 1
    );
  }

  // ── Channel Bindings ────────────────────────────────────────────

  async getChannelBinding(
    platform: string,
    channelId: string,
    teamId?: string
  ): Promise<ChannelBinding | null> {
    const raw = await this.redis.get(
      KEYS.channelBinding(platform, channelId, teamId)
    );
    return raw ? JSON.parse(raw) : null;
  }

  async createChannelBinding(binding: ChannelBinding): Promise<void> {
    const key = KEYS.channelBinding(
      binding.platform,
      binding.channelId,
      binding.teamId
    );
    await this.redis.set(key, JSON.stringify(binding));
    await this.redis.sadd(KEYS.channelBindingIndex(binding.agentId), key);
  }

  async deleteChannelBinding(
    platform: string,
    channelId: string,
    teamId?: string
  ): Promise<void> {
    const key = KEYS.channelBinding(platform, channelId, teamId);
    const raw = await this.redis.get(key);
    if (raw) {
      const binding = JSON.parse(raw) as ChannelBinding;
      await this.redis.srem(KEYS.channelBindingIndex(binding.agentId), key);
    }
    await this.redis.del(key);
  }

  async listChannelBindings(agentId: string): Promise<ChannelBinding[]> {
    const keys = await this.redis.smembers(KEYS.channelBindingIndex(agentId));
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map((v) => {
        try {
          return JSON.parse(v) as ChannelBinding;
        } catch (error) {
          logger.error("Failed to parse channel binding", {
            error,
            value: v,
          });
          return null;
        }
      })
      .filter((v): v is ChannelBinding => v !== null);
  }

  async deleteAllChannelBindings(agentId: string): Promise<number> {
    const keys = await this.redis.smembers(KEYS.channelBindingIndex(agentId));
    if (keys.length === 0) return 0;
    await this.redis.del(...keys);
    await this.redis.del(KEYS.channelBindingIndex(agentId));
    return keys.length;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");
    return keys;
  }
}
