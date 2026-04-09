---
title: Agent Settings
description: What can be configured per agent and how those settings affect runtime.
---

Agent settings control behavior of each worker session.

## What You Can Configure

- **Provider and model** — `model`, `modelSelection` (auto/pinned), `providerModelPreferences`, `installedProviders`
- **Allowed/disallowed tools** — `toolsConfig`
- **Skills/plugins and MCP server config** — `skillsConfig`, `mcpServers`, `pluginsConfig`
- **Permission grants (network domains)** — `networkConfig`
- **Agent prompts** — `identityMd`, `soulMd`, `userMd`
- **Auth profiles** — `authProfiles` for multi-provider credential management
- **Worker environment** — `nixConfig` for Nix packages
- **Verbose logging** — `verboseLogging` to show tool calls and reasoning
- **Template inheritance** — `templateAgentId` for settings fallback from a template agent

## How Settings Apply

- Gateway is the source of truth for settings.
- Worker fetches session context from gateway before execution.
- Tool policy is applied before tools are exposed to the model.

## Practical Guidance

- Keep tool permissions minimal.
- Add only required domains/grants.
- Prefer explicit permission grants over broad access.

## Memory Plugin Defaults

Lobu agents can persist memories across conversations. The memory system is pluggable — you choose the backend during `lobu init` or by setting the `MEMORY_URL` environment variable.

### Filesystem memory (`@openclaw/native-memory`)

The default when `MEMORY_URL` is not set. Memories are stored as files on the worker's local disk inside its workspace directory. In Kubernetes this is a per-thread PersistentVolumeClaim mounted at `/workspace`; in Docker it's a host directory at `./workspaces/{threadId}/`.

Filesystem memory is simple and zero-config — it works out of the box with no external services. The trade-off is that memories are scoped to a single thread's workspace and aren't shared across threads or agents.

### Owletto memory (`@lobu/owletto-openclaw`)

Activated when `MEMORY_URL` is set (e.g. during `lobu init` when you select Owletto Cloud, Owletto Local, or a custom Owletto URL). Instead of writing files locally, the agent calls Owletto's MCP server to store and retrieve memories. The gateway proxies these calls through `/mcp/owletto` and automatically configures the endpoint and auth URL — no manual wiring needed.

Owletto memory provides cross-session persistence, structured knowledge management (watchers, connections, knowledge graphs), and the ability to share memory across agents.

### How `lobu init` configures memory

During `lobu init`, the Memory prompt offers four choices:

| Choice | What happens |
|---|---|
| **None (filesystem memory)** | `MEMORY_URL` is left unset. Gateway defaults to `@openclaw/native-memory`. |
| **Owletto Cloud** | `MEMORY_URL` is set to `https://owletto.com/mcp`. |
| **Owletto Local** | An Owletto container is added to your compose file and `MEMORY_URL` is set to `http://owletto:8787/mcp`. |
| **Custom URL** | `MEMORY_URL` is set to your provided URL. |

### Fallback behavior

The gateway checks whether each plugin package is actually installed before using it. If the preferred plugin isn't available, it falls back gracefully:

1. `MEMORY_URL` set + `@lobu/owletto-openclaw` installed → **Owletto**
2. `MEMORY_URL` set + Owletto not installed + `@openclaw/native-memory` installed → **filesystem fallback**
3. `MEMORY_URL` unset + `@openclaw/native-memory` installed → **filesystem**
4. Neither plugin installed → **no memory**

### Per-agent override

You can override the default for a specific agent by setting `pluginsConfig` in agent settings:

```json
{
  "pluginsConfig": {
    "plugins": [
      {
        "source": "@lobu/owletto-openclaw",
        "slot": "memory",
        "enabled": true
      }
    ]
  }
}
```

Or switch to native memory explicitly:

```json
{
  "pluginsConfig": {
    "plugins": [
      {
        "source": "@openclaw/native-memory",
        "slot": "memory",
        "enabled": true
      }
    ]
  }
}
```

Set `"enabled": false` to disable memory entirely for an agent.
