## Worker Package

Platform-agnostic worker that executes agent conversations. Communicates only with gateway and agent. 

### Module Structure
- **`src/claude/`**: Claude CLI-specific logic. All Claude integration code must live here.
- **`src/gateway/`**: Gateway communication layer (platform-agnostic).
- **`src/mcp/`**: MCP server management and tunneling.
- **`src/core/`**: Base worker implementation (platform and agent agnostic).

### Module Responsibilities
- Execute agent conversations via Claude CLI
- Manage MCP server lifecycle and tunneling
- Stream results back to gateway
- No platform knowledge (Slack, Discord, etc.)
- No direct communication with any system except gateway and agent

### Dependencies
- `packages/core` for shared types and utilities
- Claude CLI binary for agent execution
- Gateway for all external communication
