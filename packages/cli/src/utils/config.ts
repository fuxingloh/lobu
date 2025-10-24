import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import type { PeerbotConfig } from "../types.js";

export async function loadConfig(
  cwd: string = process.cwd()
): Promise<PeerbotConfig> {
  // Load environment variables from .env
  loadEnv({ path: join(cwd, ".env") });

  const configPath = join(cwd, "peerbot.config.js");

  try {
    await access(configPath, constants.F_OK);
  } catch {
    throw new Error('peerbot.config.js not found. Run "peerbot init" first.');
  }

  // Dynamic import to load the config file
  const configModule = await import(`file://${configPath}`);
  const config: PeerbotConfig = configModule.default || configModule;

  return config;
}

export async function ensurePeerbotDir(
  cwd: string = process.cwd()
): Promise<void> {
  const peerbotDir = join(cwd, ".peerbot");
  await mkdir(peerbotDir, { recursive: true });
}

export async function checkConfigExists(
  cwd: string = process.cwd()
): Promise<boolean> {
  const configPath = join(cwd, "peerbot.config.js");
  try {
    await access(configPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
