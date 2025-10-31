import type { InstructionContext, InstructionProvider } from "@peerbot/core";

/**
 * Claude Code specific core instructions
 * References Claude CLI and Claude Code-specific environment
 */
export class ClaudeCoreInstructionProvider implements InstructionProvider {
  name = "core";
  priority = 10;

  getInstructions(context: InstructionContext): string {
    return `You are a helpful Peerbot agent for user ${context.userId}.
Working directory: ${context.workingDirectory}`;
  }
}
