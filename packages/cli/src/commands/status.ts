import chalk from "chalk";

export async function statusCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n  Lobu Cloud is in early access.\n"));
  console.log(
    chalk.dim("  Agent status will be available when you deploy to Lobu Cloud.")
  );
  console.log(
    chalk.dim("  For local dev, use `docker compose ps` in your project.\n")
  );
}
