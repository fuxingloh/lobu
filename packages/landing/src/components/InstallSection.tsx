import { useSignal } from "@preact/signals";

const modes = [
  {
    id: "docker",
    label: "Docker Compose",
    description:
      "One-command production deployment on a single machine. Best for getting started or small teams.",
    steps: [
      { label: "Scaffold a new project", code: "npx create-lobu my-bot" },
      { label: "Start the stack", code: "cd my-bot && docker compose up -d" },
    ],
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    description:
      "Install via OCI Helm chart — no repo clone needed. Scales horizontally with your team.",
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

export function InstallSection() {
  const activeIndex = useSignal(0);
  const active = modes[activeIndex.value];
  return (
    <section
      class="py-16 px-4"
      style={{ backgroundColor: "rgba(17, 19, 24, 0.6)" }}
    >
      <div class="max-w-4xl mx-auto">
        <h2
          class="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight"
          style={{ color: "var(--color-page-text)" }}
        >
          Installation
        </h2>
        <p
          class="text-center text-sm mb-10 max-w-lg mx-auto"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          Deploy with Docker Compose or Kubernetes. From zero to running in
          under a minute.
        </p>

        {/* Mode tabs */}
        <div class="flex flex-wrap gap-1.5 mb-8 justify-center">
          {modes.map((mode, i) => (
            <button
              type="button"
              key={mode.id}
              onClick={() => {
                activeIndex.value = i;
              }}
              class="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor:
                  i === activeIndex.value
                    ? "var(--color-page-surface)"
                    : "transparent",
                color:
                  i === activeIndex.value
                    ? "var(--color-page-text)"
                    : "var(--color-page-text-muted)",
                border: `1px solid ${i === activeIndex.value ? "var(--color-page-border-active)" : "var(--color-page-border)"}`,
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div class="py-2">
            <h3
              class="text-lg font-semibold mb-2"
              style={{ color: "var(--color-page-text)" }}
            >
              {active.label}
            </h3>
            <p
              class="text-sm leading-relaxed"
              style={{ color: "var(--color-page-text-muted)" }}
            >
              {active.description}
            </p>
          </div>

          <div class="space-y-3">
            {active.steps.map((step, i) => (
              <div key={`${active.id}-${i}`}>
                <div
                  class="text-[11px] font-medium mb-1.5"
                  style={{ color: "var(--color-page-text-muted)" }}
                >
                  {step.label}
                </div>
                <div
                  class="rounded-lg overflow-hidden font-mono text-[12.5px] leading-[1.6]"
                  style={{
                    backgroundColor: "rgb(14, 14, 18)",
                    border: "1px solid rgba(255,255,255,0.08)",
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
        </div>
      </div>
    </section>
  );
}
