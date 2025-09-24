# Worker Agent Instructions

## Package Overview
The worker is the core execution environment that runs Claude Code sessions and processes user requests. It manages persistent Claude CLI sessions, processes tasks from queues, and communicates results back to the dispatcher via Slack.

## Core Responsibilities

### Claude Session Management
- **Session Persistence**: Maintains long-running Claude CLI sessions with workspace persistence
- **Command Execution**: Executes Claude Code commands and captures responses
- **Workspace Management**: Manages persistent file systems and working directories
- **Session Recovery**: Handles session restoration and resume functionality

### Task Processing
- **Queue Consumer**: Consumes tasks from PostgreSQL queues sent by dispatcher
- **Response Generation**: Processes user prompts and generates Claude responses
- **Progress Updates**: Provides real-time updates to users via Slack threading
- **Error Handling**: Manages execution errors and provides meaningful feedback

### Process Integration
- **MCP Server**: Integrates with Model Context Protocol servers for enhanced capabilities
- **Process Manager**: Manages subprocess execution and resource cleanup
- **Workspace Isolation**: Ensures proper isolation between different user sessions

## Key Components

### Core Execution (`src/core/`)
- `claude-session-executor.ts`: Manages Claude CLI session execution
- `session-manager.ts`: Handles session lifecycle and persistence
- `prompt-generation.ts`: Generates prompts for Claude based on user input
- `types.ts`: Core type definitions for worker operations

### Queue Integration (`src/queue/`, `src/task-queue-integration.ts`)
- `queue-consumer.ts`: Consumes tasks from PostgreSQL queues
- `task-queue-integration.ts`: Integrates with queue system for progress updates

### Worker Types
- `claude-worker.ts`: Basic Claude worker implementation
- `persistent-task-worker.ts`: Queue-based persistent worker with session management

### Process Management (`src/process-manager-integration.ts`, `mcp/`)
- MCP server integration for enhanced tool capabilities
- Process manager for subprocess execution and cleanup

## Implementation Guidelines

### Session Management
- Use persistent volumes for workspace data to survive container restarts
- Implement proper session cleanup on worker termination
- Handle session recovery gracefully when resuming conversations
- Manage multiple concurrent sessions per worker efficiently

### Task Processing
- Process queue messages reliably with proper error handling
- Provide progressive updates to users during long-running operations
- Handle timeouts and cancellation requests appropriately
- Implement proper retry mechanisms for transient failures

### Claude Integration
- Use Claude Code CLI with appropriate tool configurations
- Handle streaming responses and real-time feedback
- Manage authentication and API key rotation
- Implement proper rate limiting and quota management

### Resource Management
- Monitor memory and CPU usage during task execution
- Implement proper cleanup of temporary files and processes
- Handle resource exhaustion gracefully
- Use appropriate resource limits in container environments

### Error Handling
- Capture and format execution errors for user consumption
- Distinguish between user errors and system failures
- Provide actionable error messages and suggestions
- Log errors with proper context for debugging

### Security Considerations
- Validate user input before execution
- Implement proper sandboxing for code execution
- Handle sensitive data (API keys, tokens) securely
- Audit user actions and system access

## Environment Dependencies
- `USER_ID`: Slack user ID for session association
- `TARGET_THREAD_ID`: Optional thread ID for thread-specific workers
- `WORKSPACE_DIR`: Persistent workspace directory path
- `DATABASE_URL`: PostgreSQL connection for queue operations
- `ANTHROPIC_API_KEY`: Claude API access key
- `ALLOWED_TOOLS`: Comma-separated list of allowed Claude tools

## Workspace Management
- Each worker gets a persistent volume mounted at `/workspace`
- Workspace directories are organized by thread ID for isolation
- Claude CLI automatically resumes sessions using `--resume` flag
- File persistence ensures continuity across container restarts

## Testing Considerations
- Test Claude session creation and restoration
- Verify task processing with various input types
- Test error handling and recovery scenarios
- Validate workspace persistence and isolation
- Test resource cleanup and garbage collection
- Mock Claude API responses for unit testing