# Lobu Examples

Sample agent projects showing how to configure Lobu for different use cases.

## Single-Agent Examples

Each directory contains a standalone agent with its own `lobu.toml`:

| Example | Description | Key Features |
|---------|-------------|--------------|
| [hr-assistant](./hr-assistant/) | Employee-facing HR bot for onboarding, PTO, and policy Q&A | Confidentiality rules, escalation to human HR, PTO tracking |
| [customer-support](./customer-support/) | Customer-facing support bot for tickets, FAQ, and escalation | Ticket triage, SLA awareness, Linear integration |

## Multi-Agent Example

The root `lobu.toml` demonstrates how to define multiple agents in a single project:

```
examples/
  lobu.toml                    # [agents.*] tables for both agents
  skills/                      # shared skills (all agents get these)
    company-policies.md
  agents/
    hr-assistant/              # agent-specific content
      IDENTITY.md
      SOUL.md
      USER.md
      skills/
        hr-policies.md
    customer-support/
      IDENTITY.md
      SOUL.md
      USER.md
      skills/
        support-workflows.md
```

Shared skills in `skills/` are available to all agents. Agent-specific skills in `agents/{name}/skills/` are merged with shared skills (agent-specific files override shared files with the same name).

## Getting Started

### Single Agent

Copy an example into a new project:

```bash
lobu init my-agent
cp examples/hr-assistant/IDENTITY.md my-agent/
cp examples/hr-assistant/SOUL.md my-agent/
cp examples/hr-assistant/lobu.toml my-agent/
cp -r examples/hr-assistant/skills/ my-agent/skills/
```

### Multi-Agent

Use the multi-agent `lobu.toml` as a template for projects with multiple agents:

```bash
lobu init my-project
cp examples/lobu.toml my-project/
cp -r examples/agents/ my-project/agents/
cp -r examples/skills/ my-project/skills/
```

Or start from scratch with `lobu init` and use these examples as reference for writing your own configuration.
