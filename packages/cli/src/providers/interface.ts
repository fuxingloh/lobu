import type { PeerbotConfig } from "../types.js";

export interface DeploymentProvider {
  /**
   * Build worker image/bundle
   */
  build(config: PeerbotConfig): Promise<void>;

  /**
   * Generate platform-specific manifests (compose, helm values, etc.)
   */
  render(config: PeerbotConfig): Promise<void>;

  /**
   * Deploy to target platform
   */
  apply(config: PeerbotConfig): Promise<void>;

  /**
   * Stream logs from services
   */
  logs(service?: string): Promise<void>;

  /**
   * Tear down deployment
   */
  teardown(config: PeerbotConfig): Promise<void>;

  /**
   * Check if platform dependencies are available
   */
  checkDependencies(): Promise<{
    available: boolean;
    missing?: string[];
    installUrl?: string;
  }>;
}

export abstract class BaseProvider implements DeploymentProvider {
  abstract build(config: PeerbotConfig): Promise<void>;
  abstract render(config: PeerbotConfig): Promise<void>;
  abstract apply(config: PeerbotConfig): Promise<void>;
  abstract logs(service?: string): Promise<void>;
  abstract teardown(config: PeerbotConfig): Promise<void>;
  abstract checkDependencies(): Promise<{
    available: boolean;
    missing?: string[];
    installUrl?: string;
  }>;

  protected async checkCommand(command: string): Promise<boolean> {
    try {
      const { execa } = await import("execa");
      await execa(command, ["--version"], { reject: true });
      return true;
    } catch {
      return false;
    }
  }
}
