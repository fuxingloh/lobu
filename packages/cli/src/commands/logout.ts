import chalk from "chalk";
import { resolveContext } from "../api/context.js";
import { clearCredentials } from "../api/credentials.js";

export async function logoutCommand(options?: {
  context?: string;
}): Promise<void> {
  const target = await resolveContext(options?.context);
  await clearCredentials(target.name);
  console.log(chalk.dim(`\n  Logged out of ${target.name}.\n`));
}
