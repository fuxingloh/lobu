# HR Assistant

An employee-facing HR bot that handles onboarding, PTO requests, and company policy questions.

## What It Does

- Answers questions about company policies (PTO, benefits, expenses)
- Guides new hires through onboarding checklists
- Processes PTO requests with proper formatting for HR systems
- Escalates sensitive topics (compensation, complaints, legal) to human HR

## Configuration

| File | Purpose |
|------|---------|
| `lobu.toml` | Groq provider, GitHub skill, filtered network access |
| `IDENTITY.md` | Friendly HR assistant persona |
| `SOUL.md` | Confidentiality rules, escalation triggers, tone guidelines |
| `USER.md` | Template — fill in your company name, policies, org structure |
| `skills/hr-policies.md` | PTO request format, onboarding checklist, policy Q&A patterns |

## Setup

1. Initialize a new project:
   ```bash
   lobu init my-hr-bot
   ```

2. Copy these files into your project:
   ```bash
   cp IDENTITY.md SOUL.md USER.md lobu.toml ../my-hr-bot/
   cp -r skills/ ../my-hr-bot/skills/
   ```

3. Edit `USER.md` with your company's details.

4. Add your provider API key to `.env`.

5. Start the bot:
   ```bash
   cd ../my-hr-bot
   docker compose up
   ```

## Customization

- **Add more policies**: Create additional `.md` files in `skills/` — they're auto-discovered.
- **Change the provider**: Edit `[[providers]]` in `lobu.toml` to use a different LLM.
- **Add platforms**: Uncomment or add platform sections in `lobu.toml`.
