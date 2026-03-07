import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { Command } from "commander";

// Re-exports for backward compatibility
export { initCommand } from "./commands/init.js";
export * from "./types.js";
export { checkConfigExists } from "./utils/config.js";
export { renderTemplate } from "./utils/template.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getPackageVersion(): Promise<string> {
  const pkgPath = join(__dirname, "..", "package.json");
  const pkgContent = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(pkgContent) as { version?: string };
  return pkg.version ?? "0.0.0";
}

export async function runCli(
  argv: readonly string[] = process.argv
): Promise<void> {
  const program = new Command();
  const version = await getPackageVersion();

  program
    .name("lobu")
    .description("CLI for deploying and managing AI agents on Lobu")
    .version(version);

  // ─── init ───────────────────────────────────────────────────────────
  program
    .command("init [name]")
    .description("Scaffold a new agent project (lobu.toml + docker-compose)")
    .option(
      "-t, --template <template>",
      "Starter template (support, coding, general)"
    )
    .action(async (name?: string) => {
      try {
        const { initCommand } = await import("./commands/init.js");
        await initCommand(process.cwd(), name);
      } catch (error) {
        console.error(chalk.red("\n  Error:"), error);
        process.exit(1);
      }
    });

  // ─── validate ───────────────────────────────────────────────────────
  program
    .command("validate")
    .description("Validate lobu.toml schema, skill IDs, and provider config")
    .action(async () => {
      const { validateCommand } = await import("./commands/validate.js");
      const valid = await validateCommand(process.cwd());
      if (!valid) process.exit(1);
    });

  // ─── dev ────────────────────────────────────────────────────────────
  // Passthrough to docker compose up — all extra args forwarded directly.
  //   lobu dev -d --build  →  docker compose up -d --build
  program
    .command("dev")
    .description("Run agent locally (reads lobu.toml, then docker compose up)")
    .allowUnknownOption(true)
    .helpOption(false)
    .action(async (_opts: unknown, cmd: Command) => {
      const { devCommand } = await import("./commands/dev.js");
      await devCommand(process.cwd(), cmd.args);
    });

  // ─── launch ─────────────────────────────────────────────────────────
  program
    .command("launch")
    .description("Launch agent to Lobu Cloud")
    .option("-e, --env <env>", "Target environment")
    .option("--dry-run", "Show what would change")
    .option("-m, --message <message>", "Deployment note")
    .action(
      async (options: { env?: string; dryRun?: boolean; message?: string }) => {
        const { launchCommand } = await import("./commands/launch.js");
        await launchCommand(process.cwd(), options);
      }
    );

  // ─── login ──────────────────────────────────────────────────────────
  program
    .command("login")
    .description("Authenticate with Lobu Cloud")
    .option("--token <token>", "Use API token directly (CI/CD)")
    .action(async (options: { token?: string }) => {
      const { loginCommand } = await import("./commands/login.js");
      await loginCommand(options);
    });

  // ─── logout ─────────────────────────────────────────────────────────
  program
    .command("logout")
    .description("Clear stored credentials")
    .action(async () => {
      const { logoutCommand } = await import("./commands/logout.js");
      await logoutCommand();
    });

  // ─── whoami ─────────────────────────────────────────────────────────
  program
    .command("whoami")
    .description("Show current user and linked agent")
    .action(async () => {
      const { whoamiCommand } = await import("./commands/whoami.js");
      await whoamiCommand();
    });

  // ─── status ─────────────────────────────────────────────────────────
  program
    .command("status")
    .description("Agent health and version info")
    .action(async () => {
      const { statusCommand } = await import("./commands/status.js");
      await statusCommand();
    });

  // ─── secrets ────────────────────────────────────────────────────────
  const secrets = program
    .command("secrets")
    .description("Manage agent secrets");

  secrets
    .command("set <key> <value>")
    .description("Set a secret (stored in local .env for dev)")
    .action(async (key: string, value: string) => {
      const { secretsSetCommand } = await import("./commands/secrets.js");
      await secretsSetCommand(process.cwd(), key, value);
    });

  secrets
    .command("list")
    .description("List secrets (values redacted)")
    .action(async () => {
      const { secretsListCommand } = await import("./commands/secrets.js");
      await secretsListCommand(process.cwd());
    });

  secrets
    .command("delete <key>")
    .description("Remove a secret")
    .action(async (key: string) => {
      const { secretsDeleteCommand } = await import("./commands/secrets.js");
      await secretsDeleteCommand(process.cwd(), key);
    });

  // ─── skills ─────────────────────────────────────────────────────────
  const skills = program
    .command("skills")
    .description("Browse and manage skills from the registry");

  skills
    .command("list")
    .description("Browse the skill registry")
    .action(async () => {
      const { skillsListCommand } = await import("./commands/skills/list.js");
      await skillsListCommand();
    });

  skills
    .command("search <query>")
    .description("Search skills by name or description")
    .action(async (query: string) => {
      const { skillsSearchCommand } = await import(
        "./commands/skills/search.js"
      );
      await skillsSearchCommand(query);
    });

  skills
    .command("add <id>")
    .description("Add a skill to lobu.toml")
    .action(async (id: string) => {
      const { skillsAddCommand } = await import("./commands/skills/add.js");
      await skillsAddCommand(process.cwd(), id);
    });

  skills
    .command("info <id>")
    .description("Show skill details and required secrets")
    .action(async (id: string) => {
      const { skillsInfoCommand } = await import("./commands/skills/info.js");
      await skillsInfoCommand(id);
    });

  // ─── providers ──────────────────────────────────────────────────────
  const providers = program
    .command("providers")
    .description("Browse and manage LLM providers");

  providers
    .command("list")
    .description("Browse available LLM providers")
    .action(async () => {
      const { providersListCommand } = await import(
        "./commands/providers/list.js"
      );
      await providersListCommand();
    });

  providers
    .command("add <id>")
    .description("Add a provider to lobu.toml")
    .action(async (id: string) => {
      const { providersAddCommand } = await import(
        "./commands/providers/add.js"
      );
      await providersAddCommand(process.cwd(), id);
    });

  await program.parseAsync(argv);
}
