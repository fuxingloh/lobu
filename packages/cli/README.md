# @peerbot/cli

CLI tool for deploying and managing Peerbot across multiple platforms.

## Installation

### Via create-peerbot (Recommended)

```bash
npx create-peerbot my-slack-bot
cd my-slack-bot
npm run dev
```

### Standalone

```bash
npm install -g @peerbot/cli

mkdir my-peerbot
cd my-peerbot
peerbot init
npm install
npm run dev
```

## Worker Deployment Options

Peerbot supports two deployment patterns for workers:

### Option 1: Base Image (Day 0 - Quick Start)

**Best for:** Beginners, tutorials, quick prototypes

```dockerfile
# Extends our curated base image
FROM buremba/peerbot-worker-base:0.1.0

# Add your customizations
RUN pip install pandas
RUN apt-get install postgresql-client
```

**Pros:**
- ✅ Turnkey experience - just works
- ✅ All dependencies pre-installed
- ✅ Predictable environment

**Cons:**
- ❌ Stuck with our base OS choice
- ❌ May not meet compliance requirements

---

### Option 2: Package Installation (Day 2 - Advanced)

**Best for:** Enterprise, compliance-heavy environments, custom requirements

```dockerfile
# Use YOUR approved base image
FROM company-registry/ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs npm git docker.io python3 curl

# Install Claude CLI
RUN curl -L https://claude.ai/install.sh | sh

# Install Peerbot worker as a package
RUN npm install -g @peerbot/worker@^0.1.0

# Your customizations
COPY ./scripts /workspace/scripts

CMD ["peerbot-worker"]
```

**Pros:**
- ✅ Full control over base OS
- ✅ Use company-approved images
- ✅ Smaller images (Alpine, Distroless)
- ✅ Meet security/compliance requirements

**Cons:**
- ❌ More setup required
- ❌ Must install system dependencies yourself

See [Worker Package Documentation](../worker/docs/custom-base-image.md) for details.

---

## Commands

### `peerbot init`

Initialize a new Peerbot project in the current directory.

**Interactive prompts:**
- Deployment target (Docker, Kubernetes, etc.)
- **Worker mode:** Base image vs Package installation
- Slack credentials
- Anthropic API key
- Public gateway URL (for OAuth)

**Generates:**
- `package.json` with npm scripts
- `peerbot.config.js` - Core configuration
- `.env` - Credentials
- `Dockerfile.worker` - Worker customization
- `.gitignore`, `README.md`

### `peerbot dev`

Start development server using Docker Compose.

**Features:**
- Automatic dependency checks
- Worker image building
- File watching for Dockerfile changes
- Hot reload on worker customization

### `peerbot logs [service]`

Stream logs from running services.

```bash
peerbot logs           # All services
peerbot logs gateway   # Gateway only
peerbot logs redis     # Redis only
```

### `peerbot down`

Stop all running services.

### `peerbot rebuild`

Rebuild worker image and restart gateway.

### `peerbot deploy` (Coming Soon)

Deploy to production platforms:
- Kubernetes
- AWS ECS
- Cloudflare Containers
- GCP Cloud Run

## Configuration

### peerbot.config.js

```javascript
module.exports = {
  worker: {
    customization: 'dockerfile',  // 'base', 'dockerfile', or 'image'
    baseImage: 'buremba/peerbot-worker-base:0.1.0',

    resources: {
      cpu: '1000m',
      memory: '2Gi',
    },

    environment: {
      // Custom env vars for workers
    },

    volumes: [
      // Volume mounts (Docker/K8s)
    ],
  },

  gateway: {
    port: 8080,
    publicUrl: process.env.PEERBOT_PUBLIC_GATEWAY_URL,
  },

  credentials: {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  },

  targets: {
    docker: { /* Docker-specific config */ },
    kubernetes: { /* K8s-specific config */ },
    cloudflare: { /* Cloudflare-specific config */ },
  },
};
```

### Dockerfile.worker (Base Image Mode)

```dockerfile
FROM buremba/peerbot-worker-base:0.1.0

# Add system packages
RUN apt-get update && apt-get install -y postgresql-client

# Add Python packages
RUN pip install pandas matplotlib

# Add Node.js packages
RUN bun add @octokit/rest

# Copy custom scripts
COPY ./scripts /workspace/scripts
```

