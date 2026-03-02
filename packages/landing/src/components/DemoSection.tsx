import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { useCases } from "../use-cases";
import { SettingsDemo } from "./SettingsDemo";
import { TelegramChat } from "./TelegramChat";

const SECTION_MAP: Record<string, string> = {
  setup: "model",
  packages: "packages",
  mcp: "integrations",
  schedules: "reminders",
  network: "permissions",
};

const COUNT = useCases.length;

export function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const activeIndex = useSignal(0);
  const stepProgress = useSignal(0);
  const openSections = useSignal<Record<string, boolean>>({
    [SECTION_MAP[useCases[0].id]]: true,
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    function onScroll() {
      const rect = section!.getBoundingClientRect();
      const maxScroll = section!.offsetHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      const scrolled = Math.max(0, Math.min(-rect.top, maxScroll));
      const rawProgress = scrolled / maxScroll;
      const step = Math.min(Math.floor(rawProgress * COUNT), COUNT - 1);
      const subProgress = Math.min(rawProgress * COUNT - step, 1);

      stepProgress.value = subProgress;

      if (step !== activeIndex.peek()) {
        activeIndex.value = step;
        openSections.value = {
          [SECTION_MAP[useCases[step].id]]: true,
        };
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeCase = useCases[activeIndex.value];

  return (
    <section ref={sectionRef} style={{ height: `${COUNT * 100}vh` }}>
      <div class="sticky top-0 h-screen flex flex-col justify-center px-4">
        <div class="max-w-6xl mx-auto w-full">
          <h2
            class="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight"
            style={{ color: "var(--color-page-text)" }}
          >
            See it in action
          </h2>

          {/* Progress dots */}
          <div class="flex justify-center gap-2 mb-4">
            {useCases.map((uc, i) => (
              <span
                key={uc.id}
                class="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex.value ? "10px" : "6px",
                  height: i === activeIndex.value ? "10px" : "6px",
                  backgroundColor:
                    i === activeIndex.value
                      ? "var(--color-page-text)"
                      : "var(--color-page-text-muted)",
                  opacity: i === activeIndex.value ? 1 : 0.35,
                }}
              />
            ))}
          </div>

          {/* Crossfading title + description */}
          <div
            class="relative mx-auto max-w-lg mb-10"
            style={{ height: "80px" }}
          >
            {useCases.map((uc, i) => (
              <div
                key={uc.id}
                class="absolute inset-0 flex flex-col items-center justify-start transition-opacity duration-500"
                style={{
                  opacity: i === activeIndex.value ? 1 : 0,
                  pointerEvents: i === activeIndex.value ? "auto" : "none",
                }}
              >
                <p
                  class="text-lg sm:text-xl font-semibold text-center"
                  style={{ color: "var(--color-page-text)" }}
                >
                  {uc.title}
                </p>
                <p
                  class="text-sm text-center mt-1.5 max-w-md"
                  style={{ color: "var(--color-page-text-muted)" }}
                >
                  {uc.description}
                </p>
              </div>
            ))}
          </div>

          {/* Panels */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start justify-items-center">
            <div class="max-w-[420px] w-full">
              {/* Crossfading settings label */}
              <div class="relative mb-2" style={{ height: "20px" }}>
                {useCases.map((uc, i) => (
                  <p
                    key={uc.id}
                    class="absolute inset-0 text-xs font-medium transition-opacity duration-500"
                    style={{
                      color: "var(--color-page-text-muted)",
                      opacity: i === activeIndex.value ? 1 : 0,
                    }}
                  >
                    {uc.settingsLabel}
                  </p>
                ))}
              </div>
              <SettingsDemo openSections={openSections} />
            </div>
            <div class="max-w-[420px] w-full">
              {/* Crossfading chat label */}
              <div class="relative mb-2" style={{ height: "20px" }}>
                {useCases.map((uc, i) => (
                  <p
                    key={uc.id}
                    class="absolute inset-0 text-xs font-medium transition-opacity duration-500"
                    style={{
                      color: "var(--color-page-text-muted)",
                      opacity: i === activeIndex.value ? 1 : 0,
                    }}
                  >
                    {uc.chatLabel}
                  </p>
                ))}
              </div>
              <TelegramChat
                useCase={activeCase}
                progress={stepProgress.value}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
