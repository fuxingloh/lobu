import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";

/**
 * Local .env file management for dev mode secrets.
 * Cloud secrets will use the API when available.
 */
export async function secretsSetCommand(
  cwd: string,
  key: string,
  value: string
): Promise<void> {
  const envPath = join(cwd, ".env");
  let content = "";
  try {
    content = await readFile(envPath, "utf-8");
  } catch {
    // No .env yet
  }

  const lines = content.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`${key}=${value}`);
  }

  await writeFile(envPath, updated.join("\n"));
  console.log(chalk.green(`\n  Set ${key} in .env\n`));
}

export async function secretsListCommand(cwd: string): Promise<void> {
  const envPath = join(cwd, ".env");
  let content = "";
  try {
    content = await readFile(envPath, "utf-8");
  } catch {
    console.log(chalk.dim("\n  No .env file found.\n"));
    return;
  }

  const secrets: Array<{ key: string; preview: string }> = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);

    // Redact values that look like secrets
    const isSecret =
      key.includes("KEY") ||
      key.includes("SECRET") ||
      key.includes("TOKEN") ||
      key.includes("PASSWORD");
    const preview = isSecret
      ? value.length > 4
        ? `${value.slice(0, 4)}${"*".repeat(Math.min(value.length - 4, 20))}`
        : "****"
      : value;

    secrets.push({ key, preview });
  }

  if (secrets.length === 0) {
    console.log(chalk.dim("\n  No secrets found in .env\n"));
    return;
  }

  console.log(chalk.bold("\n  Secrets (.env):"));
  const maxKeyLen = Math.max(...secrets.map((s) => s.key.length));
  for (const { key, preview } of secrets) {
    console.log(
      `  ${chalk.cyan(key.padEnd(maxKeyLen))}  ${chalk.dim(preview)}`
    );
  }
  console.log();
}

export async function secretsDeleteCommand(
  cwd: string,
  key: string
): Promise<void> {
  const envPath = join(cwd, ".env");
  let content = "";
  try {
    content = await readFile(envPath, "utf-8");
  } catch {
    console.log(chalk.dim("\n  No .env file found.\n"));
    return;
  }

  const lines = content.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith(`${key}=`);
  });

  if (lines.length === filtered.length) {
    console.log(chalk.yellow(`\n  Key "${key}" not found in .env\n`));
    return;
  }

  await writeFile(envPath, filtered.join("\n"));
  console.log(chalk.green(`\n  Removed ${key} from .env\n`));
}
