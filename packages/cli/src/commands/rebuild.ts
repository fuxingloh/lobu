import chalk from "chalk";
import ora from "ora";
import { createProvider } from "../providers/index.js";
import { loadConfig } from "../utils/config.js";

export async function rebuildCommand(
  cwd: string = process.cwd()
): Promise<void> {
  console.log(chalk.bold.cyan("\n🤖 Rebuilding worker...\n"));

  try {
    const config = await loadConfig(cwd);

    if (config.worker.customization !== "dockerfile") {
      console.log(
        chalk.yellow("\nℹ  No Dockerfile to rebuild. Worker uses base image.\n")
      );
      return;
    }

    const target = "docker"; // TODO: detect from config or flag
    const provider = createProvider(target);

    const spinner = ora("Rebuilding worker image...").start();
    await provider.build(config);
    spinner.succeed("Worker image rebuilt");

    // Restart gateway to pick up new image
    spinner.text = "Restarting gateway...";
    spinner.start();
    const { execa } = await import("execa");
    await execa(
      "docker",
      ["compose", "-f", ".peerbot/docker-compose.yml", "up", "-d", "gateway"],
      {
        stdio: "inherit",
      }
    );
    spinner.succeed("Gateway restarted");

    console.log(chalk.green("\n✓ Rebuild complete\n"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("peerbot.config.js not found")
    ) {
      console.log(chalk.red(`\n✗ ${error.message}`));
      console.log(
        chalk.yellow("\nℹ  Initialize with: ") +
          chalk.cyan("npx peerbot init\n")
      );
      process.exit(1);
    }
    throw error;
  }
}
