// Export base error class
export { BaseError } from "./base-error";

// Export orchestrator errors
export { OrchestratorError, ErrorCode } from "./orchestrator-errors";

// Export worker errors
export {
  WorkerError,
  WorkspaceError,
  SlackError,
  SessionError,
  CoreWorkerError,
} from "./worker-errors";

// Dispatcher errors - GitHub-specific errors moved to GitHub module
