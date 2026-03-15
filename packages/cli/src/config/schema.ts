import { z } from "zod";

// Provider entry
const providerSchema = z.object({
  id: z.string(),
  model: z.string().optional(),
});

// Skills section
const mcpServerSchema = z.object({
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
});

const skillsSchema = z.object({
  enabled: z.array(z.string()).default([]),
  mcp: z.record(mcpServerSchema).optional(),
});

// Network section
const networkSchema = z.object({
  allowed: z.array(z.string()).optional(),
  denied: z.array(z.string()).optional(),
});

// Worker section
const workerSchema = z.object({
  nix_packages: z.array(z.string()).optional(),
});

// Platforms section — accept any platform name with any config object.
// Field-level validation happens at the gateway when connections are created.
const platformsSchema = z.record(z.string(), z.record(z.unknown()));

// Each [agents.{id}] table
const agentEntrySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  dir: z.string(), // path to agent content directory (IDENTITY.md, SOUL.md, USER.md, skills/)
  providers: z.array(providerSchema).default([]),
  skills: skillsSchema.default({ enabled: [] }),
  network: networkSchema.optional(),
  worker: workerSchema.optional(),
  platforms: platformsSchema.optional(),
});

// Full lobu.toml schema
export const lobuConfigSchema = z.object({
  agents: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), agentEntrySchema),
});

export type LobuTomlConfig = z.infer<typeof lobuConfigSchema>;
export type AgentEntry = z.infer<typeof agentEntrySchema>;

export type ProviderEntry = z.infer<typeof providerSchema>;
export type McpServerEntry = z.infer<typeof mcpServerSchema>;
export type SkillsEntry = z.infer<typeof skillsSchema>;
export type NetworkEntry = z.infer<typeof networkSchema>;
export type WorkerEntry = z.infer<typeof workerSchema>;
