import { ArchitectureDiagram, infraBadges } from "./ArchitectureDiagram";

export function ArchitectureSection() {
  return (
    <section id="architecture" class="py-12 px-8 relative">
      <div class="max-w-3xl mx-auto">
        <h2
          class="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight"
          style={{ color: "var(--color-page-text)" }}
        >
          Architecture
        </h2>
        <p
          class="text-center text-sm mb-6 max-w-lg mx-auto"
          style={{ color: "var(--color-page-text-muted)" }}
        >
          Security-first. Zero trust by default. Every agent runs in an isolated
          sandbox with no direct network access.
        </p>

        {/* Infra badges */}
        <div class="flex flex-wrap justify-center gap-2 mb-12">
          {infraBadges.map((badge) => (
            <span
              key={badge.label}
              class={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${badge.color}`}
            >
              {badge.label}
            </span>
          ))}
        </div>

        {/* Layer diagram */}
        <ArchitectureDiagram />
      </div>
    </section>
  );
}
