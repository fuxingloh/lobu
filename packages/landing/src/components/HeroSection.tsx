import { useSignal } from "@preact/signals";

const SCHEDULE_CALL_URL = "https://calendar.app.google/LwAk3ecptkJQaYr87";

const tryOptions = [
  {
    label: "Try on Telegram",
    href: "https://t.me/lobuaibot",
    icon: "telegram",
  },
  {
    label: "Add to Slack",
    href: "https://community.lobu.ai/slack/install",
    icon: "slack",
  },
  {
    label: "Join Slack Community",
    href: "https://join.slack.com/t/peerbot/shared_invite/zt-391o8tyw2-iyupjTG1xHIz9Og8C7JOnw",
    icon: "slack",
  },
  {
    label: "API Docs",
    href: "https://community.lobu.ai/api/docs",
    icon: "api",
  },
] as const;

function TryDropdown() {
  const open = useSignal(false);

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => {
          open.value = !open.value;
        }}
        onBlur={() =>
          setTimeout(() => {
            open.value = false;
          }, 150)
        }
        class="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tg-accent), var(--color-tg-bubble-out))",
          color: "white",
        }}
      >
        Get Started
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          class={`transition-transform ${open.value ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      {open.value && (
        <div
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg py-1.5 z-50 shadow-xl"
          style={{
            backgroundColor: "rgb(20, 22, 28)",
            border: "1px solid var(--color-page-border)",
          }}
        >
          {tryOptions.map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
              style={{ color: "var(--color-page-text-muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-page-text)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-page-text-muted)";
              }}
            >
              {opt.icon === "telegram" && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              )}
              {opt.icon === "slack" && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
              )}
              {opt.icon === "api" && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 17l6-6-6-6M12 19h8" />
                </svg>
              )}
              {opt.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroSection() {
  return (
    <section class="pt-28 pb-16 px-4 relative overflow-hidden">
      {/* Subtle radial gradient behind hero */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(239, 68, 68, 0.06) 0%, transparent 70%)",
        }}
      />
      <div class="max-w-2xl mx-auto text-center relative">
        <h1
          class="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-5 whitespace-nowrap"
          style={{ color: "var(--color-page-text)" }}
        >
          <span
            style={{
              color: "var(--color-tg-accent)",
              textShadow:
                "0 0 40px rgba(239, 68, 68, 0.3), 0 0 80px rgba(239, 68, 68, 0.15)",
            }}
          >
            OpenClaw
          </span>{" "}
          for your team
        </h1>
        <p
          class="text-lg max-w-xl mx-auto mb-8 leading-relaxed"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          Deploy Lobu, and it spins up sandboxed OpenClaw agents on demand for
          every user and channel — with your own keys.
        </p>

        {/* CTA buttons */}
        <div class="flex flex-wrap gap-3 mb-6 justify-center">
          <TryDropdown />
          <a
            href={SCHEDULE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{
              color: "var(--color-page-text-muted)",
              border: "1px solid var(--color-page-border)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Talk to Founder
          </a>
        </div>

        {/* Platform badges */}
        <div
          class="flex flex-wrap items-center gap-3 text-[11px] justify-center"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          <span>Works with</span>
          <span
            class="px-2 py-1 rounded-md"
            style={{
              backgroundColor: "var(--color-page-surface-dim)",
              border: "1px solid var(--color-page-border)",
            }}
          >
            Telegram
          </span>
          <span
            class="px-2 py-1 rounded-md"
            style={{
              backgroundColor: "var(--color-page-surface-dim)",
              border: "1px solid var(--color-page-border)",
            }}
          >
            Slack
          </span>
          <span
            class="px-2 py-1 rounded-md"
            style={{
              backgroundColor: "var(--color-page-surface-dim)",
              border: "1px solid var(--color-page-border)",
            }}
          >
            REST API
          </span>
        </div>
      </div>
    </section>
  );
}
