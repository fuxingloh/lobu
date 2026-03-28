/**
 * Shared token verification utility for public routes.
 *
 * Verifies a settings token against an agentId by checking direct agentId match,
 * user ownership via UserAgentsStore, or canonical metadata owner fallback.
 */

import type { AgentMetadataStore } from "../../auth/agent-metadata-store";
import type { SettingsTokenPayload } from "../../auth/settings/token-service";
import type { UserAgentsStore } from "../../auth/user-agents-store";

export interface TokenVerifierConfig {
  userAgentsStore?: UserAgentsStore;
  agentMetadataStore?: AgentMetadataStore;
}

/**
 * Create a token verifier function scoped to a given config.
 *
 * The returned async function accepts a decoded settings token payload and an
 * agentId, then returns the payload if the caller is authorised, or null.
 */
export function createTokenVerifier(config: TokenVerifierConfig) {
  return async (
    payload: SettingsTokenPayload | null,
    agentId: string
  ): Promise<SettingsTokenPayload | null> => {
    if (!payload) return null;

    if (payload.agentId) {
      if (payload.agentId !== agentId) return null;
    } else {
      const owns = config.userAgentsStore
        ? await config.userAgentsStore.ownsAgent(
            payload.platform,
            payload.userId,
            agentId
          )
        : false;

      if (!owns) {
        if (!config.agentMetadataStore) return null;
        const metadata = await config.agentMetadataStore.getMetadata(agentId);
        const isOwner =
          metadata?.owner?.platform === payload.platform &&
          metadata?.owner?.userId === payload.userId;
        if (!isOwner) return null;

        if (isOwner && config.userAgentsStore) {
          config.userAgentsStore
            .addAgent(payload.platform, payload.userId, agentId)
            .catch(() => {
              /* best-effort reconciliation */
            });
        }
      }
    }
    return payload;
  };
}
