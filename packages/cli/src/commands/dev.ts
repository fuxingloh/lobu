import chalk from "chalk";
import ora from "ora";
import { createProvider } from "../providers/index.js";
import { ensurePeerbotDir, loadConfig } from "../utils/config.js";

export async function devCommand(cwd: string = process.cwd()): Promise<void> {
  console.log(chalk.bold.cyan("\n🤖 Starting Peerbot...\n"));

  try {
    // Load configuration
    const config = await loadConfig(cwd);

    // Determine target (default to docker)
    const target = "docker";
    const provider = createProvider(target);

    // Check dependencies
    const spinner = ora("Checking dependencies...").start();
    const deps = await provider.checkDependencies();

    if (!deps.available) {
      spinner.fail("Missing dependencies");
      console.log(chalk.red("\n✗ Required dependencies not found:\n"));
      for (const dep of deps.missing || []) {
        console.log(chalk.dim(`  - ${dep}`));
      }
      if (deps.installUrl) {
        console.log(chalk.yellow(`\nℹ  Install from: ${deps.installUrl}\n`));
      }
      process.exit(1);
    }
    spinner.succeed("Dependencies OK");

    // Ensure .peerbot directory exists
    await ensurePeerbotDir(cwd);

    // Render platform manifests
    await provider.render(config);

    // Build worker image if needed
    if (config.worker.customization === "dockerfile") {
      await provider.build(config);
    }

    // Start services
    await provider.apply(config);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("peerbot.config.js not found")) {
        console.log(chalk.red(`\n✗ ${error.message}`));
        console.log(
          chalk.yellow("\nℹ  Initialize with: ") +
            chalk.cyan("npx peerbot init\n")
        );
        process.exit(1);
      }
    }
    throw error;
  }
}
