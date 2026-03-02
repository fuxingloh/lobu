import { useScrollReveal } from "../hooks/useScrollReveal";

const cards = [
  {
    icon: "M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811z",
    title: "Sandboxed Execution",
    description:
      "Workers on isolated network. Docker internal: true — no route to internet even if agent code is compromised.",
    hero: true,
  },
  {
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
    title: "HTTP Proxy",
    description:
      "All outbound traffic routed through gateway proxy. Allowlist specific domains per agent, deny everything else.",
  },
  {
    icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    title: "MCP Proxy",
    description:
      "Tool connections (Gmail, GitHub, etc) proxied through gateway. OAuth authentication per user.",
  },
  {
    icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
    title: "Bring Your Own LLM",
    description:
      "Add your provider keys — Anthropic, OpenAI, Google, etc. Multi-provider with per-agent model selection.",
  },
  {
    icon: "M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33",
    title: "Secret Swapping",
    description:
      "Workers never see real credentials. Gateway resolves API keys at proxy layer. Agents only receive opaque placeholders.",
    hero: true,
  },
  {
    icon: "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
    title: "Extensions & MCP",
    description:
      "Add skills and MCP integrations for Gmail, GitHub, calendars, and more.",
  },
];

function DiagramBox({
  label,
  sublabel,
  accent,
}: {
  label: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div
      class={`rounded-lg px-4 py-3 text-center min-w-[120px] ${accent ? "gateway-pulse" : ""}`}
      style={{
        backgroundColor: accent
          ? "rgba(239, 68, 68, 0.12)"
          : "var(--color-page-surface-dim)",
        border: `1px solid ${accent ? "var(--color-tg-accent)" : "var(--color-page-border)"}`,
      }}
    >
      <div
        class="text-xs font-semibold"
        style={{
          color: accent ? "var(--color-tg-accent)" : "var(--color-page-text)",
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          class="text-[10px] mt-0.5"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <svg
      width="32"
      height="12"
      viewBox="0 0 32 12"
      fill="none"
      class="shrink-0 hidden sm:block"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="6"
        x2="26"
        y2="6"
        stroke="var(--color-page-text-muted)"
        stroke-width="1.5"
      />
      <polyline
        points="22,2 28,6 22,10"
        stroke="var(--color-page-text-muted)"
        stroke-width="1.5"
        fill="none"
      />
    </svg>
  );
}

function Diagram() {
  return (
    <div class="flex flex-col items-center gap-6 mb-12 relative">
      {/* Radial gradient behind diagram */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(239, 68, 68, 0.08) 0%, transparent 70%)",
        }}
      />
      {/* Flow row */}
      <div class="flex items-center gap-3 flex-wrap justify-center relative">
        <DiagramBox label="User / Platform" />
        <Arrow />
        <div class="flex flex-col items-center gap-1.5">
          <DiagramBox label="Gateway" accent />
          <div class="flex gap-2 flex-wrap justify-center">
            {["HTTP Proxy", "MCP Proxy", "Secret Swap"].map((t) => (
              <span
                key={t}
                class="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  color: "var(--color-tg-accent)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <Arrow />
        <DiagramBox label="Worker" sublabel="sandboxed" />
      </div>
    </div>
  );
}

function CardItem({ card, hero }: { card: (typeof cards)[0]; hero?: boolean }) {
  return (
    <div
      class={`rounded-xl ${hero ? "p-6" : "p-5"} card-glow h-full`}
      style={{
        backgroundColor: "var(--color-page-surface-dim)",
        border: "1px solid var(--color-page-border)",
      }}
    >
      <div
        class={`${hero ? "w-10 h-10" : "w-9 h-9"} rounded-lg flex items-center justify-center mb-3`}
        style={{ backgroundColor: "rgba(239, 68, 68, 0.12)" }}
      >
        <svg
          width={hero ? "20" : "18"}
          height={hero ? "20" : "18"}
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="1.5"
          stroke="var(--color-tg-accent)"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d={card.icon} />
        </svg>
      </div>
      <h3
        class={`${hero ? "text-base" : "text-sm"} font-semibold mb-1`}
        style={{ color: "var(--color-page-text)" }}
      >
        {card.title}
      </h3>
      <p
        class="text-xs leading-relaxed"
        style={{ color: "var(--color-page-text-muted)" }}
      >
        {card.description}
      </p>
    </div>
  );
}

export function ArchitectureSection() {
  const revealRef = useScrollReveal(100);

  return (
    <section
      class="py-16 px-4 relative"
      style={{
        backgroundColor: "rgba(17, 19, 24, 0.6)",
      }}
    >
      <div class="max-w-5xl mx-auto">
        <h2
          class="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight"
          style={{ color: "var(--color-page-text)" }}
        >
          Architecture
        </h2>
        <p
          class="text-center text-sm mb-10 max-w-lg mx-auto"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          Security-first. Zero trust by default.
        </p>

        <Diagram />

        {/* Bento grid */}
        <div
          ref={revealRef}
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Row 1: Sandboxed (hero, span 2) + HTTP Proxy */}
          <div data-reveal class="sm:col-span-2 lg:col-span-2">
            <CardItem card={cards[0]} hero />
          </div>
          <div data-reveal>
            <CardItem card={cards[1]} />
          </div>

          {/* Row 2: MCP Proxy + Secret Swapping (hero, span 2 on lg) */}
          <div data-reveal>
            <CardItem card={cards[2]} />
          </div>
          <div data-reveal class="sm:col-span-1 lg:col-span-2">
            <CardItem card={cards[4]} hero />
          </div>

          {/* Row 3: BYO LLM + Extensions & MCP */}
          <div data-reveal>
            <CardItem card={cards[3]} />
          </div>
          <div data-reveal class="sm:col-span-1 lg:col-span-2">
            <CardItem card={cards[5]} />
          </div>
        </div>
      </div>
    </section>
  );
}
