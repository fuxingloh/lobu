import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { CONFIG_FILENAME } from "../../config/loader.js";
import { getSkillById, isProviderSkill } from "../skills/registry.js";

export async function providersAddCommand(
  cwd: string,
  providerId: string
): Promise<void> {
  const skill = getSkillById(providerId);
  if (!skill || !isProviderSkill(skill)) {
    console.log(chalk.red(`\n  Provider "${providerId}" not found.`));
    console.log(
      chalk.dim("  Run `lobu providers list` to see available providers.\n")
    );
    return;
  }

  const configPath = join(cwd, CONFIG_FILENAME);
  let raw: string;
  try {
    raw = await readFile(configPath, "utf-8");
  } catch {
    console.log(
      chalk.red(`\n  No ${CONFIG_FILENAME} found. Run \`lobu init\` first.\n`)
    );
    return;
  }

  const parsed = parseToml(raw) as Record<string, unknown>;
  const providers = (parsed.providers ?? []) as Array<Record<string, unknown>>;

  // Check if already added
  if (providers.some((p) => p.id === providerId)) {
    console.log(
      chalk.yellow(`\n  Provider "${providerId}" is already configured.\n`)
    );
    return;
  }

  const provider = skill.providers?.[0];
  if (!provider) return;

  const defaultModel = provider.defaultModel;
  const entry: Record<string, unknown> = { id: providerId };
  if (defaultModel) {
    entry.model = defaultModel;
  }

  providers.push(entry);
  parsed.providers = providers;

  await writeFile(configPath, stringifyToml(parsed));

  console.log(
    chalk.green(`\n  Added provider "${providerId}" to ${CONFIG_FILENAME}`)
  );
  if (defaultModel) {
    console.log(chalk.dim(`  Default model: ${defaultModel}`));
  }

  // Show required secret
  const envVar = provider.envVarName;
  console.log(chalk.dim("\n  Set the API key:"));
  console.log(chalk.cyan(`    lobu secrets set ${envVar} <your-key>`));
  console.log();
}
