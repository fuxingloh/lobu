import { useEffect, useRef } from "preact/hooks";

export function useScrollReveal(staggerMs = 80) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.querySelectorAll<HTMLElement>("[data-reveal]");
    if (children.length === 0) return;
    const targets = Array.from(children);

    // Set initial hidden state
    for (const t of targets) {
      t.style.opacity = "0";
      t.style.transform = "translateY(20px)";
      t.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          // Find index for stagger delay
          const idx = targets.indexOf(entry.target as HTMLElement);
          const delay = idx >= 0 ? idx * staggerMs : 0;

          setTimeout(() => {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
          }, delay);

          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    for (const t of targets) observer.observe(t);

    return () => observer.disconnect();
  }, [staggerMs]);

  return ref;
}
