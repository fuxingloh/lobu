import { createProvider } from "../providers/index.js";
import { loadConfig } from "../utils/config.js";

export async function logsCommand(
  service?: string,
  cwd: string = process.cwd()
): Promise<void> {
  await loadConfig(cwd); // Ensure config exists

  const target = "docker"; // TODO: detect from config or flag
  const provider = createProvider(target);

  await provider.logs(service);
}
