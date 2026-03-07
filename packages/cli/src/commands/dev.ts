import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { isLoadError, loadConfig } from "../config/loader.js";
import { transformConfig } from "../config/transformer.js";

/**
 * `lobu dev` — smart wrapper around `docker compose up`.
 * Reads lobu.toml, seeds .env + MCP config, then passes all args through.
 *
 * Examples:
 *   lobu dev                    → docker compose up
 *   lobu dev -d                 → docker compose up -d
 *   lobu dev --build            → docker compose up --build
 *   lobu dev -d --build         → docker compose up -d --build
 *   lobu dev --force-recreate   → docker compose up --force-recreate
 */
export async function devCommand(
  cwd: string,
  passthroughArgs: string[]
): Promise<void> {
  const result = await loadConfig(cwd);

  if (isLoadError(result)) {
    console.error(chalk.red(`\n  ${result.error}`));
    if (result.details) {
      for (const detail of result.details) {
        console.error(chalk.dim(`  ${detail}`));
      }
    }
    console.log();
    process.exit(1);
  }

  const { config } = result;
  const spinner = ora("Preparing local dev environment...").start();

  try {
    const { envVars, mcpConfig } = transformConfig(config);

    // Write .env from lobu.toml-derived vars (merge with existing .env to preserve secrets)
    const envPath = join(cwd, ".env");
    let existingEnv = "";
    try {
      existingEnv = await readFile(envPath, "utf-8");
    } catch {
      // No existing .env, start fresh
    }

    const existingVars = parseEnvFile(existingEnv);
    // Keep unknown existing vars (secrets) but let lobu.toml-derived managed vars win.
    const mergedVars = { ...existingVars, ...envVars };

    const envContent = Object.entries(mergedVars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    await writeFile(envPath, `${envContent}\n`);

    // Write MCP config if needed
    if (mcpConfig) {
      const lobuDir = join(cwd, ".lobu");
      await mkdir(lobuDir, { recursive: true });
      await writeFile(
        join(lobuDir, "mcp.config.json"),
        JSON.stringify({ mcpServers: mcpConfig }, null, 2)
      );
    }

    // Load IDENTITY.md, SOUL.md, USER.md if they exist
    await seedMarkdownFiles(cwd, mergedVars);

    spinner.succeed("Environment prepared from lobu.toml");

    // Check for docker-compose.yml
    const composePath = join(cwd, "docker-compose.yml");
    try {
      await readFile(composePath, "utf-8");
    } catch {
      console.log(
        chalk.yellow(
          "\n  No docker-compose.yml found. Run `lobu init` to generate one.\n"
        )
      );
      process.exit(1);
    }

    // Pass everything through to docker compose up
    console.log(chalk.cyan(`\n  Starting ${config.agent.name}...\n`));
    const composeArgs = ["compose", "up", ...passthroughArgs];
    const child = spawn("docker", composeArgs, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", (err) => {
      console.error(
        chalk.red(`\n  Failed to start docker compose: ${err.message}`)
      );
      console.log(chalk.dim("  Make sure Docker Desktop is running.\n"));
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  } catch (err) {
    spinner.fail("Failed to prepare environment");
    console.error(
      chalk.red(`  ${err instanceof Error ? err.message : String(err)}`)
    );
    process.exit(1);
  }
}

/**
 * Read IDENTITY.md, SOUL.md, USER.md and add their content as env vars
 * so the gateway can seed agent settings on startup.
 */
async function seedMarkdownFiles(
  cwd: string,
  envVars: Record<string, string>
): Promise<void> {
  const files = [
    { path: "IDENTITY.md", envKey: "AGENT_IDENTITY_MD" },
    { path: "SOUL.md", envKey: "AGENT_SOUL_MD" },
    { path: "USER.md", envKey: "AGENT_USER_MD" },
  ];

  for (const { path, envKey } of files) {
    try {
      const content = await readFile(join(cwd, path), "utf-8");
      if (content.trim()) {
        envVars[envKey] = content.trim();
      }
    } catch {
      // File doesn't exist, skip
    }
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    vars[key] = value;
  }
  return vars;
}
