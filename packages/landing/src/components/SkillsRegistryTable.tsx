import skillsConfig from "@skills-config";

interface Integration {
  id: string;
  label: string;
  authType: string;
  scopesConfig?: { default?: string[]; available?: string[] };
  apiDomains?: string[];
}

interface McpServer {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  integrations?: Integration[];
  mcpServers?: McpServer[];
}

const skills: Skill[] = (skillsConfig as { skills: Skill[] }).skills;

const integrationSkills = skills.filter((s) =>
  s.integrations?.some((i) => i.authType === "oauth")
);
const mcpSkills = skills.filter((s) => s.mcpServers);

const cellStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--color-page-border)",
  fontSize: "13px",
  color: "var(--color-page-text-muted)",
};

const headerCellStyle = {
  ...cellStyle,
  fontWeight: 600,
  color: "var(--color-page-text)",
  backgroundColor: "var(--color-page-surface-dim)",
};

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "10px",
        fontFamily: "monospace",
        padding: "1px 6px",
        borderRadius: "4px",
        backgroundColor: "var(--color-page-surface-dim)",
        border: "1px solid var(--color-page-border)",
        color: "var(--color-page-text-muted)",
        marginRight: "4px",
        marginBottom: "2px",
      }}
    >
      {text}
    </span>
  );
}

export function SkillsRegistryTable() {
  return (
    <div>
      <h2>Integrations</h2>
      <p>
        OAuth-authenticated services. Users connect their own accounts through
        the settings page.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid var(--color-page-border)",
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>Name</th>
              <th style={headerCellStyle}>Auth Type</th>
              <th style={headerCellStyle}>Services</th>
              <th style={headerCellStyle}>Available Scopes</th>
            </tr>
          </thead>
          <tbody>
            {integrationSkills.map((skill) => {
              const integration = skill.integrations![0];
              const scopes = integration.scopesConfig?.available ?? [];
              return (
                <tr key={skill.id}>
                  <td
                    style={{
                      ...cellStyle,
                      fontWeight: 500,
                      color: "var(--color-page-text)",
                    }}
                  >
                    {skill.name}
                  </td>
                  <td style={cellStyle}>
                    <Badge text={integration.authType} />
                  </td>
                  <td style={cellStyle}>
                    {(integration.apiDomains ?? []).map((d) => (
                      <Badge key={d} text={d} />
                    ))}
                  </td>
                  <td style={cellStyle}>
                    {scopes.length > 0 ? (
                      scopes.map((s) => <Badge key={s} text={s} />)
                    ) : (
                      <span style={{ opacity: 0.5 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>MCP Servers</h2>
      <p>Model Context Protocol servers for extended capabilities.</p>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid var(--color-page-border)",
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>Name</th>
              <th style={headerCellStyle}>Type</th>
              <th style={headerCellStyle}>URL</th>
            </tr>
          </thead>
          <tbody>
            {mcpSkills.map((skill) => {
              const mcp = skill.mcpServers![0];
              return (
                <tr key={skill.id}>
                  <td
                    style={{
                      ...cellStyle,
                      fontWeight: 500,
                      color: "var(--color-page-text)",
                    }}
                  >
                    {mcp.name}
                  </td>
                  <td style={cellStyle}>
                    <Badge text={mcp.type} />
                  </td>
                  <td style={cellStyle}>
                    <code style={{ fontSize: "12px" }}>{mcp.url}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
