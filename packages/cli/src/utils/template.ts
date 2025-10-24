import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "templates");

export async function renderTemplate(
  templateName: string,
  variables: Record<string, string>,
  outputPath: string
): Promise<void> {
  const templatePath = join(TEMPLATES_DIR, templateName);
  let content = await readFile(templatePath, "utf-8");

  // Simple template variable replacement: {{VAR_NAME}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    content = content.replace(regex, value);
  }

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write rendered content
  await writeFile(outputPath, content);
}

export async function copyTemplate(
  templateName: string,
  outputPath: string
): Promise<void> {
  const templatePath = join(TEMPLATES_DIR, templateName);
  const content = await readFile(templatePath);

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  await writeFile(outputPath, content);
}