**The same Dockerfile works across all container platforms!** (Docker, Kubernetes, ECS, Cloudflare Containers, etc.)

### Dockerfile.worker (Package Mode)

```dockerfile
# Bring your own base
FROM node:20-alpine

# Install required system dependencies
RUN apk add --no-cache git docker-cli python3 py3-pip curl

# Install Claude CLI
RUN curl -L https://claude.ai/install.sh | sh

# Install worker package
RUN npm install -g @peerbot/worker@^0.1.0

# Your customizations
RUN pip3 install pandas matplotlib

CMD ["peerbot-worker"]
```

## Development Workflow

```bash
# 1. Create project
npx create-peerbot my-bot
cd my-bot

# 2. Choose worker mode during init
#    - Base image (recommended)
#    - Package installation (advanced)

# 3. Customize worker (optional)
# Edit Dockerfile.worker

# 4. Start development
npm run dev

# File watcher detects Dockerfile changes and auto-rebuilds!

# 5. View logs
npm run logs

# 6. Stop
npm run down
```

## Version Locking

The CLI version locks to base image versions:

- CLI `0.1.0` → `buremba/peerbot-worker-base:0.1.0`
- CLI `0.2.0` → `buremba/peerbot-worker-base:0.2.0`

This ensures compatibility between CLI and runtime images.

## Platform Support

| Platform | Status | Provider |
|----------|--------|----------|
| Docker (local) | ✅ Available | DockerProvider |
| Kubernetes | 🚧 Coming Soon | KubernetesProvider |
| AWS ECS | 🚧 Coming Soon | ECSProvider |
| Cloudflare Containers | 🚧 Coming Soon | CloudflareProvider |
| GCP Cloud Run | 🚧 Coming Soon | CloudRunProvider |
| Azure Container Apps | 🚧 Coming Soon | AzureProvider |

## Distribution Strategy

Peerbot uses a dual distribution pattern:

**Day 0 (Quick Start):**
- Use `buremba/peerbot-worker-base` Docker image
- Extend with Dockerfile
- Perfect for learning, prototypes

**Day 2+ (Production):**
- Install `@peerbot/worker` npm package
- Use your own base image
- Perfect for enterprise, compliance

## Published Artifacts

**Docker Hub:**
```bash
# For production (gateway)
docker pull buremba/peerbot-gateway:0.1.0

# For quick start (extend this)
docker pull buremba/peerbot-worker-base:0.1.0

# For production workers
docker pull buremba/peerbot-worker:0.1.0
```

**NPM Registry:**
```bash
# CLI tool
npm install -g @peerbot/cli@0.1.0

# Scaffolding tool
npx create-peerbot@0.1.0 my-bot

# Worker runtime (for custom base images)
npm install -g @peerbot/worker@0.1.0
```

## Architecture

```
User creates project
        ↓
npx create-peerbot my-bot
        ↓
Choose: Base image or Package?
        ↓
┌───────────────┴────────────────┐
│ Base Image Mode                │ Package Mode
│                                 │
│ FROM peerbot-worker-base       │ FROM your-company/base
│ RUN pip install pandas         │ RUN npm install -g @peerbot/worker
│                                 │ RUN pip install pandas
└───────────────┬────────────────┘
                ↓
        User runs: npm run dev
                ↓
        DockerProvider.build()
                ↓
        DockerProvider.render() → docker-compose.yml
                ↓
        DockerProvider.apply() → docker compose up
                ↓
        Gateway spawns workers dynamically
```

## Contributing

To add a new deployment provider:

1. Create `src/providers/my-provider.ts`
2. Extend `BaseProvider`
3. Implement required methods
4. Register in `src/providers/index.ts`

Example:

```typescript
export class MyProvider extends BaseProvider {
  async build(config: PeerbotConfig): Promise<void> {
    // Build worker image
  }

  async render(config: PeerbotConfig): Promise<void> {
    // Generate platform manifests
  }

  async apply(config: PeerbotConfig): Promise<void> {
    // Deploy to platform
  }

  // ... implement other methods
}
```

## License

MIT
