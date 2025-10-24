import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { execa } from "execa";
import ora from "ora";
import prompts from "prompts";
import validate from "validate-npm-package-name";

interface CreateOptions {
  projectName: string;
  targetDir: string;
  packageManager: "npm" | "bun" | "yarn" | "pnpm";
}

export async function create(projectPath: string): Promise<void> {
  console.log(chalk.bold.cyan("\n🤖 Create Peerbot\n"));

  // Parse project name and target directory
  const projectName = projectPath || (await promptForProjectName());
  const targetDir = resolve(process.cwd(), projectName);

  // Validate project name
  const validation = validate(projectName);
  if (!validation.validForNewPackages) {
    console.error(chalk.red("\n✗ Invalid project name:"));
    if (validation.errors) {
      validation.errors.forEach((error) => {
        console.error(chalk.dim(`  - ${error}`));
      });
    }
    if (validation.warnings) {
      validation.warnings.forEach((warning) => {
        console.warn(chalk.yellow(`  - ${warning}`));
      });
    }
    process.exit(1);
  }

  // Check if directory exists
  try {
    await access(targetDir, constants.F_OK);
    console.error(chalk.red(`\n✗ Directory "${projectName}" already exists\n`));
    process.exit(1);
  } catch {
    // Directory doesn't exist, good to proceed
  }

  // Detect package manager
  const packageManager = await detectPackageManager();

  const options: CreateOptions = {
    projectName,
    targetDir,
    packageManager,
  };

  // Create project
  await scaffoldProject(options);

  // Run interactive setup
  await runInteractiveSetup(options);

  // Show completion message
  showCompletionMessage(options);
}

async function promptForProjectName(): Promise<string> {
  const response = await prompts({
    type: "text",
    name: "projectName",
    message: "Project name?",
    initial: "my-peerbot",
    validate: (value: string) => {
      const validation = validate(value);
      if (!validation.validForNewPackages) {
        return validation.errors?.[0] || "Invalid project name";
      }
      return true;
    },
  });

  if (!response.projectName) {
    console.log(chalk.yellow("\n✗ Project creation cancelled\n"));
    process.exit(0);
  }

  return response.projectName;
}

async function detectPackageManager(): Promise<
  "npm" | "bun" | "yarn" | "pnpm"
> {
  // Check for lock files in current directory to detect preferred package manager
  const cwd = process.cwd();

  try {
    await access(join(cwd, "bun.lockb"), constants.F_OK);
    return "bun";
  } catch {
    // No bun.lockb found
  }

  try {
    await access(join(cwd, "pnpm-lock.yaml"), constants.F_OK);
    return "pnpm";
  } catch {
    // No pnpm-lock.yaml found
  }

  try {
    await access(join(cwd, "yarn.lock"), constants.F_OK);
    return "yarn";
  } catch {
    // No yarn.lock found
  }

  // Check if bun is available globally
  try {
    await execa("bun", ["--version"]);
    return "bun";
  } catch {
    // Bun not available globally
  }

  // Default to npm
  return "npm";
}

async function scaffoldProject(options: CreateOptions): Promise<void> {
  const spinner = ora(
    `Creating project in ${chalk.cyan(options.projectName)}`
  ).start();

  try {
    // Create project directory
    await mkdir(options.targetDir, { recursive: true });

    // Create package.json
    const packageJson = {
      name: options.projectName,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "peerbot dev",
        logs: "peerbot logs",
        down: "peerbot down",
        rebuild: "peerbot rebuild",
        deploy: "peerbot deploy",
      },
      dependencies: {
        "@peerbot/cli": "^0.1.0",
      },
    };

    await writeFile(
      join(options.targetDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    spinner.succeed("Project scaffolded");
  } catch (error) {
    spinner.fail("Failed to scaffold project");
    throw error;
  }
}

async function runInteractiveSetup(options: CreateOptions): Promise<void> {
  const spinner = ora("Installing dependencies...").start();

  try {
    // Install dependencies
    const installCmd = getInstallCommand(options.packageManager);
    await execa(installCmd.command, installCmd.args, {
      cwd: options.targetDir,
      stdio: "inherit",
    });

    spinner.succeed("Dependencies installed");
  } catch (error) {
    spinner.fail("Failed to install dependencies");
    throw error;
  }

  // Run peerbot init
  console.log(chalk.dim("\n📋 Setting up your Peerbot project...\n"));

  try {
    const initCmd = getCliCommand(options.packageManager, "init");
    await execa(initCmd.command, initCmd.args, {
      cwd: options.targetDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(chalk.red("\n✗ Failed to initialize project"));
    throw error;
  }
}

function getInstallCommand(packageManager: string): {
  command: string;
  args: string[];
} {
  switch (packageManager) {
    case "bun":
      return { command: "bun", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: [] };
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    default:
      return { command: "npm", args: ["install"] };
  }
}

function getCliCommand(
  packageManager: string,
  command: string
): { command: string; args: string[] } {
  switch (packageManager) {
    case "bun":
      return { command: "bun", args: ["run", "peerbot", command] };
    case "yarn":
      return { command: "yarn", args: ["peerbot", command] };
    case "pnpm":
      return { command: "pnpm", args: ["exec", "peerbot", command] };
    default:
      return { command: "npx", args: ["peerbot", command] };
  }
}

function showCompletionMessage(options: CreateOptions): void {
  const { projectName, packageManager } = options;

  console.log(chalk.green("\n✓ Project created successfully!\n"));
  console.log(chalk.bold("Next steps:\n"));
  console.log(chalk.cyan(`  cd ${projectName}`));

  // Show run command based on package manager
  const runCmd = packageManager === "npm" ? "npm run" : packageManager;
  console.log(chalk.cyan(`  ${runCmd} dev\n`));

  console.log(chalk.dim("Available commands:"));
  console.log(chalk.dim(`  ${runCmd} dev      - Start development server`));
  console.log(chalk.dim(`  ${runCmd} logs     - View logs`));
  console.log(chalk.dim(`  ${runCmd} down     - Stop services`));
  console.log(chalk.dim(`  ${runCmd} rebuild  - Rebuild worker image`));
  console.log(chalk.dim(`  ${runCmd} deploy   - Deploy to production\n`));
}
