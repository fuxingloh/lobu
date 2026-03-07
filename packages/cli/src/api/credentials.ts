import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".config", "lobu");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  token: string;
  email?: string;
  agentId?: string;
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), {
    mode: 0o600,
  });
}

export async function clearCredentials(): Promise<void> {
  try {
    await rm(CREDENTIALS_FILE);
  } catch {
    // File doesn't exist, nothing to clear
  }
}

/**
 * Get token from env var (CI/CD) or stored credentials.
 */
export async function getToken(): Promise<string | null> {
  const envToken = process.env.LOBU_API_TOKEN;
  if (envToken) return envToken;

  const creds = await loadCredentials();
  return creds?.token ?? null;
}
