import chalk from "chalk";
import { loadCredentials } from "../api/credentials.js";

export async function whoamiCommand(): Promise<void> {
  const creds = await loadCredentials();

  if (!creds) {
    const envToken = process.env.LOBU_API_TOKEN;
    if (envToken) {
      console.log(
        chalk.dim("\n  Authenticated via LOBU_API_TOKEN environment variable.")
      );
      console.log(chalk.dim("  Lobu Cloud is in early access.\n"));
      return;
    }
    console.log(chalk.dim("\n  Not logged in."));
    console.log(chalk.dim("  Run `lobu login` to authenticate.\n"));
    return;
  }

  console.log(chalk.bold("\n  Lobu CLI"));
  if (creds.email) {
    console.log(chalk.dim(`  User: ${creds.email}`));
  }
  if (creds.agentId) {
    console.log(chalk.dim(`  Linked agent: ${creds.agentId}`));
  }
  console.log();
}
