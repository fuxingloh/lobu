import { join } from "node:path";
import { readFile } from "node:fs/promises";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import YAML from "yaml";
import { AVAILABLE_TARGETS, TARGET_LABELS } from "../providers/index.js";
import type { DeploymentTarget } from "../types.js";
import { checkConfigExists } from "../utils/config.js";
import { renderTemplate } from "../utils/template.js";

const DEFAULT_SLACK_MANIFEST = {
  display_information: {
    name: "Peerbot",
    description: "Hire AI peers to work with you, using your environments",
    background_color: "#4a154b",
    long_description:
      "This bot integrates Claude Code SDK with Slack to provide AI-powered coding assistance directly in your workspace. You can generate apps/AI peers that will appear as new handles.",
  },
  features: {
    app_home: {
      home_tab_enabled: true,
      messages_tab_enabled: true,
      messages_tab_read_only_enabled: false,
    },
    bot_user: {
      display_name: "Peerbot",
      always_online: true,
    },
    slash_commands: [
      {
        command: "/peerbot",
        description:
          "Peerbot commands - manage repositories and authentication",
        usage_hint: "connect | login | help",
      },
    ],
    assistant_view: {
      assistant_description:
        "It can generate Claude Code session working on public Github data",
      suggested_prompts: [
        {
          title: "Create a project",
          message: "Create a new project",
        },
        {
          title: "Start working on a feature",
          message:
            "List me projects and let me tell you what I want to develop on which project",
        },
        {
          title: "Fix a bug",
          message:
            "List me projects and let me tell you what I want to develop on which project",
        },
        {
          title: "Ask a question to the codebase",
          message:
            "List me projects and let me tell you what I want to develop on which project",
        },
      ],
    },
  },
  oauth_config: {
    redirect_urls: [],
    scopes: {
      bot: [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "chat:write.public",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:read",
        "reactions:read",
        "reactions:write",
        "users:read",
        "commands",
      ],
    },
  },
  settings: {
    event_subscriptions: {
      bot_events: [
        "app_home_opened",
        "app_mention",
        "team_join",
        "member_joined_channel",
        "message.channels",
        "message.groups",
        "message.im",
      ],
    },
    interactivity: {
      is_enabled: true,
    },
    org_deploy_enabled: false,
    socket_mode_enabled: true,
    token_rotation_enabled: false,
  },
} as const;

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
  const baseAnswers = await inquirer.prompt([
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
      type: "input",
      name: "publicUrl",
      message: "Public Gateway URL (for MCP OAuth callbacks)?",
      default: "",
    },
  ]);

  const { slackAppOption } = await inquirer.prompt([
    {
      type: "list",
      name: "slackAppOption",
      message: "Slack app setup?",
      choices: [
        {
          name: "Create a new Slack app using the Peerbot manifest",
          value: "create",
        },
        {
          name: "Use an existing Slack app",
          value: "existing",
        },
      ],
      default: "create",
    },
  ]);

  if (slackAppOption === "create") {
    const manifestUrl = await getSlackManifestUrl();
    console.log(chalk.bold("\n🔗 Create your Slack app"));
    console.log(
      `Open this link to create the app with the recommended manifest:\n${chalk.cyan(
        chalk.underline(manifestUrl)
      )}\n`
    );
    await inquirer.prompt([
      {
        type: "confirm",
        name: "slackAppCreated",
        message:
          "Press enter after clicking “Create” and returning here to continue.",
        default: true,
      },
    ]);
  }

  const { slackAppId } = await inquirer.prompt([
    {
      type: "input",
      name: "slackAppId",
      message: "Slack App ID (optional)?",
      default: "",
    },
  ]);

  const trimmedAppId = slackAppId.trim();
  const appIdForLinks = trimmedAppId !== "" ? trimmedAppId : "<YOUR_APP_ID>";
  const appDashboardUrl = `https://api.slack.com/apps/${appIdForLinks}`;
  const oauthUrl = `${appDashboardUrl}/oauth`;

  console.log(chalk.bold("\n🔐 Collect your Slack credentials"));
  console.log(
    `Signing Secret & App-Level Tokens: ${chalk.cyan(
      chalk.underline(appDashboardUrl)
    )}`
  );
  console.log(
    `OAuth Tokens (Bot Token): ${chalk.cyan(chalk.underline(oauthUrl))} You should install the app first.\n`
  );
  if (trimmedAppId === "") {
    console.log(
      chalk.dim(
        "Replace <YOUR_APP_ID> in the links above once you locate your Slack app ID."
      )
    );
    console.log();
  }

  const credentialAnswers = await inquirer.prompt([
    {
      type: "password",
      name: "slackSigningSecret",
      message: "Slack Signing Secret?",
      validate: (input: string) => {
        if (!input) {
          return "Please enter your Slack signing secret.";
        }
        return true;
      },
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
  ]);

  const { aiKeyStrategy } = await inquirer.prompt([
    {
      type: "list",
      name: "aiKeyStrategy",
      message: "How should teammates access Claude/OpenAI?",
      choices: [
        {
          name: "Each user brings their own API keys",
          value: "user-provided",
        },
        {
          name: "Provide shared keys now so the bot works out of the box",
          value: "shared",
        },
      ],
      default: "user-provided",
    },
  ]);

  let anthropicApiKey = "";
  if (aiKeyStrategy === "shared") {
    const { sharedAnthropicApiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "sharedAnthropicApiKey",
        message: "Shared Anthropic (Claude) API Key (sk-ant-...)?",
      },
    ]);
    anthropicApiKey = sharedAnthropicApiKey;
  }
  if (anthropicApiKey === "") {
    console.log(
      chalk.dim(
        "\nℹ With no shared API key, teammates authorize Claude/OpenAI from the Slack Home tab on first use.\n"
      )
    );
  }

  const answers = {
    ...baseAnswers,
    slackAppId: trimmedAppId,
    ...credentialAnswers,
    anthropicApiKey,
  };

  const spinner = ora("Creating Peerbot project...").start();

  try {
    const workerMode = answers.workerMode || "none";
    const customization = workerMode === "none" ? "base" : "dockerfile";

    const variables = {
      PROJECT_NAME: answers.projectName,
      CLI_VERSION: cliVersion,
      WORKER_CUSTOMIZATION: customization,
      WORKER_MODE: workerMode,
      SLACK_SIGNING_SECRET: answers.slackSigningSecret,
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

async function getSlackManifestUrl(): Promise<string> {
  const manifestYaml = await loadSlackManifestYaml();
  const encodedManifest = encodeURIComponent(manifestYaml);
  return `https://api.slack.com/apps?new_app=1&manifest_yaml=${encodedManifest}`;
}

async function loadSlackManifestYaml(): Promise<string> {
  try {
    const manifestUrl = new URL(
      "../../../../slack-app-manifest.json",
      import.meta.url
    );
    const manifestContent = await readFile(manifestUrl, "utf-8");
    const manifest = JSON.parse(manifestContent);
    return YAML.stringify(manifest).trim();
  } catch {
    return YAML.stringify(DEFAULT_SLACK_MANIFEST).trim();
  }
}

async function getCliVersion(): Promise<string> {
  const pkgPath = new URL("../../package.json", import.meta.url);
  const pkgContent = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(pkgContent);
  return pkg.version || "0.1.0";
}
