import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { CONFIG_FILENAME } from "../../config/loader.js";
import { getSkillById } from "./registry.js";

export async function skillsAddCommand(
  cwd: string,
  skillId: string
): Promise<void> {
  const skill = getSkillById(skillId);
  if (!skill) {
    console.log(chalk.red(`\n  Skill "${skillId}" not found.`));
    console.log(
      chalk.dim("  Run `lobu skills list` to see available skills.\n")
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
  const skills = (parsed.skills ?? {}) as Record<string, unknown>;
  const enabled = (skills.enabled ?? []) as string[];

  if (enabled.includes(skillId)) {
    console.log(chalk.yellow(`\n  Skill "${skillId}" is already enabled.\n`));
    return;
  }

  enabled.push(skillId);
  skills.enabled = enabled;
  parsed.skills = skills;

  await writeFile(configPath, stringifyToml(parsed));
  console.log(chalk.green(`\n  Added "${skillId}" to ${CONFIG_FILENAME}`));

  // Show required secrets if provider
  if (skill.providers) {
    const envVars = skill.providers.map((p) => p.envVarName);
    if (envVars.length > 0) {
      console.log(chalk.dim("\n  Required secrets:"));
      for (const v of envVars) {
        console.log(chalk.cyan(`    lobu secrets set ${v} <your-key>`));
      }
    }
  }
  console.log();
}
