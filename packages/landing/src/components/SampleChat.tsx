/**
 * Platform-agnostic chat window component.
 * Pass a `theme` prop with platform-specific colors to match any messaging
 * platform's color scheme (Telegram, Slack, Discord, WhatsApp, etc).
 *
 * Two ways to render content:
 *   1. Pass a `useCase` prop for the default message list rendering.
 *   2. Pass `children` to fully control the message area (use the exported
 *      ChatBubble component for individual messages).
 */

import type { ChatMessage, InlineButton, UseCase } from "../types";

export interface ChatTheme {
  /** Outer window background and border */
  bg: string;
  border: string;
  /** Bot (incoming) message bubble */
  botBubbleBg: string;
  botBubbleBorder: string;
  /** User (outgoing) message bubble */
  userBubbleBg: string;
  userBubbleBorder: string;
  /** Inline action button style */
  buttonColor: string;
  buttonBorder: string;
  /** Glow/shadow color used on button hover (should match buttonColor with low alpha) */
  buttonGlow: string;
}

// --- Preset themes ---

export const TELEGRAM_THEME: ChatTheme = {
  bg: "#0b0c0f",
  border: "#23262d",
  botBubbleBg: "#171a20",
  botBubbleBorder: "#2a2f38",
  userBubbleBg: "rgba(var(--color-tg-accent-rgb), 0.18)",
  userBubbleBorder: "rgba(var(--color-tg-accent-rgb), 0.35)",
  buttonColor: "#ff8a3d",
  buttonBorder: "#a74f20",
  buttonGlow: "rgba(249, 115, 22, 0.3)",
};

export const SLACK_THEME: ChatTheme = {
  bg: "#1a1d21",
  border: "#2c2f33",
  botBubbleBg: "#222529",
  botBubbleBorder: "#32353a",
  userBubbleBg: "rgba(54, 197, 171, 0.16)",
  userBubbleBorder: "rgba(54, 197, 171, 0.35)",
  buttonColor: "#36c5ab",
  buttonBorder: "#1f6d5f",
  buttonGlow: "rgba(54, 197, 171, 0.3)",
};

export const DISCORD_THEME: ChatTheme = {
  bg: "#313338",
  border: "#3f4147",
  botBubbleBg: "#383a40",
  botBubbleBorder: "#4a4d55",
  userBubbleBg: "rgba(88, 101, 242, 0.2)",
  userBubbleBorder: "rgba(88, 101, 242, 0.45)",
  buttonColor: "#a5b0ff",
  buttonBorder: "#4752c4",
  buttonGlow: "rgba(88, 101, 242, 0.35)",
};

export const WHATSAPP_THEME: ChatTheme = {
  bg: "#0b141a",
  border: "#1f2c33",
  botBubbleBg: "#1f2c33",
  botBubbleBorder: "#2a3942",
  userBubbleBg: "rgba(37, 211, 102, 0.18)",
  userBubbleBorder: "rgba(37, 211, 102, 0.4)",
  buttonColor: "#25d366",
  buttonBorder: "#0f6b33",
  buttonGlow: "rgba(37, 211, 102, 0.3)",
};

export const TEAMS_THEME: ChatTheme = {
  bg: "#1f1f1f",
  border: "#333333",
  botBubbleBg: "#292929",
  botBubbleBorder: "#3a3a3a",
  userBubbleBg: "rgba(98, 100, 167, 0.22)",
  userBubbleBorder: "rgba(98, 100, 167, 0.45)",
  buttonColor: "#9ea2ff",
  buttonBorder: "#4a4d8a",
  buttonGlow: "rgba(98, 100, 167, 0.3)",
};

export const GCHAT_THEME: ChatTheme = {
  bg: "#1f1f1f",
  border: "#303134",
  botBubbleBg: "#2a2b2e",
  botBubbleBorder: "#3c3d40",
  userBubbleBg: "rgba(138, 180, 248, 0.2)",
  userBubbleBorder: "rgba(138, 180, 248, 0.42)",
  buttonColor: "#8ab4f8",
  buttonBorder: "#3f5a8e",
  buttonGlow: "rgba(138, 180, 248, 0.3)",
};

// --- ChatBubble (exported for custom compositions) ---

interface ChatBubbleProps {
  role: "user" | "bot";
  text: string;
  buttons?: InlineButton[];
  showTimestamp?: boolean;
  theme?: ChatTheme;
  onButtonHover?: (hovering: boolean) => void;
}

