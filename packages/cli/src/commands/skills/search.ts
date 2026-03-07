import chalk from "chalk";
import { isProviderSkill, loadSkillsRegistry } from "./registry.js";

export async function skillsSearchCommand(query: string): Promise<void> {
  const skills = loadSkillsRegistry();
  const q = query.toLowerCase();

  const matches = skills.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    console.log(chalk.yellow(`\n  No skills matching "${query}".\n`));
    return;
  }

  console.log(chalk.bold(`\n  Skills matching "${query}":\n`));
  const maxIdLen = Math.max(...matches.map((s) => s.id.length));
  for (const skill of matches) {
    const type = isProviderSkill(skill)
      ? chalk.dim("[provider]")
      : chalk.dim("[integration]");
    console.log(
      `  ${chalk.cyan(skill.id.padEnd(maxIdLen))}  ${chalk.dim(skill.description)}  ${type}`
    );
  }
  console.log();
}
