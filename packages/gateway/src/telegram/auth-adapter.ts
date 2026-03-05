/**
 * Telegram Auth Adapter - Platform-specific authentication handling.
 * Groups: claim-based OAuth flow (same as WhatsApp/Slack).
 * DMs: Telegram web_app button with initData auth.
 */

import { createLogger } from "@lobu/core";
import type { Bot } from "grammy";
import type { AuthProvider, PlatformAuthAdapter } from "../auth/platform-auth";
import {
  type ClaimService,
  buildClaimSettingsUrl,
} from "../auth/settings/claim-service";
import { buildTelegramSettingsUrl } from "../auth/settings/token-service";

const logger = createLogger("telegram-auth-adapter");

/**
 * Telegram-specific authentication adapter.
 * Sends a settings link where users can configure Claude auth, MCP, network, etc.
 */
export class TelegramAuthAdapter implements PlatformAuthAdapter {
  private claimService?: ClaimService;

  constructor(
    private bot: Bot,
    _publicGatewayUrl: string
  ) {}

  setClaimService(service: ClaimService): void {
    this.claimService = service;
  }

  async sendAuthPrompt(
    userId: string,
    channelId: string,
    _conversationId: string,
    _providers: AuthProvider[],
    platformMetadata?: Record<string, unknown>
  ): Promise<void> {
    const chatId = Number(
      (platformMetadata?.chatId as string | number) || channelId
    );
    const isGroup = chatId < 0;

    // Groups use claim-based OAuth flow (url button in group)
    if (isGroup) {
      if (!this.claimService) {
        logger.error("ClaimService not available for group auth prompt");
        throw new Error("ClaimService not configured");
      }

      const claimCode = await this.claimService.createClaim(
        "telegram",
        String(chatId),
        userId
      );
      const settingsUrl = buildClaimSettingsUrl(claimCode);

      const message = [
        "<b>Setup Required</b>",
        "",
        "You need to add a model provider to use this bot.",
        "Tap the button below to configure.",
      ].join("\n");

      try {
        await this.bot.api.sendMessage(chatId, message, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Open Settings", url: settingsUrl }]],
          },
        });
        logger.info(
          { chatId, userId },
          "Sent claim-based settings link (group)"
        );
        return;
      } catch (error) {
        logger.error(
          { error, chatId },
          "Failed to send settings link in group"
        );
        throw error;
      }
    }

    // DMs use web_app button with Telegram initData auth
    const settingsUrl = buildTelegramSettingsUrl(String(chatId));

    // Telegram rejects inline keyboard URLs for localhost; fall back to plain text
    let includeButton = true;
    try {
      const u = new URL(settingsUrl);
      if (
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "::1"
      ) {
        includeButton = false;
      }
    } catch {
      includeButton = false;
    }

    const message = includeButton
      ? [
          "<b>Setup Required</b>",
          "",
          "You need to add a model provider to use this bot.",
          "Tap the button below to configure.",
        ].join("\n")
      : [
          "<b>Setup Required</b>",
          "",
          "You need to add a model provider to use this bot.",
          "Configure it using this link:",
          "",
          settingsUrl,
        ].join("\n");

    try {
      await this.bot.api.sendMessage(chatId, message, {
        parse_mode: "HTML",
        ...(includeButton && {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Open Settings", web_app: { url: settingsUrl } }],
            ],
          },
        }),
      });
      logger.info({ chatId, userId }, "Sent settings link (DM)");
    } catch (error) {
      logger.error({ error, chatId }, "Failed to send settings link");
      throw error;
    }
  }

  async sendAuthSuccess(
    userId: string,
    channelId: string,
    provider: AuthProvider
  ): Promise<void> {
    const chatId = Number(channelId);

    const message = [
      `<b>Authentication Successful!</b>`,
      "",
      `You're now connected to ${provider.name}.`,
      "",
      "Send your message again to continue.",
    ].join("\n");

    try {
      await this.bot.api.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
      logger.info(
        { channelId, userId, provider: provider.id },
        "Sent auth success message"
      );
    } catch (error) {
      logger.error({ error, channelId }, "Failed to send auth success message");
    }
  }

  async handleAuthResponse(
    _channelId: string,
    _userId: string,
    _text: string
  ): Promise<boolean> {
    return false;
  }

  hasPendingAuth(_channelId: string): boolean {
    return false;
  }
}
