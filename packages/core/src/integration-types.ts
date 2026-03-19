/**
 * Shared types for the integration system.
 *
 * OAuth credential management for third-party APIs (GitHub, Google, etc.)
 * is handled by Owletto. Types here support MCP server OAuth configs
 * and API-key integrations created by agents at runtime.
 */

import type { ProviderConfigEntry } from "./provider-config-types";

export interface IntegrationOAuthConfig {
  authUrl: string;
  tokenUrl: string;
  clientId?: string;
  clientSecret?: string;
  incrementalAuth?: boolean;
  tokenEndpointAuthMethod?: string;
  extraAuthParams?: Record<string, string>;
}

export interface IntegrationApiKeyConfig {
  headerName: string;
  headerTemplate: string;
}

/** Per-agent integration config (stored in AgentSettings, used by worker routes) */
export interface AgentIntegrationConfig {
  label: string;
  authType: "api-key";
  apiKey: IntegrationApiKeyConfig;
  apiDomains: string[];
}

// System Skills Config (config/system-skills.json)

export interface SystemSkillEntry {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  hidden?: boolean;
  mcpServers?: import("./types").SkillMcpServer[];
  providers?: ProviderConfigEntry[];
  nixPackages?: string[];
  permissions?: string[];
}

export interface SystemSkillsConfigFile {
  skills: SystemSkillEntry[];
}
