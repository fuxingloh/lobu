/**
 * Telegram block builder.
 * Extracts settings link buttons from markdown and converts content
 * to Telegram HTML with an optional inline keyboard for native buttons.
 */

import {
  extractSettingsLinkButtons,
  type LinkButton,
} from "../../platform/link-buttons";
import { convertMarkdownToTelegramHtml } from "./markdown";

export type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; web_app: { url: string } };
export type InlineKeyboard = { inline_keyboard: InlineKeyboardButton[][] };

export interface TelegramBlockResult {
  html: string;
  replyMarkup?: InlineKeyboard;
}

export class TelegramBlockBuilder {
  /**
   * Build Telegram HTML content with optional inline keyboard buttons
   * extracted from settings links in the markdown.
   *
   * @param isGroup - If true, uses url buttons instead of web_app (web_app is private-chat only).
   */
  build(markdown: string, isGroup = false): TelegramBlockResult {
    const { processedContent, linkButtons } =
      extractSettingsLinkButtons(markdown);

    const html = convertMarkdownToTelegramHtml(processedContent);
    const replyMarkup = this.buildReplyMarkup(linkButtons, isGroup);

    return { html, replyMarkup };
  }

  private buildReplyMarkup(
    buttons: LinkButton[],
    isGroup: boolean
  ): InlineKeyboard | undefined {
    if (buttons.length === 0) return undefined;

    return {
      inline_keyboard: buttons.map((btn) => [
        isGroup
          ? { text: btn.text, url: btn.url }
          : { text: btn.text, web_app: { url: btn.url } },
      ]),
    };
  }
}
