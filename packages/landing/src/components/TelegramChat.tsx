import type { ChatMessage, UseCase } from "../types";

interface Props {
  useCase: UseCase;
  onButtonHover?: (hovering: boolean) => void;
}

function MessageBubble({
  msg,
  showTimestamp,
  onButtonHover,
}: {
  msg: ChatMessage;
  showTimestamp: boolean;
  onButtonHover?: (hovering: boolean) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div class={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div class="max-w-[76%]">
        <div
          class="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap rounded-[14px]"
          style={{
            backgroundColor: isUser
              ? "rgba(var(--color-tg-accent-rgb), 0.18)"
              : "#171a20",
            color: "var(--color-page-text-muted)",
            border: isUser
              ? "1px solid rgba(var(--color-tg-accent-rgb), 0.35)"
              : "1px solid #2a2f38",
          }}
        >
          {msg.text}
          {showTimestamp ? (
            <span class="text-[11px] float-right mt-1 ml-1.5 text-[#8f96a3]">
              12:01
            </span>
          ) : null}
        </div>

        {msg.buttons?.map((btn) => (
          <button
            type="button"
            key={btn.label}
            class="mt-1.5 h-8 px-3 inline-flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer chat-action-btn"
            style={{
              backgroundColor: "transparent",
              color: "#ff8a3d",
              border: "1px solid #a74f20",
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

export function TelegramChat({ useCase, onButtonHover }: Props) {
  return (
    <div
      class="rounded-[18px] overflow-hidden w-full max-w-[420px]"
      style={{
        border: "1px solid #23262d",
        backgroundColor: "#0b0c0f",
      }}
    >
      {/* Header */}
      <div
        class="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{ backgroundColor: "#0b0c0f" }}
      >
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
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

          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: useCase.botColor }}
          >
            {useCase.botInitial}
          </div>

          <div class="min-w-0">
            <div class="font-semibold text-[13px] truncate">
              {useCase.botName}
            </div>
            <div class="text-xs font-medium flex items-center gap-1 text-[#8f96a3]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#8f96a3]" />
              <span>online</span>
            </div>
          </div>
        </div>

        <div class="flex opacity-40">
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
        class="flex flex-col px-2.5 py-2.5"
        style={{ backgroundColor: "#0b0c0f" }}
      >
        {useCase.messages.map((msg, i) => {
          const prevMsg = i > 0 ? useCase.messages[i - 1] : undefined;
          const nextMsg =
            i < useCase.messages.length - 1
              ? useCase.messages[i + 1]
              : undefined;
          const isSameSenderAsPrev = prevMsg?.role === msg.role;
          const showTimestamp = nextMsg?.role !== msg.role;

          return (
            <div
              key={`${useCase.id}-${i}`}
              class={i === 0 ? "" : isSameSenderAsPrev ? "mt-0.5" : "mt-2"}
            >
              <MessageBubble
                msg={msg}
                showTimestamp={showTimestamp}
                onButtonHover={onButtonHover}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
