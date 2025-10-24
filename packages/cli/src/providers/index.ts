import type { DeploymentTarget } from "../types.js";
import { DockerProvider } from "./docker.js";
import type { DeploymentProvider } from "./interface.js";

export * from "./docker.js";
export * from "./interface.js";

export function createProvider(target: DeploymentTarget): DeploymentProvider {
  switch (target) {
    case "docker":
      return new DockerProvider();
    case "kubernetes":
      throw new Error("Kubernetes provider not yet implemented");
    case "ecs":
      throw new Error("ECS provider not yet implemented");
    case "cloudflare":
      throw new Error("Cloudflare provider not yet implemented");
    default:
      throw new Error(`Unknown deployment target: ${target}`);
  }
}

export const AVAILABLE_TARGETS: DeploymentTarget[] = ["docker"];

export const TARGET_LABELS: Record<DeploymentTarget, string> = {
  docker: "Docker (local development)",
  kubernetes: "Kubernetes (production, self-hosted)",
  ecs: "AWS ECS (production, managed)",
  cloudflare: "Cloudflare Containers (edge, fully managed)",
};
