interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
    title: "Bring Your Own Keys",
    description:
      "Add keys from Anthropic, OpenAI, Google, or any provider. Harness lets you route across multiple models and agents.",
  },
  {
    icon: "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
    title: "Extensions & MCP",
    description:
      "Add skills and MCP integrations for Gmail, GitHub, calendars, and more.",
  },
  {
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
    title: "Sandboxed Execution",
    description:
      "Every agent runs in an isolated container with network controls. Your data stays safe.",
  },
  {
    icon: "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
    title: "Per-Agent Configuration",
    description:
      "Each agent gets its own system prompt, model, and tools. Configure everything from the web dashboard.",
  },
  {
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    title: "Multi-User Access",
    description:
      "Your whole team shares one deployment. Each user gets their own sessions, credentials, and MCP connections.",
  },
  {
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Session History",
    description:
      "Browse past sessions with full tool call visibility. See exactly what your agents did and why.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div
      class="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-page-surface-dim)",
        border: "1px solid var(--color-page-border)",
      }}
    >
      <div
        class="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: "rgba(239, 68, 68, 0.12)" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke-width="1.5"
          stroke="var(--color-tg-accent)"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d={feature.icon} />
        </svg>
      </div>
      <h3
        class="text-sm font-semibold mb-1"
        style={{ color: "var(--color-page-text)" }}
      >
        {feature.title}
      </h3>
      <p
        class="text-xs leading-relaxed"
        style={{ color: "var(--color-page-text-muted)" }}
      >
        {feature.description}
      </p>
    </div>
  );
}

export function Features() {
  return (
    <section class="py-16 px-4">
      <div class="max-w-5xl mx-auto">
        <h2
          class="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight"
          style={{ color: "var(--color-page-text)" }}
        >
          Built for your workflow
        </h2>
        <p
          class="text-center text-sm mb-10 max-w-lg mx-auto"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          Everything you need to run a personal AI agent — from model selection
          to tool integrations.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
