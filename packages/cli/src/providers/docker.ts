import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { watch } from "chokidar";
import ora from "ora";
import type { PeerbotConfig } from "../types.js";
import { BaseProvider } from "./interface.js";

export class DockerProvider extends BaseProvider {
  private watcher?: ReturnType<typeof watch>;

  async checkDependencies() {
    const hasDocker = await this.checkCommand("docker");
    const hasCompose =
      (await this.checkCommand("docker-compose")) ||
      (await this.checkDockerCompose());

    const missing: string[] = [];
    if (!hasDocker) missing.push("docker");
    if (!hasCompose) missing.push("docker compose");

    return {
      available: missing.length === 0,
      missing,
      installUrl: "https://docs.docker.com/get-docker/",
    };
  }

  private async checkDockerCompose(): Promise<boolean> {
    try {
      const { execa } = await import("execa");
      await execa("docker", ["compose", "version"], { reject: true });
      return true;
    } catch {
      return false;
    }
  }

  async build(config: PeerbotConfig): Promise<void> {
    if (config.worker.customization !== "dockerfile") {
      return; // No build needed for base image or custom image
    }

    const dockerfilePath = "Dockerfile.worker";
    try {
      await access(dockerfilePath, constants.F_OK);
    } catch {
      console.log(
        chalk.yellow("⚠️  Dockerfile.worker not found, skipping build")
      );
      return;
    }

    const spinner = ora("Building worker image...").start();
    try {
      const { execa } = await import("execa");
      await execa(
        "docker",
        ["compose", "-f", ".peerbot/docker-compose.yml", "build", "worker"],
        {
          stdio: "inherit",
        }
      );
      spinner.succeed("Worker image built successfully");
    } catch (error) {
      spinner.fail("Failed to build worker image");
      throw error;
    }
  }

  async render(config: PeerbotConfig): Promise<void> {
    const spinner = ora("Generating docker-compose.yml...").start();

    try {
      const cliVersion = await this.getCliVersion();
      const workerImage = this.getWorkerImage(config);
      const gatewayImage = `buremba/peerbot-gateway:${cliVersion}`;

      const composeContent = this.generateComposeFile(
        config,
        gatewayImage,
        workerImage
      );

      await writeFile(".peerbot/docker-compose.yml", composeContent);
      spinner.succeed("Generated .peerbot/docker-compose.yml");
    } catch (error) {
      spinner.fail("Failed to generate docker-compose.yml");
      throw error;
    }
  }

  async apply(config: PeerbotConfig): Promise<void> {
    const spinner = ora("Starting services...").start();

    try {
      const { execa } = await import("execa");
      await execa(
        "docker",
        ["compose", "-f", ".peerbot/docker-compose.yml", "up", "-d"],
        {
          stdio: "inherit",
        }
      );
      spinner.succeed("Services started successfully");

      // Start file watcher if Dockerfile exists
      if (config.worker.customization === "dockerfile") {
        this.startFileWatcher(config);
      }

      console.log(`\n${chalk.green("✓")} Peerbot is running!`);
      console.log(
        chalk.dim("  Run") +
          chalk.cyan(" peerbot logs ") +
          chalk.dim("to view logs")
      );
      console.log(
        chalk.dim("  Run") +
          chalk.cyan(" peerbot down ") +
          chalk.dim("to stop\n")
      );
    } catch (error) {
      spinner.fail("Failed to start services");
      throw error;
    }
  }

  async logs(service?: string): Promise<void> {
    const { execa } = await import("execa");
    const args = ["compose", "-f", ".peerbot/docker-compose.yml", "logs", "-f"];
    if (service) args.push(service);

    await execa("docker", args, { stdio: "inherit" });
  }

  async teardown(_config: PeerbotConfig): Promise<void> {
    const spinner = ora("Stopping services...").start();

    try {
      // Stop file watcher
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = undefined;
      }

      const { execa } = await import("execa");
      await execa(
        "docker",
        ["compose", "-f", ".peerbot/docker-compose.yml", "down"],
        {
          stdio: "inherit",
        }
      );
      spinner.succeed("Services stopped");
    } catch (error) {
      spinner.fail("Failed to stop services");
      throw error;
    }
  }

  private getWorkerImage(config: PeerbotConfig): string {
    if (config.worker.customization === "image" && config.worker.customImage) {
      return config.worker.customImage;
    }
    if (config.worker.customization === "dockerfile") {
      const projectName =
        config.targets?.docker?.compose?.projectName || "peerbot";
      return `${projectName}-worker:latest`;
    }
    return config.worker.baseImage;
  }

  private generateComposeFile(
    config: PeerbotConfig,
    gatewayImage: string,
    workerImage: string
  ): string {
    const needsBuild = config.worker.customization === "dockerfile";
    const environment = config.worker.environment || {};

    return `# Generated by @peerbot/cli - DO NOT EDIT MANUALLY
# Edit peerbot.config.js and run 'peerbot dev' to regenerate

version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  gateway:
    image: ${gatewayImage}
    ports:
      - "${config.gateway.port}:8080"
    environment:
      DEPLOYMENT_MODE: docker
      WORKER_IMAGE: ${workerImage}
      REDIS_URL: redis://redis:6379
      SLACK_BOT_TOKEN: \${SLACK_BOT_TOKEN}
      SLACK_APP_TOKEN: \${SLACK_APP_TOKEN}
      ANTHROPIC_API_KEY: \${ANTHROPIC_API_KEY}
      PEERBOT_PUBLIC_GATEWAY_URL: \${PEERBOT_PUBLIC_GATEWAY_URL:-}
      HOST_PROJECT_PATH: \${PWD}
${Object.entries(environment)
  .map(([key, value]) => `      ${key}: ${value}`)
  .join("\n")}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      redis:
        condition: service_healthy

${
  needsBuild
    ? `  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
      args:
        BASE_VERSION: \${CLI_VERSION:-latest}
    image: ${workerImage}
    profiles:
      - build-only
`
    : ""
}`;
  }

  private startFileWatcher(config: PeerbotConfig): void {
    console.log(chalk.dim("👀 Watching Dockerfile.worker for changes..."));

    this.watcher = watch("Dockerfile.worker", {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on("change", async () => {
      console.log(
        chalk.yellow("\n🔄 Dockerfile.worker changed, rebuilding...")
      );

      try {
        await this.build(config);

        const { execa } = await import("execa");
        await execa(
          "docker",
          [
            "compose",
            "-f",
            ".peerbot/docker-compose.yml",
            "up",
            "-d",
            "gateway",
          ],
          {
            stdio: "inherit",
          }
        );

        console.log(chalk.green("✅ Rebuild complete\n"));
      } catch (error) {
        console.error(chalk.red("❌ Rebuild failed:"), error);
      }
    });
  }

  private async getCliVersion(): Promise<string> {
    try {
      const pkgPath = join(process.cwd(), "package.json");
      const pkgContent = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);
      return pkg.version || "latest";
    } catch {
      // Fallback: read from CLI package itself
      const cliPkgPath = new URL("../../package.json", import.meta.url);
      const pkgContent = await readFile(cliPkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);
      return pkg.version || "latest";
    }
  }
}
