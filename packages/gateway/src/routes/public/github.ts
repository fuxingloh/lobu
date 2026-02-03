/**
 * GitHub Utility Routes
 *
 * Endpoints for GitHub repo/branch discovery (used by settings UI).
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { verifySettingsToken } from "../../auth/settings/token-service";
import type { GitHubAppAuth } from "../../modules/git-filesystem/github-app";

const TAG = "GitHub";
const ErrorResponse = z.object({ error: z.string() });

const reposRoute = createRoute({
  method: "get",
  path: "/repos",
  tags: [TAG],
  summary: "List GitHub repos for an installation",
  request: {
    query: z.object({
      token: z.string(),
      installation_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Repositories",
      content: {
        "application/json": {
          schema: z.object({
            repos: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                fullName: z.string(),
                private: z.boolean(),
                defaultBranch: z.string(),
                owner: z.string(),
              })
            ),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

const branchesRoute = createRoute({
  method: "get",
  path: "/branches",
  tags: [TAG],
  summary: "List branches for a repository",
  request: {
    query: z.object({
      token: z.string(),
      owner: z.string(),
      repo: z.string(),
      installation_id: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Branches",
      content: {
        "application/json": {
          schema: z.object({
            branches: z.array(
              z.object({ name: z.string(), protected: z.boolean() })
            ),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponse } },
    },
  },
});

export interface GitHubRoutesConfig {
  githubAuth?: GitHubAppAuth;
}

export function createGitHubRoutes(config: GitHubRoutesConfig): OpenAPIHono {
  const app = new OpenAPIHono();

  const verifyToken = (token: string | undefined) =>
    token ? verifySettingsToken(token) : null;

  app.openapi(reposRoute, async (c): Promise<any> => {
    const { token, installation_id } = c.req.valid("query");
    if (!verifyToken(token)) return c.json({ error: "Unauthorized" }, 401);
    if (!config.githubAuth) return c.json({ error: "Not configured" }, 400);

    const repos = await config.githubAuth.listInstallationRepos(
      parseInt(installation_id, 10)
    );
    return c.json({
      repos: repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
        owner: r.owner.login,
      })),
    });
  });

  app.openapi(branchesRoute, async (c): Promise<any> => {
    const { token, owner, repo, installation_id } = c.req.valid("query");
    if (!verifyToken(token)) return c.json({ error: "Unauthorized" }, 401);
    if (!config.githubAuth) return c.json({ error: "Not configured" }, 400);

    const branches = await config.githubAuth.listBranches(
      owner,
      repo,
      installation_id ? parseInt(installation_id, 10) : undefined
    );
    return c.json({
      branches: branches.map((b) => ({ name: b.name, protected: b.protected })),
    });
  });

  return app;
}
