import { dirname, resolve } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const settingsDir = resolve(
  __dirname,
  "../gateway/src/routes/public/settings-page"
);
const mockApi = resolve(__dirname, "src/settings-mock/mock-api.ts");
const mockContext = resolve(__dirname, "src/settings-mock/mock-context.tsx");

// Intercept relative imports from gateway settings components
// so they use our mocks instead of the real api/app modules
function settingsMockPlugin(): Plugin {
  return {
    name: "settings-mock",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer?.includes("settings-page")) return null;
      const resolved = resolve(dirname(importer), source);
      if (resolved === resolve(settingsDir, "api")) return mockApi;
      if (resolved === resolve(settingsDir, "app")) return mockContext;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [settingsMockPlugin(), preact(), tailwindcss()],
  resolve: {
    alias: {
      "@settings": settingsDir,
    },
  },
});
