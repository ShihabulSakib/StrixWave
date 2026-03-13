import { AuthProvider } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const REDIRECT_URI = window.location.origin;

// LocalStorage keys
const LS_ACCESS_TOKEN = 'strixwave_goog_access_token';
const LS_REFRESH_TOKEN = 'strixwave_goog_refresh_token';
const LS_TOKEN_EXPIRY = 'strixwave_goog_token_expiry';
const LS_CODE_VERIFIER = 'strixwave_goog_code_verifier';

// PKCE Helpers
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

export class GoogleAuthProvider implements AuthProvider {
  id = 'google-drive';
  name = 'Google Drive';

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private isExchanging: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    this.refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
    this.tokenExpiry = Number(localStorage.getItem(LS_TOKEN_EXPIRY) || '0');
  }

  isAuthenticated(): boolean {
    return !!(this.accessToken || this.refreshToken);
  }

  async login(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem(LS_CODE_VERIFIER, codeVerifier);

    const challengeBuffer = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(challengeBuffer);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', // important for refresh token
      prompt: 'consent',
      state: 'google-drive',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(): Promise<boolean> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || state !== 'google-drive' || this.isExchanging) return false;
    this.isExchanging = true;

    const codeVerifier = localStorage.getItem(LS_CODE_VERIFIER);
    if (!codeVerifier) {
      this.isExchanging = false;
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google token exchange failed: ${await response.text()}`);
      }

      const data = await response.json();
      this.persistTokens(data.access_token, data.refresh_token, data.expires_in);

      localStorage.removeItem(LS_CODE_VERIFIER);
      this.isExchanging = false;
      return true;
    } catch (err) {
      console.error('[GoogleAuth] handleCallback error:', err);
      this.isExchanging = false;
      return false;
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 5 * 60 * 1000) {
      return this.accessToken;
    }

    if (this.refreshPromise) {
      await this.refreshPromise;
      if (this.accessToken) return this.accessToken;
    }

    if (this.refreshToken) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
      await this.refreshPromise;
      return this.accessToken!;
    }

    throw new Error('Google Drive token unavailable');
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_TOKEN_EXPIRY);
    localStorage.removeItem(LS_CODE_VERIFIER);
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken!,
        client_id: GOOGLE_CLIENT_ID,
      }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Google Drive session expired');
    }

    const data = await response.json();
    this.persistTokens(data.access_token, data.refresh_token || this.refreshToken!, data.expires_in);
  }

  private persistTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
    }
    localStorage.setItem(LS_TOKEN_EXPIRY, String(this.tokenExpiry));
  }
}
