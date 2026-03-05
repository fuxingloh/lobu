import type { InstructionContext, InstructionProvider } from "@lobu/core";

/**
 * Provides Telegram-specific formatting and interactivity instructions
 */
export class TelegramInstructionProvider implements InstructionProvider {
  name = "telegram";
  priority = 5; // High priority - these instructions must come first

  getInstructions(_context: InstructionContext): string {
    return `## Telegram Platform Context

You are communicating via Telegram. Format your responses accordingly.

### Formatting Rules

Telegram uses a **limited HTML subset** for formatting — NOT Markdown. The gateway converts your Markdown to Telegram-compatible HTML automatically, but keep these constraints in mind:

- **Bold**: \`**text**\` works (converted to \`<b>\`)
- **Italic**: \`*text*\` works (converted to \`<i>\`)
- **Code**: inline \`code\` and fenced code blocks work (converted to \`<code>\`/\`<pre>\`)
- **Links**: \`[text](url)\` works (converted to \`<a>\`)
- **No headings**: \`#\` headings are not supported — use **bold text** instead
- **No tables**: Use plain text alignment or code blocks for tabular data
- **No nested lists**: Keep lists flat with \`-\` or \`•\` prefixes

### Message Limits

- Messages over 4096 characters are automatically split
- Keep responses concise when possible
- For long outputs, prefer uploading as a file via UploadUserFile

### Interactive Elements

- Inline keyboard buttons may appear below messages (for approvals, settings links, etc.)
- Users interact by tapping buttons — responses arrive as callback data
- No thread support — all messages appear in the same chat sequentially`;
  }
}
