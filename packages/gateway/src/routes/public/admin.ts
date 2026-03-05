/**
 * Admin Page — read-only view of the system skills registry.
 * Server-rendered HTML, no Preact bundle needed.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { createLogger } from "@lobu/core";
import type { SystemSkillsService } from "../../services/system-skills-service";
import { verifySettingsSession } from "./settings-auth";

const logger = createLogger("admin-routes");

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface AdminPageConfig {
  systemSkillsService: SystemSkillsService;
}

export function createAdminPageRoutes(config: AdminPageConfig) {
  const app = new OpenAPIHono();

  app.get("/admin", async (c) => {
    const session = verifySettingsSession(c);
    if (!session) {
      return c.redirect(
        `/settings/oauth/login?returnUrl=${encodeURIComponent("/admin")}`
      );
    }

    try {
      const skills = (await config.systemSkillsService.getSystemSkills()) || [];

      // Collect items from all skills
      const integrations: {
        skillName: string;
        id: string;
        label: string;
        authType: string;
        apiDomains: string[];
      }[] = [];
      const providers: {
        skillName: string;
        displayName: string;
        defaultModel: string;
        sdkCompat: string;
      }[] = [];
      const mcpServers: {
        skillName: string;
        name: string;
        type: string;
        url: string;
      }[] = [];

      for (const skill of skills) {
        const raw = skill as any;

        if (raw.integrations) {
          for (const ig of raw.integrations) {
            integrations.push({
              skillName: skill.name,
              id: ig.id,
              label: ig.label || ig.id,
              authType: ig.authType || "oauth",
              apiDomains: ig.apiDomains || [],
            });
          }
        }

        // providers live on the raw system skill entry, not the mapped SkillConfig
        // We access them via the service's underlying data
      }

      // Also get raw provider configs via the service
      const providerConfigs =
        await config.systemSkillsService.getProviderConfigs();
      // Map provider configs back to skill names
      for (const skill of skills) {
        const providerEntry =
          providerConfigs[skill.repo.replace("system/", "")];
        if (providerEntry) {
          providers.push({
            skillName: skill.name,
            displayName: providerEntry.displayName,
            defaultModel: providerEntry.defaultModel || "-",
            sdkCompat: providerEntry.sdkCompat || "-",
          });
        }
      }

      // MCP servers from skills
      for (const skill of skills) {
        const raw = skill as any;
        const servers = raw.mcpServers || [];
        for (const srv of servers) {
          mcpServers.push({
            skillName: skill.name,
            name: srv.name || srv.id,
            type: srv.type || "sse",
            url: srv.url || srv.command || "-",
          });
        }
      }

      const html = renderAdminPage(integrations, providers, mcpServers);
      return c.html(html);
    } catch (error) {
      logger.error("Failed to render admin page", { error });
      return c.html(renderAdminErrorPage("Failed to load system skills."), 500);
    }
  });

  return app;
}

// ─── HTML Renderers ──────────────────────────────────────────────────────────

function renderAdminPage(
  integrations: {
    skillName: string;
    id: string;
    label: string;
    authType: string;
    apiDomains: string[];
  }[],
  providers: {
    skillName: string;
    displayName: string;
    defaultModel: string;
    sdkCompat: string;
  }[],
  mcpServers: {
    skillName: string;
    name: string;
    type: string;
    url: string;
  }[]
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Admin - System Skills</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #334155, #1e293b); min-height: 100vh; padding: 2rem 1rem; color: #1e293b; }
    .container { max-width: 56rem; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .header p { font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem; }
    .card { background: #fff; border-radius: 1rem; box-shadow: 0 4px 24px rgb(0 0 0 / 0.12); padding: 1.5rem; margin-bottom: 1.5rem; }
    .card h2 { font-size: 1rem; font-weight: 600; color: #334155; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .badge { display: inline-flex; align-items: center; justify-content: center; background: #e2e8f0; color: #475569; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; min-width: 1.5rem; height: 1.5rem; padding: 0 0.4rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th { text-align: left; padding: 0.5rem 0.75rem; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 0.625rem 0.75rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .tag { display: inline-block; background: #f1f5f9; color: #475569; font-size: 0.6875rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; margin: 0.1rem; }
    .tag-oauth { background: #dbeafe; color: #1d4ed8; }
    .tag-apikey { background: #fef3c7; color: #92400e; }
    .tag-sse { background: #ede9fe; color: #6d28d9; }
    .tag-stdio { background: #fce7f3; color: #be185d; }
    .empty { text-align: center; padding: 1.5rem; color: #94a3b8; font-size: 0.875rem; }
    .back-link { display: inline-block; color: #94a3b8; font-size: 0.8125rem; text-decoration: none; margin-bottom: 1rem; }
    .back-link:hover { color: #fff; }
    @media (max-width: 640px) {
      body { padding: 1rem 0.5rem; }
      .card { padding: 1rem; }
      th, td { padding: 0.375rem 0.5rem; }
      table { font-size: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/settings" class="back-link">&larr; Back to Settings</a>
    <div class="header">
      <h1>System Skills Registry</h1>
      <p>Read-only view of registered integrations, providers, and MCP servers</p>
    </div>

    <div class="card">
      <h2>Integrations <span class="badge">${integrations.length}</span></h2>
      ${
        integrations.length > 0
          ? `<table>
        <thead><tr><th>Skill</th><th>Integration</th><th>Auth</th><th>API Domains</th></tr></thead>
        <tbody>
${integrations
  .map(
    (ig) => `          <tr>
            <td>${esc(ig.skillName)}</td>
            <td>${esc(ig.label)}</td>
            <td><span class="tag ${ig.authType === "oauth" ? "tag-oauth" : "tag-apikey"}">${esc(ig.authType)}</span></td>
            <td>${ig.apiDomains.map((d) => `<span class="tag">${esc(d)}</span>`).join(" ") || "-"}</td>
          </tr>`
  )
  .join("\n")}
        </tbody>
      </table>`
          : '<div class="empty">No integrations configured</div>'
      }
    </div>

    <div class="card">
      <h2>LLM Providers <span class="badge">${providers.length}</span></h2>
      ${
        providers.length > 0
          ? `<table>
        <thead><tr><th>Skill</th><th>Provider</th><th>Default Model</th><th>SDK</th></tr></thead>
        <tbody>
${providers
  .map(
    (p) => `          <tr>
            <td>${esc(p.skillName)}</td>
            <td>${esc(p.displayName)}</td>
            <td><code style="font-size:0.75rem;background:#f1f5f9;padding:0.1rem 0.35rem;border-radius:0.2rem">${esc(p.defaultModel)}</code></td>
            <td>${p.sdkCompat !== "-" ? `<span class="tag">${esc(p.sdkCompat)}</span>` : "-"}</td>
          </tr>`
  )
  .join("\n")}
        </tbody>
      </table>`
          : '<div class="empty">No LLM providers configured</div>'
      }
    </div>

    <div class="card">
      <h2>MCP Servers <span class="badge">${mcpServers.length}</span></h2>
      ${
        mcpServers.length > 0
          ? `<table>
        <thead><tr><th>Skill</th><th>Server</th><th>Type</th><th>URL</th></tr></thead>
        <tbody>
${mcpServers
  .map(
    (s) => `          <tr>
            <td>${esc(s.skillName)}</td>
            <td>${esc(s.name)}</td>
            <td><span class="tag ${s.type === "sse" ? "tag-sse" : "tag-stdio"}">${esc(s.type)}</span></td>
            <td style="word-break:break-all;max-width:16rem">${esc(s.url)}</td>
          </tr>`
  )
  .join("\n")}
        </tbody>
      </table>`
          : '<div class="empty">No MCP servers configured</div>'
      }
    </div>
  </div>
</body>
</html>`;
}

function renderAdminErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Error</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.25rem; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(to bottom right, #ef4444, #b91c1c); }
    .card { background: #fff; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); padding: 2.5rem; max-width: 28rem; width: 100%; text-align: center; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #dc2626; margin: 0 0 1rem 0; }
    p { color: #4b5563; margin: 0 0 1.25rem 0; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 1rem; color: #b91c1c; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Error</h1>
    <p>Unable to load admin page.</p>
    <div class="error-box">${esc(message)}</div>
  </div>
</body>
</html>`;
}
