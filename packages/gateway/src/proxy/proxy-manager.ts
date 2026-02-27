import type { Server } from "node:http";
import { createLogger } from "@lobu/core";
import { startHttpProxy, stopHttpProxy } from "./http-proxy";

const logger = createLogger("proxy-manager");

let proxyServer: Server | null = null;

/**
 * Determine the bind host for the proxy.
 * In local dev (DEPLOYMENT_MODE=docker, gateway running on host), bind to loopback
 * so the proxy isn't an open relay. Docker Desktop routes host.docker.internal
 * to host loopback, so workers in containers can still reach it.
 * In Docker Compose / K8s, bind to all interfaces so containers on lobu-internal can connect.
 */
function getProxyBindHost(): string {
  const deploymentMode = process.env.DEPLOYMENT_MODE;

  // Local dev: gateway on host, workers in Docker containers
  // Bind to loopback — Docker Desktop maps host.docker.internal → 127.0.0.1
  if (deploymentMode === "docker" && !process.env.RUNNING_IN_CONTAINER) {
    return "127.0.0.1";
  }

  // Docker Compose / K8s: bind to all interfaces
  return "::";
}

/**
 * Start filtering HTTP proxy for worker network isolation
 * Workers can only access internet via this proxy, which enforces domain allowlist/blocklist
 *
 * Behavior based on environment configuration:
 * - Empty/unset: Deny all (complete isolation)
 * - WORKER_ALLOWED_DOMAINS=*: Allow all (unrestricted)
 * - WORKER_ALLOWED_DOMAINS=domains: Allowlist mode
 * - WORKER_DISALLOWED_DOMAINS=domains: Blocklist mode
 * - Both set: Allowlist with exceptions
 */
export async function startFilteringProxy(): Promise<void> {
  try {
    const parsedPort = Number.parseInt(
      process.env.WORKER_PROXY_PORT || "8118",
      10
    );
    const port = Number.isFinite(parsedPort) ? parsedPort : 8118;
    const host = getProxyBindHost();

    proxyServer = await startHttpProxy(port, host);

    logger.info(`✅ HTTP proxy started successfully on ${host}:${port}`);
  } catch (error) {
    logger.error("Failed to start HTTP proxy:", error);
    throw error;
  }
}

/**
 * Stop filtering proxy (cleanup on shutdown)
 */
export async function stopFilteringProxy(): Promise<void> {
  if (proxyServer) {
    logger.info("Stopping HTTP proxy...");
    await stopHttpProxy(proxyServer);
    proxyServer = null;
  }
}

/**
 * Handle graceful shutdown
 */
process.on("SIGTERM", async () => {
  await stopFilteringProxy();
});

process.on("SIGINT", async () => {
  await stopFilteringProxy();
});
