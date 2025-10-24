import chalk from "chalk";
import { createProvider } from "../providers/index.js";
import { loadConfig } from "../utils/config.js";

export async function downCommand(cwd: string = process.cwd()): Promise<void> {
  console.log(chalk.bold.cyan("\n🤖 Stopping Peerbot...\n"));

  try {
    const config = await loadConfig(cwd);

    const target = "docker"; // TODO: detect from config or flag
    const provider = createProvider(target);

    await provider.teardown(config);

    console.log(chalk.green("\n✓ Peerbot stopped\n"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("peerbot.config.js not found")
    ) {
      console.log(chalk.yellow("\nℹ  No active Peerbot instance found\n"));
      return;
    }
    throw error;
  }
}
