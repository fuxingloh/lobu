import chalk from "chalk";
import { isLoadError, loadConfig } from "../config/loader.js";
import { validateCommand } from "./validate.js";

export async function launchCommand(
  cwd: string,
  options: { dryRun?: boolean; env?: string; message?: string }
): Promise<void> {
  const valid = await validateCommand(cwd);
  if (!valid) {
    process.exit(1);
  }

  const result = await loadConfig(cwd);
  if (isLoadError(result)) {
    process.exit(1);
  }

  const agentCount = Object.keys(result.config.agents).length;
  console.log(chalk.dim(`  ${agentCount} agent(s) configured`));

  if (options.dryRun) {
    console.log(chalk.dim("\n  Dry run — no changes applied.\n"));
    return;
  }

  console.log(chalk.bold.cyan("\n  Lobu Cloud is in early access.\n"));
  console.log(chalk.bold("  Get started:"));
  console.log(
    `    Schedule a call    ${chalk.cyan("https://cal.com/burakemre/lobu")}`
  );
  console.log(
    `    Self-host now      ${chalk.cyan("https://lobu.ai/docs/deployment")}`
  );
  console.log(
    `    REST API docs      ${chalk.cyan("https://community.lobu.ai/api/docs")}`
  );
  console.log(chalk.dim(`\n  Run locally with: ${chalk.white("lobu dev")}\n`));
}
