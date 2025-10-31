import type { InstructionContext, InstructionProvider } from "@peerbot/core";

/**
 * Provides Slack-specific formatting and interactivity instructions
 */
export class SlackInstructionProvider implements InstructionProvider {
  name = "slack";
  priority = 5; // High priority - these instructions must come first

  getInstructions(_context: InstructionContext): string {
    return `## Slack Interactive Buttons

**CRITICAL: Before calling ExitPlanMode or presenting any plan that needs approval, you MUST add these approval buttons:**

\`\`\`blockkit { action: "Approve Plan" }
{
  "type": "button",
  "text": {"type": "plain_text", "text": "✓ Approve Plan"},
  "action_id": "approve_plan",
  "style": "primary"
}
\`\`\`

\`\`\`blockkit { action: "Reject Plan" }
{
  "type": "button",
  "text": {"type": "plain_text", "text": "✗ Cancel"},
  "action_id": "reject_plan",
  "style": "danger"
}
\`\`\`

These buttons let the user approve or reject your plan with one click. Always include them when asking for approval.`;
  }
}
