# create-peerbot

Scaffolding tool for creating new Peerbot projects.

## Usage

Create a new Peerbot project with one command:

```bash
npx create-peerbot my-slack-bot
```

This will:
1. Create a new directory `./my-slack-bot/`
2. Install `@peerbot/cli` as a dependency
3. Run interactive setup to configure your bot
4. Generate all necessary configuration files

## What Gets Created

```
my-slack-bot/
├── package.json           # With npm scripts (dev, logs, down, etc.)
├── peerbot.config.js      # Core configuration
├── .env                   # Credentials (gitignored)
├── Dockerfile.worker      # Worker customization (optional)
├── .gitignore
├── README.md
└── .peerbot/              # Generated manifests (gitignored)
```

## Next Steps

After running `create-peerbot`:

```bash
cd my-slack-bot
npm run dev
```

## Available Commands

- `npm run dev` - Start development server
- `npm run logs` - View logs
- `npm run down` - Stop services
- `npm run rebuild` - Rebuild worker image
- `npm run deploy` - Deploy to production

## Package Manager Support

`create-peerbot` automatically detects your preferred package manager:

- **Bun**: If `bun.lockb` exists or `bun` is available
- **pnpm**: If `pnpm-lock.yaml` exists
- **Yarn**: If `yarn.lock` exists
- **npm**: Default fallback

## Architecture

This package is the scaffolding tool (like `create-react-app`). It delegates to `@peerbot/cli` for actual runtime operations.

See [@peerbot/cli](../cli/README.md) for more details on the CLI tool.
