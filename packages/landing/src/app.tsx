import { ArchitectureSection } from "./components/ArchitectureSection";
import { CTA } from "./components/CTA";
import { DemoSection } from "./components/DemoSection";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { InstallSection } from "./components/InstallSection";
import { Nav } from "./components/Nav";

export function App() {
  return (
    <div
      class="min-h-screen"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      <Nav />
      <main>
        <HeroSection />
        <ArchitectureSection />
        <DemoSection />
        <InstallSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
