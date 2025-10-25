#!/bin/bash
set -e

echo "🚀 Setting up Peerbot development environment..."

# Fix permissions for node_modules volume
sudo chown -R node:node /workspace/node_modules || true

# Install dependencies as node user
echo "📦 Installing dependencies with Bun..."
sudo -u node bun install

# Build packages as node user
echo "🔨 Building packages..."
sudo -u node bash -c "cd packages/core && bun run build"
sudo -u node bash -c "cd packages/worker && bun run build"
sudo -u node bash -c "cd packages/gateway && bun run build"
sudo -u node bash -c "cd packages/orchestrator && bun run build"

# Setup shell environment
echo "🔧 Setting up shell environment..."
cat >> /home/node/.bashrc << 'EOF'

# Peerbot Development Environment
export PATH="/usr/local/bun/bin:$PATH"
export BUN_INSTALL="/usr/local/bun"
export PATH="/home/node/.bun/install/global/node_modules/.bin:$PATH"

# Docker aliases
alias d="docker"
alias dc="docker compose"
alias dps="docker ps"
EOF

# Setup bun global directory as node user
sudo -u node mkdir -p /home/node/.bun/install/global

# Setup Claude Code MCP configuration
echo "🤖 Setting up Claude Code MCP server..."
if [ -f "/workspace/packages/worker/mcp-config.json" ]; then
    mkdir -p /home/node/.claude
    cp /workspace/packages/worker/mcp-config.json /home/node/.claude/settings.mcp.json
    echo "✅ MCP server configuration deployed"
fi

# Setup environment files
echo "🔧 Setting up environment files..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
fi


# Create CLAUDE.md if it doesn't exist
if [ ! -f "CLAUDE.md" ]; then
    cat > CLAUDE.md << 'EOF'
# CLAUDE.md - DevContainer Environment

This is a development environment for the Peerbot running in a VS Code DevContainer.

## Available Commands

- `make dev` - Start Docker development mode with hot reload
- `make k3s-setup` - Setup k3s cluster (if needed)
- `make k3s-install` - Install the application to k3s

## Environment

- Bun package manager installed
- Claude Code CLI available globally
- Docker installed
- MCP Process Manager server configured

## MCP Server

The MCP process manager server is available with these tools:
- start_process
- stop_process
- restart_process
- get_process_status
- get_process_logs

EOF
    echo "✅ Created CLAUDE.md"
fi

# Display helpful information
echo ""
echo "✨ DevContainer setup complete!"
echo ""
echo "📚 Quick Start Guide:"
echo "  1. Configure your .env file with Slack and GitHub tokens"
echo "  2. Run 'make dev' to start development with Docker"
echo ""
echo "🛠️ Available Tools:"
echo "  - Claude Code CLI: $(claude --version 2>/dev/null || echo 'Run: bun install -g @anthropic-ai/claude-code')"
echo "  - Bun: $(bun --version)"
echo "  - Node: $(node --version)"
echo "  - Docker: $(docker --version 2>/dev/null || echo 'Not available')"
echo ""
echo "💡 Tips:"
echo "  - The MCP process manager is configured for Claude Code"
echo "  - Ports 3000-3002, 8080-8081 are forwarded"
echo ""