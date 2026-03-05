const SCHEDULE_CALL_URL = "https://calendar.app.google/LwAk3ecptkJQaYr87";

const TelegramIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const ApiIcon = () => (
  <svg
    width="12"
    height="12"
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
);

const CalendarIcon = () => (
  <svg
    width="12"
    height="12"
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
);

const tryLinks = [
  {
    label: "Talk to Founder",
    href: SCHEDULE_CALL_URL,
    Icon: CalendarIcon,
  },
  {
    label: "REST API",
    href: "https://community.lobu.ai/api/docs",
    Icon: ApiIcon,
  },
];

export function HeroSection() {
  return (
    <section class="pt-28 pb-12 px-8 relative">
      <div class="max-w-3xl mx-auto text-center relative">
        <h1
          class="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-5"
          style={{ color: "var(--color-page-text)" }}
        >
          Multi-tenant{" "}
          <span
            style={{
              color: "var(--color-tg-accent)",
            }}
          >
            OpenClaw
          </span>{" "}
          infra
        </h1>
        <p
          class="text-lg max-w-2xl mx-auto mb-8 leading-relaxed"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          One deploy. One agent per user.{" "}
          <a
            href="/guides/security"
            class="underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--color-page-text-muted)" }}
          >
            Secure
          </a>{" "}
          and customizable with{" "}
          <a
            href="/skills-as-saas"
            class="underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--color-page-text-muted)" }}
          >
            skills
          </a>
          .
        </p>

        {/* CTA buttons */}
        <div class="flex flex-wrap gap-3 mb-8 justify-center">
          <a
            href="https://t.me/lobuaibot"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{
              backgroundColor: "var(--color-page-text)",
              color: "var(--color-page-bg)",
            }}
          >
            <TelegramIcon />
            Try on Telegram
          </a>
          <a
            href="#installation"
            class="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{
              color: "var(--color-page-text-muted)",
              border: "1px solid var(--color-page-border)",
            }}
          >
            Install
          </a>
        </div>

        {/* Try it links */}
        <div
          class="flex flex-wrap items-center gap-3 text-[11px] justify-center"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          {tryLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:opacity-80"
              style={{
                backgroundColor: "var(--color-page-surface-dim)",
                border: "1px solid var(--color-page-border)",
                color: "var(--color-page-text-muted)",
              }}
            >
              <link.Icon />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
