# Unified Settings Page

Merge `/agent-selector` and `/settings` into a single mobile-first page.

## Current State
- `/agent-selector?token=...`: Pick which agent handles a chat (token scoped to userId+platform+channel)
- `/settings?token=...`: Configure the selected agent (token scoped to agentId+userId+platform)

## Proposed
Single page at `/settings?token=...` that combines agent selection + configuration.

## Layout (mobile-first)
```
┌─────────────────────────┐
│ [Agent ▾] [+ New]       │  agent picker
│ verify-agent             │
│ claude-sonnet-4 · 2 MCPs │  summary line
├─────────────────────────┤
│ ▸ Provider & Model       │
│ ▸ Instructions           │  collapsible accordion
│ ▸ MCP Servers            │
│ ▸ Network Access         │
│ ▸ Git Repository         │
├─────────────────────────┤
│ Delete Agent             │  danger zone
└─────────────────────────┘
```

## Key Changes
- Agent switcher at top: dropdown/pills showing all user's agents, "+" to create new
- Switching agent updates settings in-place (no navigation)
- Switching agent rebinds the Telegram/Slack chat to the selected agent
- Inline agent creation (name field + create button)
- Delete agent at bottom

## Auth/Token Change
- Token must carry userId + platform + channelId (not agentId) so page can list all agents
- Agent CRUD uses existing `/api/v1/agent-management/agents/*` endpoints

## Routes to Remove
- `/agent-selector` page and route (merged into `/settings`)
- `generateAgentSelectorToken()` (replaced by settings token)
