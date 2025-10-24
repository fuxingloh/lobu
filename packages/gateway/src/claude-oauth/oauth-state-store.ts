import { randomBytes } from "node:crypto";
import { createLogger } from "@peerbot/core";
import type Redis from "ioredis";

const logger = createLogger("claude-oauth-state-store");

export interface OAuthState {
  userId: string;
  codeVerifier: string;
  createdAt: number;
}

/**
 * Store and retrieve OAuth state for CSRF protection and PKCE
 * Pattern: claude:oauth_state:{state}
 * TTL: 5 minutes
 */
export class ClaudeOAuthStateStore {
  private static readonly TTL_SECONDS = 5 * 60; // 5 minutes

  constructor(private redis: Redis) {}

  /**
   * Create a new OAuth state with PKCE code verifier
   * Returns the state string to use in OAuth flow
   */
  async create(userId: string, codeVerifier: string): Promise<string> {
    const state = this.generateState();
    const key = this.getKey(state);

    const stateData: OAuthState = {
      userId,
      codeVerifier,
      createdAt: Date.now(),
    };

    await this.redis.setex(
      key,
      ClaudeOAuthStateStore.TTL_SECONDS,
      JSON.stringify(stateData)
    );

    logger.info(`Created OAuth state for user ${userId}`, { state });
    return state;
  }

  /**
   * Validate and consume an OAuth state
   * Returns the state data if valid, null if invalid or expired
   * Deletes the state after retrieval (one-time use)
   */
  async consume(state: string): Promise<OAuthState | null> {
    const key = this.getKey(state);

    // Get and delete in one operation
    const data = await this.redis.getdel(key);

    if (!data) {
      logger.warn(`Invalid or expired OAuth state: ${state}`);
      return null;
    }

    try {
      const stateData = JSON.parse(data) as OAuthState;
      logger.info(`Consumed OAuth state for user ${stateData.userId}`, {
        state,
      });
      return stateData;
    } catch (error) {
      logger.error(`Failed to parse OAuth state: ${state}`, { error });
      return null;
    }
  }

  /**
   * Generate a cryptographically secure random state string
   */
  private generateState(): string {
    return randomBytes(32).toString("base64url");
  }

  private getKey(state: string): string {
    return `claude:oauth_state:${state}`;
  }
}
