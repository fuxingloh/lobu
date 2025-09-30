/**
 * Security policy for subprocess sandboxing
 * Defines seccomp filters, resource limits, and filesystem restrictions
 */

/**
 * Dangerous syscalls to block in seccomp filter
 * These syscalls can be used for privilege escalation, kernel exploits, or breaking out of isolation
 */
export const BLOCKED_SYSCALLS = [
  // Kernel module operations
  "init_module",
  "finit_module",
  "delete_module",

  // Mount operations (can break filesystem isolation)
  "mount",
  "umount",
  "umount2",
  "pivot_root",

  // BPF (can be used for kernel exploits)
  "bpf",

  // Keyring (can leak credentials)
  "keyctl",
  "add_key",
  "request_key",

  // Performance monitoring (can leak information)
  "perf_event_open",

  // User namespaces (can escalate privileges if misconfigured)
  // We only allow the initial unshare, not creating new namespaces
  "unshare",

  // Kexec (kernel reboot)
  "kexec_load",
  "kexec_file_load",

  // Userfaultfd (can be used for kernel exploits)
  "userfaultfd",

  // Ptrace (can debug other processes)
  "ptrace",

  // Reboot
  "reboot",

  // Swap
  "swapon",
  "swapoff",

  // Time manipulation
  "settimeofday",
  "clock_settime",

  // Quotas
  "quotactl",

  // Process accounting
  "acct",
];

/**
 * Resource limits for sandboxed processes
 */
export interface ResourceLimits {
  // CPU time limit in seconds (RLIMIT_CPU)
  cpuTime: number;

  // Maximum file size in bytes (RLIMIT_FSIZE)
  maxFileSize: number;

  // Maximum number of open files (RLIMIT_NOFILE)
  maxOpenFiles: number;

  // Maximum number of processes (RLIMIT_NPROC)
  maxProcesses: number;

  // Maximum address space in bytes (RLIMIT_AS)
  maxAddressSpace: number;
}

/**
 * Default resource limits (conservative for security)
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  cpuTime: 3600, // 1 hour
  maxFileSize: 1024 * 1024 * 1024, // 1GB
  maxOpenFiles: 1024,
  maxProcesses: 256,
  maxAddressSpace: 2 * 1024 * 1024 * 1024, // 2GB
};

/**
 * Filesystem mount configuration
 */
export interface FilesystemMount {
  source: string;
  target: string;
  readonly: boolean;
}

/**
 * Get default filesystem mounts for sandbox
 * These provide a minimal Linux environment
 */
export function getDefaultMounts(workspaceDir: string): FilesystemMount[] {
  return [
    // System directories (read-only)
    { source: "/usr", target: "/usr", readonly: true },
    { source: "/bin", target: "/bin", readonly: true },
    { source: "/lib", target: "/lib", readonly: true },
    { source: "/lib64", target: "/lib64", readonly: true },
    { source: "/etc", target: "/etc", readonly: true },

    // Workspace (read-write)
    { source: workspaceDir, target: "/workspace", readonly: false },
  ];
}

/**
 * Generate bubblewrap command arguments for secure sandboxing
 */
export function generateBwrapArgs(
  workspaceDir: string,
  envVars: Record<string, string>,
  workerCommand: string[]
): string[] {
  const args: string[] = [
    // === Namespace isolation ===
    "--unshare-all", // Unshare all namespaces (PID, IPC, UTS, user)
    "--share-net", // Share network namespace (needed for dispatcher proxy)
    "--die-with-parent", // Kill sandbox if parent dies
    "--new-session", // Create new session (prevents terminal access)

    // === Filesystem setup ===
    // Read-only system directories
    "--ro-bind",
    "/usr",
    "/usr",
    "--ro-bind",
    "/bin",
    "/bin",
    "--ro-bind",
    "/lib",
    "/lib",

    // Conditionally bind lib64 if it exists
    ...(require("node:fs").existsSync("/lib64")
      ? ["--ro-bind", "/lib64", "/lib64"]
      : []),

    // Read-only /etc (for DNS, SSL certificates, etc.)
    "--ro-bind",
    "/etc",
    "/etc",

    // /proc filesystem
    "--proc",
    "/proc",

    // /dev with minimal devices
    "--dev",
    "/dev",

    // Tmpfs for /tmp (ephemeral, noexec, nosuid, nodev)
    "--tmpfs",
    "/tmp",

    // Read-write workspace
    "--bind",
    workspaceDir,
    "/workspace",

    // Set working directory
    "--chdir",
    "/workspace",

    // === Security options ===
    "--cap-drop",
    "ALL", // Drop all capabilities
    "--no-new-privs", // Prevent privilege escalation

    // === User/Group ===
    "--unshare-user", // Create user namespace
    "--uid",
    "65532", // Run as unprivileged UID (nobody)
    "--gid",
    "65532", // Run as unprivileged GID (nogroup)

    // === Environment variables ===
    "--clearenv", // Clear all environment variables
    ...Object.entries(envVars).flatMap(([key, value]) => [
      "--setenv",
      key,
      value,
    ]),

    // === Command to execute ===
    "--",
    ...workerCommand,
  ];

  return args;
}

/**
 * Check if bubblewrap is available on the system
 */
export async function checkBwrapAvailable(): Promise<boolean> {
  try {
    const { execSync } = require("node:child_process");
    execSync("which bwrap", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get bubblewrap version
 */
export async function getBwrapVersion(): Promise<string | null> {
  try {
    const { execSync } = require("node:child_process");
    const output = execSync("bwrap --version", { encoding: "utf-8" });
    return output.trim();
  } catch {
    return null;
  }
}
