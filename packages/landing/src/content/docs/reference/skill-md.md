---
title: SKILL.md Reference
description: Reference for Lobu skill files and supported frontmatter.
sidebar:
  order: 2
---

`SKILL.md` is the skill file format used by Lobu. It combines optional YAML frontmatter with markdown instructions.

Use it for:

- Skill metadata such as `name` and `description`
- Capability declarations such as MCP servers, packages, and network domains
- Instruction text that is injected into the agent's system prompt when the skill is active

Tool policy does **not** live in `SKILL.md`. Configure that in [`lobu.toml`](/reference/lobu-toml/) under `[agents.<id>.tools]`; see [Tool Policy](/guides/tool-policy/).

## Where Skills Live

Lobu discovers local skills from:

- `skills/<name>/SKILL.md` for shared project-level skills
- `agents/<agent>/skills/<name>/SKILL.md` for agent-specific skills

If the file exists, Lobu loads it automatically at startup.

## Minimal example

```markdown
---
name: PDF Processing
description: Extract text and metadata from PDF files
---

# PDF Processing

When asked to work with PDFs, use `pdftotext` first.
```

## Full example

```markdown
---
name: My Skill
description: What this skill does

mcpServers:
  my-mcp:
    url: https://my-mcp.example.com
    type: sse

nixPackages:
  - jq
  - ripgrep
  - pandoc

network:
  allow:
    - api.example.com
---

# My Skill

Instructions and behavioral rules for the agent go here as Markdown.
The body acts as a system prompt extension.
```

## Frontmatter Reference

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name shown in settings and search results |
| `description` | string | Short summary for the skill registry |
| `mcpServers` | object | MCP server connections keyed by server ID |
| `mcpServers.<id>.url` | string | Server endpoint URL |
| `mcpServers.<id>.type` | `sse` \| `stdio` | Transport type |
| `mcpServers.<id>.command` | string | Command for stdio MCP servers |
| `mcpServers.<id>.args` | string[] | Arguments for stdio MCP servers |
| `nixPackages` | string[] | System packages to install in the worker |
| `network.allow` | string[] | Domains the worker sandbox can reach |
| `network.deny` | string[] | Domains to block |

## Markdown Body

The markdown body after the frontmatter is appended to the agent's prompt when the skill is active. Use it for workflows, rules, conventions, and domain-specific instructions.

## Notes

- `SKILL.md` frontmatter does not configure tool approval or `pre_approved` MCP tools.
- For MCP servers that should live directly on the agent rather than inside a skill, configure them in [`lobu.toml`](/reference/lobu-toml/).

## Related Docs

- [Skills](/getting-started/skills/)
- [Tool Policy](/guides/tool-policy/)
- [`lobu.toml` Reference](/reference/lobu-toml/)