export function ChatBubble({
  role,
  text,
  buttons,
  showTimestamp = false,
  theme = TELEGRAM_THEME,
  onButtonHover,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div class={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div class="max-w-[75%]">
        <div
          class="px-2.5 py-1.5 text-[13px] leading-[1.35] whitespace-pre-wrap rounded-[12px] relative"
          style={{
            backgroundColor: isUser ? theme.userBubbleBg : theme.botBubbleBg,
            color: "var(--color-page-text-muted)",
            border: `1px solid ${
              isUser ? theme.userBubbleBorder : theme.botBubbleBorder
            }`,
            paddingRight: showTimestamp ? "38px" : undefined,
            paddingBottom: showTimestamp ? "4px" : undefined,
          }}
        >
          {text}
          {showTimestamp ? (
            <span class="text-[10px] absolute bottom-[3px] right-[8px] text-[#8f96a3] leading-none">
              12:01
            </span>
          ) : null}
        </div>

        {buttons?.map((btn) => (
          <button
            type="button"
            key={btn.label}
            class="mt-1 h-7 px-2.5 inline-flex items-center justify-center rounded-full text-[12px] font-semibold cursor-pointer chat-action-btn"
            style={{
              backgroundColor: "transparent",
              color: theme.buttonColor,
              border: `1px solid ${theme.buttonBorder}`,
              ["--chat-btn-glow" as string]: theme.buttonGlow,
            }}
            onMouseEnter={() => onButtonHover?.(true)}
            onMouseLeave={() => onButtonHover?.(false)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- SampleChat ---

interface SampleChatProps {
  /** Bot identity shown in the header. Falls back to useCase values if omitted. */
  botName?: string;
  botInitial?: string;
  botColor?: string;
  /** Convenience: render a UseCase's messages (also supplies bot identity). */
  useCase?: UseCase;
  /** Theme colors for bubbles, buttons, and window chrome. */
  theme?: ChatTheme;
  /** Custom content for the message area. Overrides useCase messages. */
  children?: preact.ComponentChildren;
  onButtonHover?: (hovering: boolean) => void;
}

export function SampleChat({
  botName,
  botInitial,
  botColor,
  useCase,
  theme = TELEGRAM_THEME,
  children,
  onButtonHover,
}: SampleChatProps) {
  const name = botName ?? useCase?.botName ?? "Bot";
  const initial = botInitial ?? useCase?.botInitial ?? "B";
  const color = botColor ?? useCase?.botColor ?? "#555";

  const renderDefaultMessages = (messages: ChatMessage[]) => (
    <>
      {messages.map((msg, i) => {
        const prevMsg = i > 0 ? messages[i - 1] : undefined;
        const nextMsg = i < messages.length - 1 ? messages[i + 1] : undefined;
        const isSameSenderAsPrev = prevMsg?.role === msg.role;
        const showTimestamp = nextMsg?.role !== msg.role;

        return (
          <div
            key={`${msg.role}-${msg.text.slice(0, 20)}-${i}`}
            class={i === 0 ? "" : isSameSenderAsPrev ? "mt-1" : "mt-3"}
          >
            <ChatBubble
              role={msg.role}
              text={msg.text}
              buttons={msg.buttons}
              showTimestamp={showTimestamp}
              theme={theme}
              onButtonHover={onButtonHover}
            />
          </div>
        );
      })}
    </>
  );

  return (
    <div
      class="rounded-[14px] overflow-hidden w-full max-w-[380px]"
      style={{
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.bg,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        class="flex items-center gap-2 px-3 py-2"
        style={{ backgroundColor: theme.bg }}
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            class="shrink-0 opacity-50"
            aria-hidden="true"
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
            style={{ background: color }}
          >
            {initial}
          </div>

          <div class="min-w-0 leading-tight">
            <div class="font-semibold text-[12px] truncate">{name}</div>
            <div class="text-[10px] font-medium flex items-center gap-1 text-[#8f96a3] mt-0.5">
              <span class="w-1 h-1 rounded-full bg-[#8f96a3]" />
              <span>online</span>
            </div>
          </div>
        </div>

        <div class="flex opacity-40">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div
        class="flex flex-col px-2 pb-2.5 pt-1"
        style={{ backgroundColor: theme.bg }}
      >
        {children ?? (useCase ? renderDefaultMessages(useCase.messages) : null)}
      </div>
    </div>
  );
}
