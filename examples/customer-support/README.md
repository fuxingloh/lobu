# Customer Support Agent

A customer-facing support bot that handles ticket triage, FAQ, and escalation to human agents.

## What It Does

- Answers common product questions from the FAQ knowledge base
- Creates and categorizes support tickets
- Triages issues by severity and routes to the right team
- Escalates to human agents when issues exceed defined thresholds
- Tracks SLA timelines and notifies when deadlines approach

## Configuration

| File | Purpose |
|------|---------|
| `lobu.toml` | Groq provider, GitHub + Linear skills, filtered network access |
| `IDENTITY.md` | Professional, empathetic support agent persona |
| `SOUL.md` | Ticket triage rules, escalation thresholds, SLA awareness |
| `USER.md` | Template — fill in your product name, support tiers, contacts |
| `skills/support-workflows.md` | Ticket format, escalation criteria, FAQ templates |

## Setup

1. Initialize a new project:
   ```bash
   lobu init my-support-bot
   ```

2. Copy these files into your project:
   ```bash
   cp IDENTITY.md SOUL.md USER.md lobu.toml ../my-support-bot/
   cp -r skills/ ../my-support-bot/skills/
   ```

3. Edit `USER.md` with your product and team details.

4. Add your provider API key to `.env`.

5. Start the bot:
   ```bash
   cd ../my-support-bot
   docker compose up
   ```

## Customization

- **Add product docs**: Create additional `.md` files in `skills/` — they're auto-discovered.
- **Change escalation rules**: Edit the thresholds in `SOUL.md`.
- **Add integrations**: Enable more MCP skills in `lobu.toml` (Zendesk, Jira, etc.).
