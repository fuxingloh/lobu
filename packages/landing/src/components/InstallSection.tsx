const modes = [
  {
    id: "docker",
    label: "Docker Compose",
    badges: ["Single node", "Low ops", "Vertical scale"],
    chooseIf: [
      "You want the fastest setup on one machine.",
      "You prefer minimal operational overhead.",
    ],
    docsHref: "/deployment/docker/",
    steps: [
      { label: "Scaffold a new project", code: "npx create-lobu my-bot" },
      { label: "Start the stack", code: "cd my-bot && docker compose up -d" },
    ],
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    badges: ["Multi-node", "Higher ops", "Horizontal scale"],
    chooseIf: [
      "You need cluster scheduling and autoscaling.",
      "You need production-grade isolation controls.",
    ],
    docsHref: "/deployment/kubernetes/",
    steps: [
      {
        label: "Install with Helm",
        code: `helm install lobu oci://ghcr.io/lobu-ai/charts/lobu \\
  --namespace lobu \\
  --create-namespace`,
      },
    ],
  },
];

function ModeCard({ mode }: { mode: (typeof modes)[0] }) {
  return (
    <div
      class="rounded-xl p-6"
      style={{
        backgroundColor: "var(--color-page-bg-elevated)",
        border: "1px solid var(--color-page-border)",
      }}
    >
      <div class="flex items-center justify-between mb-4">
        <h3
          class="text-lg font-semibold"
          style={{ color: "var(--color-page-text)" }}
        >
          {mode.label}
        </h3>
        <a
          href={mode.docsHref}
          class="text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-tg-accent)" }}
        >
          Docs →
        </a>
      </div>

      <div class="flex flex-wrap gap-1.5 mb-5">
        {mode.badges.map((badge) => (
          <span
            key={badge}
            class="text-[11px] font-medium px-2 py-1 rounded-full"
            style={{
              color: "var(--color-page-text-muted)",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {badge}
          </span>
        ))}
      </div>

      <div class="space-y-3 mb-5">
        {mode.steps.map((step, i) => (
          <div key={`${mode.id}-${i}`}>
            <div
              class="text-[11px] font-medium mb-1.5"
              style={{ color: "var(--color-page-text-muted)" }}
            >
              {step.label}
            </div>
            <div
              class="rounded-lg overflow-hidden font-mono text-[12.5px] leading-[1.6]"
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <pre
                class="p-3.5 m-0 overflow-x-auto"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                <span style={{ color: "var(--color-tg-accent)" }}>$</span>{" "}
                {step.code}
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div
        class="text-[11px] font-medium mb-2"
        style={{ color: "var(--color-page-text-muted)" }}
      >
        Choose this if
      </div>
      <ul class="m-0 pl-4 space-y-1 text-[12px] leading-relaxed">
        {mode.chooseIf.map((item) => (
          <li key={item} style={{ color: "var(--color-page-text-muted)" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InstallSection() {
  return (
    <section id="installation" class="py-12 px-8">
      <div class="max-w-3xl mx-auto">
        <h2
          class="text-2xl sm:text-3xl font-bold text-center mb-10 tracking-tight"
          style={{ color: "var(--color-page-text)" }}
        >
          Installation
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modes.map((mode) => (
            <ModeCard key={mode.id} mode={mode} />
          ))}
        </div>
      </div>
    </section>
  );
}
