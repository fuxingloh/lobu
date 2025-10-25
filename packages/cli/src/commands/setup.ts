import chalk from "chalk";
import { initCommand } from "./init.js";

/**
 * Temporary shim to keep supporting the legacy `peerbot setup` command.
 * Delegates to the new interactive initialization flow.
 */
export async function setupCommand(cwd: string = process.cwd()): Promise<void> {
  console.log(
    chalk.yellow(
      "\n⚠  `peerbot setup` is deprecated. Please use `peerbot init` instead.\n"
    )
  );

  await initCommand(cwd);
}
