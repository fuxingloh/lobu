import type { ChildProcess } from "node:child_process";
import { createLogger } from "@peerbot/shared";

const logger = createLogger("process-tracker");

export interface ProcessInfo {
  deploymentName: string;
  deploymentId: string;
  process: ChildProcess;
  pid: number;
  lastActivity: Date;
  userId: string;
  threadId: string;
}

/**
 * Tracks running worker subprocesses
 */
export class ProcessTracker {
  private processes: Map<string, ProcessInfo> = new Map();

  /**
   * Register a new subprocess
   */
  register(info: ProcessInfo): void {
    this.processes.set(info.deploymentName, info);
    logger.info(
      `📝 Registered process ${info.deploymentName} (PID: ${info.pid})`
    );
  }

  /**
   * Get process info by deployment name
   */
  get(deploymentName: string): ProcessInfo | undefined {
    return this.processes.get(deploymentName);
  }

  /**
   * Get all tracked processes
   */
  getAll(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(deploymentName: string): void {
    const info = this.processes.get(deploymentName);
    if (info) {
      info.lastActivity = new Date();
      logger.debug(`⏰ Updated activity for ${deploymentName}`);
    }
  }

  /**
   * Remove process from tracking
   */
  unregister(deploymentName: string): void {
    const info = this.processes.get(deploymentName);
    if (info) {
      this.processes.delete(deploymentName);
      logger.info(
        `🗑️  Unregistered process ${deploymentName} (PID: ${info.pid})`
      );
    }
  }

  /**
   * Check if a process is still running
   */
  isRunning(deploymentName: string): boolean {
    const info = this.processes.get(deploymentName);
    if (!info) return false;

    try {
      // Send signal 0 to check if process exists without killing it
      process.kill(info.pid, 0);
      return true;
    } catch (error) {
      // Process doesn't exist
      this.unregister(deploymentName);
      return false;
    }
  }

  /**
   * Kill a process
   */
  kill(deploymentName: string, signal: NodeJS.Signals = "SIGTERM"): boolean {
    const info = this.processes.get(deploymentName);
    if (!info) return false;

    try {
      process.kill(info.pid, signal);
      logger.info(`💀 Sent ${signal} to ${deploymentName} (PID: ${info.pid})`);
      return true;
    } catch (error) {
      logger.warn(
        `⚠️  Failed to kill process ${deploymentName}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Get process count
   */
  count(): number {
    return this.processes.size;
  }

  /**
   * Clean up dead processes
   */
  cleanup(): void {
    const dead: string[] = [];
    for (const [name, info] of this.processes.entries()) {
      try {
        process.kill(info.pid, 0);
      } catch {
        dead.push(name);
      }
    }

    for (const name of dead) {
      this.unregister(name);
    }

    if (dead.length > 0) {
      logger.info(`🧹 Cleaned up ${dead.length} dead process(es)`);
    }
  }
}
