import { AuthProvider } from './types';
import { DropboxAuthProvider } from './providers/DropboxAuthProvider';
import { GoogleAuthProvider } from './providers/GoogleAuthProvider';

class AuthManager {
  private static instance: AuthManager;
  private providers: Map<string, AuthProvider> = new Map();

  private constructor() {
    this.registerProvider(new DropboxAuthProvider());
    this.registerProvider(new GoogleAuthProvider());
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  registerProvider(provider: AuthProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): AuthProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): AuthProvider[] {
    return Array.from(this.providers.values());
  }

  async handleCallback(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      const handled = await provider.handleCallback();
      if (handled) return true;
    }
    return false;
  }

  isAuthenticated(providerId?: string): boolean {
    if (providerId) {
      return this.providers.get(providerId)?.isAuthenticated() || false;
    }
    return Array.from(this.providers.values()).some(p => p.isAuthenticated());
  }
}

export default AuthManager;
