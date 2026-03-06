import type { UseCase } from "../types";
import { TelegramChat } from "./TelegramChat";

interface ToolData {
  name: string;
  how: string;
  prompt: string;
  response: string;
  buttons?: { label: string; action?: "settings" | "link" }[];
}

function ToolDemo({ tool, color }: { tool: ToolData; color: string }) {
  const useCase: UseCase = {
    id: `tool-${tool.name}`,
    tabLabel: tool.name,
    title: tool.name,
    description: "",
    settingsLabel: "",
    chatLabel: "",
    botName: "Agent",
    botInitial: "A",
    botColor: color,
    messages: [
      { role: "user", text: tool.prompt },
      { role: "bot", text: tool.response, buttons: tool.buttons },
    ],
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <TelegramChat useCase={useCase} />
    </div>
  );
}

export function ToolDemos({
  tools,
  color,
}: {
  tools: ToolData[];
  color: string;
}) {
  return (
    <div>
      {tools.map((tool) => (
        <section
          key={tool.name}
          style={{
            marginBottom: "2rem",
            paddingBottom: "2rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h4 style={{ marginBottom: "4px" }}>
            <code>{tool.name}</code>
          </h4>
          <p style={{ color: "var(--color-page-text-muted)", margin: "4px 0" }}>
            {tool.how}
          </p>
          <ToolDemo tool={tool} color={color} />
        </section>
      ))}
    </div>
  );
}
