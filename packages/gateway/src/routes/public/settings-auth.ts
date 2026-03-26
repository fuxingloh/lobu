import { decrypt, encrypt } from "@lobu/core";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { SettingsTokenPayload } from "../../auth/settings/token-service";

export const SETTINGS_SESSION_COOKIE_NAME = "lobu_settings_session";

function isSecureRequest(c: Context): boolean {
  const forwardedProto = c.req.header("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return new URL(c.req.url).protocol === "https:";
}

/**
 * Verify settings session from cookie.
 * Returns SettingsTokenPayload | null.
 */
export function verifySettingsSession(c: Context): SettingsTokenPayload | null {
  // Trust internal requests from the embedding host (e.g., Owletto).
  // Requires a shared secret so external callers cannot forge this header.
  const internalSecret = process.env.LOBU_INTERNAL_SECRET;
  const internalHeader = c.req.header("X-Lobu-Internal");
  if (internalSecret && internalHeader === internalSecret) {
    const agentId = c.req.param("agentId") || "system";
    return {
      agentId,
      platform: "system",
      userId: "internal",
      exp: Date.now() + 86400000,
    } as SettingsTokenPayload;
  }

  const token = getCookie(c, SETTINGS_SESSION_COOKIE_NAME);
  if (!token || token.trim().length === 0) return null;

  try {
    const decrypted = decrypt(token);
    const payload = JSON.parse(decrypted) as SettingsTokenPayload;

    if (!payload.userId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set a settings session cookie from a SettingsTokenPayload.
 */
export function setSettingsSessionCookie(
  c: Context,
  session: SettingsTokenPayload
): void {
  const token = encrypt(JSON.stringify(session));
  const maxAgeSeconds = Math.max(
    1,
    Math.floor((session.exp - Date.now()) / 1000)
  );

  setCookie(c, SETTINGS_SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecureRequest(c),
    maxAge: maxAgeSeconds,
  });
}

export function clearSettingsSessionCookie(c: Context): void {
  deleteCookie(c, SETTINGS_SESSION_COOKIE_NAME, { path: "/" });
}
