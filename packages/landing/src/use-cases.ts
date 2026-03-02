import type { UseCase } from "./types";

export const useCases: UseCase[] = [
  {
    id: "setup",
    tabLabel: "Setup",
    title: "Get started in seconds",
    description:
      "Add your own AI provider keys through the settings page — no config files, no terminal.",
    settingsLabel: "Pick your AI provider and model",
    chatLabel: "Bot walks you through setup",
    messages: [
      {
        role: "user",
        text: "Hey, can you help me write a blog post?",
      },
      {
        role: "bot",
        text: "I'd love to help! First, I need an AI model to work with. Click below to set me up.",
        buttons: [{ label: "Open Settings", action: "settings" }],
      },
      {
        role: "user",
        text: "Ok I'm set up, help me write that blog post",
      },
      {
        role: "bot",
        text: "Great! Here's a draft outline:\n\n1. Hook with a compelling question\n2. Share your key insight with examples\n3. Close with a clear takeaway\n\nWant me to expand on any section?",
      },
    ],
  },
  {
    id: "packages",
    tabLabel: "Packages",
    title: "Reproducible environments",
    description:
      "Agents install system packages via Nix. Environments persist across sessions and are fully reproducible.",
    settingsLabel: "Manage installed system packages",
    chatLabel: "Agent requests tools it needs",
    messages: [
      {
        role: "user",
        text: "Convert this video to a gif and compress it under 5MB",
      },
      {
        role: "bot",
        text: "I need ffmpeg and gifsicle for that. Can I install them?",
        buttons: [{ label: "Approve Installation", action: "link" }],
      },
      {
        role: "user",
        text: "Go for it",
      },
      {
        role: "bot",
        text: "Installed ffmpeg and gifsicle via Nix. These will persist across sessions.\n\nConverting now — optimizing for size with gifsicle.",
      },
      {
        role: "bot",
        text: "Done! output.gif is 4.2MB (from 28MB video). Want me to adjust the frame rate or resolution?",
      },
    ],
  },
  {
    id: "mcp",
    tabLabel: "MCP",
    title: "Connect tools via MCP",
    description:
      "Add MCP servers for Gmail, GitHub, and more. Agents authenticate via OAuth — you control what they access.",
    settingsLabel: "Add and authenticate integrations",
    chatLabel: "Agent discovers and uses tools",
    messages: [
      {
        role: "user",
        text: "Summarize my unread emails",
      },
      {
        role: "bot",
        text: "I don't have email access yet. Let me check available integrations...",
      },
      {
        role: "bot",
        text: "Found a Gmail MCP server. You'll need to authorize access first.",
        buttons: [{ label: "Connect Gmail", action: "link" }],
      },
      {
        role: "user",
        text: "Done, go ahead",
      },
      {
        role: "bot",
        text: "Your inbox summary:\n\n• 3 from team — sprint planning\n• 1 from CEO — Q1 review deck\n• 2 newsletters (skipped)\n\nWant me to draft a reply to any of these?",
      },
    ],
  },
  {
    id: "schedules",
    tabLabel: "Schedules",
    title: "Set reminders and recurring tasks",
    description:
      "Agents can schedule one-off reminders or recurring cron jobs. They run autonomously at the specified time.",
    settingsLabel: "View and manage scheduled jobs",
    chatLabel: "Schedule tasks in natural language",
    messages: [
      {
        role: "user",
        text: "Every Monday at 9am, check my GitHub PRs and summarize what needs review",
      },
      {
        role: "bot",
        text: "I'll create a recurring schedule for that:\n\n⏰ Every Monday 9:00 AM\n📋 Check open PRs → summarize review queue\n\nApprove?",
        buttons: [{ label: "Approve Schedule", action: "link" }],
      },
      {
        role: "user",
        text: "Approved. Also remind me tomorrow at 2pm to review the Q1 deck",
      },
      {
        role: "bot",
        text: "One-off reminder set for tomorrow 2:00 PM.\n\nTwo schedules active:\n1. Weekly PR summary — Mon 9:00 AM (recurring)\n2. Review Q1 deck — Tomorrow 2:00 PM (one-off)\n\nI'll message you when each one triggers.",
      },
    ],
  },
  {
    id: "network",
    tabLabel: "Network",
    title: "Fine-grained network access",
    description:
      "Agents have zero internet by default. You allowlist specific domains — agents can't reach anything else.",
    settingsLabel: "Control which domains agents can reach",
    chatLabel: "Agent asks for network access",
    messages: [
      {
        role: "user",
        text: "Fetch the latest pricing from api.stripe.com and update our docs",
      },
      {
        role: "bot",
        text: "I can't reach api.stripe.com — it's not in my allowed domains.\n\nCurrent access:\n• api.github.com ✓\n• registry.npmjs.org ✓\n\nAdd api.stripe.com to my permissions?",
        buttons: [{ label: "Allow api.stripe.com", action: "link" }],
      },
      {
        role: "user",
        text: "Allowed, go ahead",
      },
      {
        role: "bot",
        text: "Got it. Fetched the latest pricing tiers from Stripe.\n\nUpdated docs/pricing.md with the new rates. Want me to commit and open a PR?",
      },
    ],
  },
];
