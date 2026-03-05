import { createLogger } from "@lobu/core";
import { OAuthClient } from "../oauth/client";
import type { OAuthProviderConfig } from "../oauth/providers";

const logger = createLogger("settings-oauth-client");

export interface SettingsOAuthConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  /** Override authorize URL (skips .well-known discovery) */
  authorizeUrl?: string;
  /** Override token URL (skips .well-known discovery) */
  tokenUrl?: string;
  /** Override userinfo URL (skips .well-known discovery) */
  userinfoUrl?: string;
  /** Redirect URI for settings OAuth callback */
  redirectUri: string;
}

interface WellKnownMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
}

interface UserInfoResponse {
  sub: string;
  email: string;
  name?: string;
}

/**
 * OAuth client for settings page authentication.
 * Wraps the generic OAuthClient with .well-known discovery and userinfo support.
 */
export class SettingsOAuthClient {
  private oauthClient: OAuthClient | null = null;
  private userinfoUrl: string | null = null;
  private config: SettingsOAuthConfig;
  private discoveryDone = false;

  constructor(config: SettingsOAuthConfig) {
    this.config = config;
  }

  /**
   * Ensure discovery is done and OAuthClient is ready.
   */
  private async ensureInitialized(): Promise<OAuthClient> {
    if (this.oauthClient && this.discoveryDone) return this.oauthClient;

    let authUrl = this.config.authorizeUrl;
    let tokenUrl = this.config.tokenUrl;
    this.userinfoUrl = this.config.userinfoUrl || null;

    // Try .well-known discovery if URLs not explicitly provided
    if (!authUrl || !tokenUrl) {
      try {
        const wellKnownUrl = `${this.config.issuerUrl}/.well-known/openid-configuration`;
        logger.info(`Discovering OAuth endpoints from ${wellKnownUrl}`);
        const response = await fetch(wellKnownUrl);
        if (response.ok) {
          const metadata = (await response.json()) as WellKnownMetadata;
          authUrl = authUrl || metadata.authorization_endpoint;
          tokenUrl = tokenUrl || metadata.token_endpoint;
          this.userinfoUrl =
            this.userinfoUrl || metadata.userinfo_endpoint || null;
          logger.info("Discovered OAuth endpoints", {
            authUrl,
            tokenUrl,
            userinfoUrl: this.userinfoUrl,
          });
        } else {
          logger.warn(
            `Failed to fetch .well-known: ${response.status}, using manual config`
          );
        }
      } catch (error) {
        logger.warn("Failed to discover OAuth endpoints", { error });
      }
    }

    if (!authUrl || !tokenUrl) {
      throw new Error(
        "Settings OAuth: authorization and token URLs are required (set SETTINGS_OAUTH_AUTHORIZE_URL/TOKEN_URL or ensure .well-known/openid-configuration is accessible)"
      );
    }

    const providerConfig: OAuthProviderConfig = {
      id: "settings-oauth",
      name: "Settings OAuth",
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      authUrl,
      tokenUrl,
      redirectUri: this.config.redirectUri,
      scope: "profile:read",
      usePKCE: true,
      responseType: "code",
      grantType: "authorization_code",
      tokenEndpointAuthMethod: this.config.clientSecret
        ? "client_secret_post"
        : "none",
      requireRefreshToken: false,
    };

    this.oauthClient = new OAuthClient(providerConfig);
    this.discoveryDone = true;
    return this.oauthClient;
  }

  /**
   * Generate a PKCE code verifier
   */
  generateCodeVerifier(): string {
    // Use base client's method via a temporary instance if not yet initialized
    if (this.oauthClient) return this.oauthClient.generateCodeVerifier();
    // Fallback: generate directly
    const { randomBytes } = require("node:crypto");
    return randomBytes(32).toString("base64url");
  }

  /**
   * Build the authorization URL
   */
  async buildAuthUrl(state: string, codeVerifier: string): Promise<string> {
    const client = await this.ensureInitialized();
    return client.buildAuthUrl(state, codeVerifier);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string, codeVerifier: string) {
    const client = await this.ensureInitialized();
    return client.exchangeCodeForToken(code, codeVerifier);
  }

  /**
   * Fetch user info from the OAuth provider's userinfo endpoint
   */
  async fetchUserInfo(accessToken: string): Promise<UserInfoResponse> {
    await this.ensureInitialized();

    if (!this.userinfoUrl) {
      throw new Error(
        "Settings OAuth: userinfo_endpoint not available (set SETTINGS_OAUTH_USERINFO_URL or ensure provider exposes it in .well-known)"
      );
    }

    const response = await fetch(this.userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch user info: ${response.status} ${errorText}`
      );
    }

    const data = (await response.json()) as UserInfoResponse;
    logger.info("Fetched user info", { sub: data.sub, email: data.email });
    return data;
  }

  /**
   * Check if settings OAuth is configured via environment variables
   */
  static isConfigured(): boolean {
    return !!(
      process.env.SETTINGS_OAUTH_ISSUER_URL &&
      process.env.SETTINGS_OAUTH_CLIENT_ID
    );
  }

  /**
   * Create from environment variables
   */
  static fromEnv(publicGatewayUrl: string): SettingsOAuthClient | null {
    const issuerUrl = process.env.SETTINGS_OAUTH_ISSUER_URL;
    const clientId = process.env.SETTINGS_OAUTH_CLIENT_ID;

    if (!issuerUrl || !clientId) return null;

    return new SettingsOAuthClient({
      issuerUrl,
      clientId,
      clientSecret: process.env.SETTINGS_OAUTH_CLIENT_SECRET,
      authorizeUrl: process.env.SETTINGS_OAUTH_AUTHORIZE_URL,
      tokenUrl: process.env.SETTINGS_OAUTH_TOKEN_URL,
      userinfoUrl: process.env.SETTINGS_OAUTH_USERINFO_URL,
      redirectUri: `${publicGatewayUrl}/settings/oauth/callback`,
    });
  }
}
