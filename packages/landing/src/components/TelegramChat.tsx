import { useEffect, useRef } from "preact/hooks";
import type { ChatMessage, UseCase } from "../types";

interface Props {
  useCase: UseCase;
  progress: number;
}

function TypingIndicator() {
  return (
    <div class="flex justify-start msg-appear">
      <div
        class="px-4 py-3 rounded-[15px] rounded-bl-[6px] flex gap-1.5 items-center"
        style={{
          backgroundColor: "var(--color-tg-bubble-in)",
          border: "1px solid var(--color-tg-border)",
        }}
      >
        <span class="typing-dot w-2 h-2 rounded-full bg-white/60 inline-block" />
        <span class="typing-dot w-2 h-2 rounded-full bg-white/60 inline-block" />
        <span class="typing-dot w-2 h-2 rounded-full bg-white/60 inline-block" />
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const time = isUser ? "12:01" : "12:01";

  return (
    <div class={`flex ${isUser ? "justify-end" : "justify-start"} msg-appear`}>
      <div class="max-w-[85%]">
        <div
          class={`px-3.5 py-2 text-[13.5px] leading-[1.35] whitespace-pre-wrap ${
            isUser
              ? "rounded-[15px] rounded-br-[6px]"
              : "rounded-[15px] rounded-bl-[6px]"
          }`}
          style={{
            backgroundColor: isUser
              ? "var(--color-tg-bubble-out)"
              : "var(--color-tg-bubble-in)",
            color: "var(--color-tg-text)",
            border: isUser ? "none" : "1px solid var(--color-tg-border)",
          }}
        >
          {msg.text}
          <span
            class="text-[11px] float-right mt-1.5 ml-2"
            style={{
              color: isUser ? "rgba(255,255,255,0.6)" : "var(--color-tg-meta)",
            }}
          >
            {time}
          </span>
        </div>
        {msg.buttons?.map((btn) => (
          <button
            type="button"
            key={btn.label}
            class="w-full mt-1 py-2 text-[13px] font-medium rounded-lg cursor-default transition-colors"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "var(--color-tg-accent)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TelegramChat({ useCase, progress }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useCase.messages;

  // Derive visible count and typing from scroll progress
  const messageProgress = progress * (messages.length + 1);
  const visibleCount = Math.min(Math.floor(messageProgress), messages.length);
  const fractional = messageProgress - Math.floor(messageProgress);
  const nextMessage = messages[visibleCount];
  const showTyping =
    visibleCount < messages.length &&
    nextMessage.role === "bot" &&
    fractional > 0.3;

  // Auto-scroll chat container when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  return (
    <div
      class="rounded-xl overflow-hidden w-full max-w-[420px] mx-auto shadow-2xl"
      style={{ border: "1px solid var(--color-tg-border)" }}
    >
      {/* Header */}
      <div
        class="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: "var(--color-tg-bg-secondary)" }}
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          {/* Back arrow */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            class="shrink-0 opacity-60"
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
          {/* Avatar */}
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-tg-accent), var(--color-tg-bubble-out))",
            }}
          >
            L
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-sm truncate">Lobu</span>
              <span
                class="text-[10px] px-1 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "var(--color-tg-accent)",
                }}
              >
                bot
              </span>
            </div>
            <div class="text-[11px]" style={{ color: "var(--color-tg-meta)" }}>
              {showTyping ? "typing..." : "online"}
            </div>
          </div>
        </div>
        {/* Icons */}
        <div class="flex gap-3 opacity-40">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <svg
            width="18"
            height="18"
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
        ref={scrollRef}
        class="flex flex-col gap-2 px-3 py-4 overflow-y-auto"
        style={{
          backgroundColor: "var(--color-tg-bg-secondary)",
          height: "340px",
        }}
      >
        {messages.slice(0, visibleCount).map((msg, i) => (
          <MessageBubble key={`${useCase.id}-${i}`} msg={msg} />
        ))}
        {showTyping && <TypingIndicator />}
      </div>

      {/* Input bar */}
      <div
        class="flex items-center gap-2 px-3 py-2.5"
        style={{
          backgroundColor: "var(--color-tg-bg-secondary)",
          borderTop: "1px solid var(--color-tg-border)",
        }}
      >
        {/* Emoji */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          class="opacity-40 shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M8 14s1.5 2 4 2 4-2 4-2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
        <div
          class="flex-1 py-1.5 px-3 rounded-full text-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            color: "var(--color-tg-meta)",
          }}
        >
          Message
        </div>
        {/* Attach */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          class="opacity-40 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        {/* Mic */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          class="opacity-40 shrink-0"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="2"
            width="6"
            height="12"
            rx="3"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M5 10a7 7 0 0014 0M12 19v3m-3 0h6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
