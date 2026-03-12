/**
 * AuthService — OAuth 2.0 PKCE Singleton for Dropbox
 *
 * Handles the full PKCE lifecycle:
 *   1. login()       → generate verifier/challenge, redirect to Dropbox
 *   2. handleCallback() → exchange code for tokens
 *   3. getAccessToken()  → return cached token, auto-refresh if <5 min remaining
 *   4. logout()      → clear tokens
 *
 * Tokens are persisted in localStorage under prefixed keys.
 */

const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY as string;
const REDIRECT_URI = window.location.origin;

// LocalStorage keys
const LS_ACCESS_TOKEN = 'strixwave_access_token';
const LS_REFRESH_TOKEN = 'strixwave_refresh_token';
const LS_TOKEN_EXPIRY = 'strixwave_token_expiry';
const LS_CODE_VERIFIER = 'strixwave_code_verifier';

// -------------------------------------------------------------------
// PKCE Helpers
// -------------------------------------------------------------------

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// -------------------------------------------------------------------
// AuthService
// -------------------------------------------------------------------

class AuthService {
  private static instance: AuthService;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0; // epoch ms
  private isExchanging: boolean = false;
  private refreshPromise: Promise<void> | null = null; // L02: atomic lock for token refresh

  private constructor() {
    // Hydrate from localStorage
    this.accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    this.refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
    this.tokenExpiry = Number(localStorage.getItem(LS_TOKEN_EXPIRY) || '0');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  /** Whether we have a token (may still need refreshing). */
  get isAuthenticated(): boolean {
    return !!(this.accessToken || this.refreshToken);
  }

  /**
   * Kick off the PKCE login redirect.
   */
  async login(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem(LS_CODE_VERIFIER, codeVerifier);

    const challengeBuffer = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(challengeBuffer);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: DROPBOX_APP_KEY,
      redirect_uri: REDIRECT_URI,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      token_access_type: 'offline', // so we get a refresh_token
    });

    window.location.href = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Called on page load after redirect — exchanges code for tokens.
   * Returns true if a code was found and exchanged.
   */
  async handleCallback(): Promise<boolean> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (!code || this.isExchanging) return false;
    this.isExchanging = true;

    const codeVerifier = localStorage.getItem(LS_CODE_VERIFIER);
    if (!codeVerifier) {
      console.error('[AuthService] No code_verifier found for callback');
      this.isExchanging = false;
      return false;
    }

    try {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: DROPBOX_APP_KEY,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        // If it's already used, we might already have tokens, so just return true
        if (err.includes('invalid_grant')) {
           console.warn('[AuthService] Grant already used, possibly by StrictMode. Proceeding.');
           this.isExchanging = false;
           return true; 
        }
        throw new Error(`Token exchange failed: ${err}`);
      }

      const data = await response.json();
      this.persistTokens(data.access_token, data.refresh_token, data.expires_in);

      // Clean up URL
      localStorage.removeItem(LS_CODE_VERIFIER);
      window.history.replaceState({}, document.title, '/');

      this.isExchanging = false;
      return true;
    } catch (err) {
      console.error('[AuthService] handleCallback error:', err);
      this.isExchanging = false;
      return false;
    }
  }

  /**
   * Get a valid access token, silently refreshing if needed.
   * Throws if no refresh token is available.
   */
  async getAccessToken(): Promise<string> {
    // If token is valid and won't expire in the next 5 minutes, return it
    if (this.accessToken && Date.now() < this.tokenExpiry - 5 * 60 * 1000) {
      return this.accessToken;
    }

    // L02: If a refresh is already in flight, await it instead of starting another
    if (this.refreshPromise) {
      await this.refreshPromise;
      if (this.accessToken) return this.accessToken;
    }

    // Attempt silent refresh
    if (this.refreshToken) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
      await this.refreshPromise;
      return this.accessToken!;
    }

    throw new Error('No authentication token available. Please log in.');
  }

  /**
   * Clear local tokens.
   */
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_TOKEN_EXPIRY);
    localStorage.removeItem(LS_CODE_VERIFIER);
  }

  // ---------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken!,
        client_id: DROPBOX_APP_KEY,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AuthService] Token refresh failed:', err);
      this.logout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    // Dropbox refresh doesn't return a new refresh_token, keep existing
    this.persistTokens(data.access_token, this.refreshToken!, data.expires_in);
  }

  private persistTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
    localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
    localStorage.setItem(LS_TOKEN_EXPIRY, String(this.tokenExpiry));
  }
}

export default AuthService;
