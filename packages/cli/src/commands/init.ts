import { readFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { AVAILABLE_TARGETS, TARGET_LABELS } from "../providers/index.js";
import type { DeploymentTarget } from "../types.js";
import { checkConfigExists } from "../utils/config.js";
import { renderTemplate } from "../utils/template.js";

export async function initCommand(cwd: string = process.cwd()): Promise<void> {
  console.log(chalk.bold.cyan("\n🤖 Welcome to Peerbot!\n"));

  // Check if already initialized
  const configExists = await checkConfigExists(cwd);
  if (configExists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "Peerbot config already exists. Overwrite?",
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow("\nℹ Initialization cancelled\n"));
      return;
    }
  }

  // Get CLI version
  const cliVersion = await getCliVersion();

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Project name?",
      default: "my-peerbot",
      validate: (input: string) => {
        if (!/^[a-z0-9-]+$/.test(input)) {
          return "Project name must be lowercase alphanumeric with hyphens only";
        }
        return true;
      },
    },
    {
      type: "list",
      name: "target",
      message: "Deployment target?",
      choices: AVAILABLE_TARGETS.map((target) => ({
        name: TARGET_LABELS[target],
        value: target,
      })),
      default: "docker",
    },
    {
      type: "list",
      name: "workerMode",
      message: "How do you want to run workers?",
      choices: [
        {
          name: "Use our base image (quick start, recommended)",
          value: "base-image",
        },
        {
          name: "Install as package (advanced - bring your own base image)",
          value: "package",
        },
        {
          name: "No customization (use default base image)",
          value: "none",
        },
      ],
      default: "base-image",
      when: (answers) =>
        answers.target === "docker" || answers.target === "kubernetes",
    },
    {
      type: "password",
      name: "slackBotToken",
      message: "Slack Bot Token (xoxb-...)?",
      validate: (input: string) => {
        if (!input || !input.startsWith("xoxb-")) {
          return "Please enter a valid Slack bot token starting with xoxb-";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "slackAppToken",
      message: "Slack App Token (xapp-...)?",
      validate: (input: string) => {
        if (!input || !input.startsWith("xapp-")) {
          return "Please enter a valid Slack app token starting with xapp-";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "anthropicApiKey",
      message: "Anthropic API Key (sk-ant-...)?",
      validate: (input: string) => {
        if (!input || !input.startsWith("sk-ant-")) {
          return "Please enter a valid Anthropic API key starting with sk-ant-";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "publicUrl",
      message: "Public Gateway URL (for OAuth callbacks)?",
      default: "",
    },
  ]);

  const spinner = ora("Creating Peerbot project...").start();

  try {
    const workerMode = answers.workerMode || "none";
    const customization = workerMode === "none" ? "base" : "dockerfile";

    const variables = {
      PROJECT_NAME: answers.projectName,
      CLI_VERSION: cliVersion,
      WORKER_CUSTOMIZATION: customization,
      WORKER_MODE: workerMode,
      SLACK_BOT_TOKEN: answers.slackBotToken,
      SLACK_APP_TOKEN: answers.slackAppToken,
      ANTHROPIC_API_KEY: answers.anthropicApiKey,
      PEERBOT_PUBLIC_GATEWAY_URL: answers.publicUrl || "",
      CUSTOMIZE_WORKER: workerMode !== "none" ? "true" : "false",
    };

    // Create package.json (if it doesn't exist)
    try {
      await import("node:fs/promises").then((fs) =>
        fs.access(join(cwd, "package.json"))
      );
    } catch {
      // package.json doesn't exist, create it
      await renderTemplate(
        "package.json.tmpl",
        variables,
        join(cwd, "package.json")
      );
    }

    // Create config file
    await renderTemplate(
      "peerbot.config.js.tmpl",
      variables,
      join(cwd, "peerbot.config.js")
    );

    // Create .env file
    await renderTemplate(".env.tmpl", variables, join(cwd, ".env"));

    // Create .gitignore
    await renderTemplate(".gitignore.tmpl", {}, join(cwd, ".gitignore"));

    // Create README
    await renderTemplate("README.md.tmpl", variables, join(cwd, "README.md"));

    // Create Dockerfile.worker based on mode
    if (workerMode === "base-image") {
      await renderTemplate(
        "Dockerfile.worker.tmpl",
        variables,
        join(cwd, "Dockerfile.worker")
      );
    } else if (workerMode === "package") {
      await renderTemplate(
        "Dockerfile.worker-package.tmpl",
        variables,
        join(cwd, "Dockerfile.worker")
      );
    }

    // Create .peerbot directory
    const { ensurePeerbotDir } = await import("../utils/config.js");
    await ensurePeerbotDir(cwd);

    spinner.succeed("Project created successfully!");

    // Print next steps
    console.log(chalk.green("\n✓ Peerbot initialized!\n"));
    console.log(chalk.bold("Next steps:\n"));
    console.log(chalk.cyan("  1. Review your configuration:"));
    console.log(chalk.dim("     - peerbot.config.js"));
    console.log(chalk.dim("     - .env"));
    if (workerMode !== "none") {
      console.log(chalk.dim("     - Dockerfile.worker"));
      if (workerMode === "package") {
        console.log(
          chalk.yellow(
            "     ℹ Advanced mode: See docs/custom-base-image.md for requirements\n"
          )
        );
      } else {
        console.log();
      }
    } else {
      console.log();
    }
    console.log(chalk.cyan("  2. Install dependencies:"));
    console.log(chalk.dim("     npm install\n"));
    console.log(chalk.cyan("  3. Start the bot:"));
    console.log(chalk.dim("     npm run dev\n"));
    console.log(chalk.cyan("  4. View logs:"));
    console.log(chalk.dim("     npm run logs\n"));

    if (answers.target !== "docker") {
      console.log(
        chalk.yellow(
          `ℹ  Note: ${TARGET_LABELS[answers.target as DeploymentTarget]} support is coming soon.`
        )
      );
      console.log(
        chalk.dim(
          '   For now, you can use Docker locally with "npx peerbot dev"\n'
        )
      );
    }
  } catch (error) {
    spinner.fail("Failed to create project");
    throw error;
  }
}

async function getCliVersion(): Promise<string> {
  const pkgPath = new URL("../../package.json", import.meta.url);
  const pkgContent = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(pkgContent);
  return pkg.version || "0.1.0";
}
