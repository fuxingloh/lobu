## Core Package

Shared code between gateway and worker. Any interfaces, utilities, or types reused by both packages must live here.

### Module Responsibilities
- Type definitions and interfaces shared across packages
- Utility functions used by both gateway and worker
- Common error types and constants
- No platform-specific (Slack, Discord) or agent-specific (Claude) logic

### Dependencies
- Cannot depend on gateway or worker packages
- Keep dependencies minimal and focused on shared utilities
