import chalk from "chalk";
import open from "open";
import { loadCredentials, saveCredentials } from "../api/credentials.js";

const LOGIN_URL = "https://community.lobu.ai/cli/login";
const DEFAULT_API_URL = "https://community.lobu.ai/api/v1";

function apiUrl(path: string): string {
  const baseUrl = process.env.LOBU_API_URL ?? DEFAULT_API_URL;
  return `${baseUrl}${path}`;
}

function extractIdentity(payload: unknown): {
  email?: string;
  agentId?: string;
} {
  if (!payload || typeof payload !== "object") return {};

  const record = payload as Record<string, unknown>;
  const user =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : null;

  const email =
    typeof record.email === "string"
      ? record.email
      : typeof user?.email === "string"
        ? user.email
        : undefined;

  const agentId =
    typeof record.agentId === "string"
      ? record.agentId
      : typeof record.agent_id === "string"
        ? record.agent_id
        : undefined;

  return { email, agentId };
}

async function validateToken(
  token: string
): Promise<
  | { status: "valid"; email?: string; agentId?: string }
  | { status: "invalid"; error: string }
  | { status: "unverified"; warning: string }
> {
  const endpoints = ["/auth/whoami", "/whoami", "/me"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(apiUrl(endpoint), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Lobu-Org": "default",
        },
      });

      if (response.status === 401 || response.status === 403) {
        return {
          status: "invalid",
          error: "Token was rejected by the API (unauthorized).",
        };
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        continue;
      }

      const body = (await response.json().catch(() => ({}))) as unknown;
      const identity = extractIdentity(body);
      return { status: "valid", ...identity };
    } catch {
      // Try next endpoint.
    }
  }

  return {
    status: "unverified",
    warning:
      "Could not validate token against API endpoints, but token was saved locally.",
  };
}

export async function loginCommand(options: { token?: string }): Promise<void> {
  if (options.token) {
    const token = options.token.trim();
    if (!token) {
      console.log(chalk.red("\n  Token cannot be empty.\n"));
      return;
    }

    const existing = await loadCredentials();
    if (existing) {
      console.log(
        chalk.dim(`\n  Already logged in as ${existing.email ?? "user"}.`)
      );
      console.log(chalk.dim("  Run `lobu logout` first to switch accounts.\n"));
      return;
    }

    const validation = await validateToken(token);
    if (validation.status === "invalid") {
      console.log(chalk.red(`\n  ${validation.error}`));
      console.log(chalk.dim("  Check LOBU_API_URL or generate a new token.\n"));
      return;
    }

    await saveCredentials({
      token,
      email: validation.status === "valid" ? validation.email : undefined,
      agentId: validation.status === "valid" ? validation.agentId : undefined,
    });

    if (validation.status === "valid") {
      console.log(chalk.green("\n  Logged in with API token.\n"));
    } else {
      console.log(chalk.yellow(`\n  ${validation.warning}`));
      console.log(chalk.green("  Logged in with API token.\n"));
    }
    return;
  }

  const existing = await loadCredentials();
  if (existing) {
    console.log(
      chalk.dim(`\n  Already logged in as ${existing.email ?? "user"}.`)
    );
    console.log(chalk.dim("  Run `lobu logout` first to switch accounts.\n"));
    return;
  }

  console.log(chalk.bold.cyan("\n  Lobu Cloud is in early access.\n"));
  console.log(chalk.dim("  Opening browser to request access...\n"));

  try {
    await open(LOGIN_URL);
    console.log(chalk.dim(`  If the browser didn't open, visit:`));
    console.log(chalk.cyan(`  ${LOGIN_URL}\n`));
  } catch {
    console.log(chalk.dim(`  Open this URL in your browser:`));
    console.log(chalk.cyan(`  ${LOGIN_URL}\n`));
  }
}
