import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

describe("loginCommand", () => {
  const originalFetch = globalThis.fetch;
  let consoleLog: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mock.restore();
    consoleLog = spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    consoleLog.mockRestore();
  });

  test("uses device-first login when the gateway returns device mode", async () => {
    const saveCredentials = mock(async () => undefined);
    const loadCredentials = mock(async () => null);
    const openMock = mock(async () => undefined);
    const spinner = {
      start: mock(() => spinner),
      fail: mock(() => spinner),
      succeed: mock(() => spinner),
    };

    mock.module("open", () => ({
      default: openMock,
    }));
    mock.module("ora", () => ({
      default: mock(() => spinner),
    }));
    mock.module("../api/context.js", () => ({
      resolveContext: mock(async () => ({
        name: "dev",
        apiUrl: "https://lobu.example.com/api/v1",
      })),
    }));
    mock.module("../api/credentials.js", () => ({
      loadCredentials,
      saveCredentials,
    }));

    let calls = 0;
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = String(input);
      calls += 1;

      if (url.endsWith("/auth/cli/start")) {
        return new Response(
          JSON.stringify({
            mode: "device",
            deviceAuthId: "device-123",
            userCode: "ABCD-EFGH",
            verificationUri: "https://issuer.example.com/device",
            verificationUriComplete:
              "https://issuer.example.com/device?user_code=ABCD-EFGH",
            interval: 1,
            expiresAt: Date.now() + 10_000,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.endsWith("/auth/cli/poll")) {
        return new Response(
          JSON.stringify({
            status: "complete",
            accessToken: "lobu-access-token",
            refreshToken: "lobu-refresh-token",
            expiresAt: Date.now() + 3600_000,
            user: {
              userId: "user-123",
              email: "user@example.com",
              name: "Example User",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { loginCommand } = await import(
      `../commands/login.ts?device=${Date.now()}`
    );
    await loginCommand({});

    expect(calls).toBe(2);
    expect(openMock).toHaveBeenCalledWith(
      "https://issuer.example.com/device?user_code=ABCD-EFGH"
    );
    expect(saveCredentials).toHaveBeenCalledTimes(1);
    expect(spinner.succeed).toHaveBeenCalledTimes(1);
  });

  test("falls back to browser login when the gateway returns browser mode", async () => {
    const saveCredentials = mock(async () => undefined);
    const loadCredentials = mock(async () => null);
    const openMock = mock(async () => undefined);
    const spinner = {
      start: mock(() => spinner),
      fail: mock(() => spinner),
      succeed: mock(() => spinner),
    };

    mock.module("open", () => ({
      default: openMock,
    }));
    mock.module("ora", () => ({
      default: mock(() => spinner),
    }));
    mock.module("../api/context.js", () => ({
      resolveContext: mock(async () => ({
        name: "prod",
        apiUrl: "https://lobu.example.com/api/v1",
      })),
    }));
    mock.module("../api/credentials.js", () => ({
      loadCredentials,
      saveCredentials,
    }));

    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/auth/cli/start")) {
        return new Response(
          JSON.stringify({
            mode: "browser",
            requestId: "request-123",
            loginUrl: "https://lobu.example.com/login",
            pollIntervalMs: 1,
            expiresAt: Date.now() + 10_000,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.endsWith("/auth/cli/poll")) {
        return new Response(
          JSON.stringify({
            status: "complete",
            accessToken: "lobu-access-token",
            refreshToken: "lobu-refresh-token",
            expiresAt: Date.now() + 3600_000,
            user: {
              userId: "user-456",
              email: "prod@example.com",
              name: "Prod User",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { loginCommand } = await import(
      `../commands/login.ts?browser=${Date.now()}`
    );
    await loginCommand({});

    expect(openMock).toHaveBeenCalledWith("https://lobu.example.com/login");
    expect(saveCredentials).toHaveBeenCalledTimes(1);
    expect(spinner.succeed).toHaveBeenCalledTimes(1);
  });

  test("uses the explicit admin-password fallback when requested", async () => {
    const saveCredentials = mock(async () => undefined);
    const loadCredentials = mock(async () => null);
    const promptMock = mock(async () => ({ password: "dev-secret" }));

    mock.module("inquirer", () => ({
      default: {
        prompt: promptMock,
      },
    }));
    mock.module("../api/context.js", () => ({
      resolveContext: mock(async () => ({
        name: "dev",
        apiUrl: "https://lobu.example.com/api/v1",
      })),
    }));
    mock.module("../api/credentials.js", () => ({
      loadCredentials,
      saveCredentials,
    }));

    globalThis.fetch = mock(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth/cli/admin-login")) {
        return new Response(
          JSON.stringify({
            status: "complete",
            accessToken: "lobu-access-token",
            refreshToken: "lobu-refresh-token",
            expiresAt: Date.now() + 3600_000,
            user: {
              userId: "admin",
              name: "Admin (dev)",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { loginCommand } = await import(
      `../commands/login.ts?admin=${Date.now()}`
    );
    await loginCommand({ adminPassword: true });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(saveCredentials).toHaveBeenCalledTimes(1);
  });
});
