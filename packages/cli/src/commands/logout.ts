import chalk from "chalk";
import { clearCredentials } from "../api/credentials.js";

export async function logoutCommand(): Promise<void> {
  await clearCredentials();
  console.log(chalk.dim("\n  Logged out.\n"));
}
