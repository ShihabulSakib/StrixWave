export interface AuthProvider {
  id: string;
  name: string;
  login(): Promise<void>;
  logout(): void;
  getAccessToken(): Promise<string>;
  handleCallback(): Promise<boolean>;
  isAuthenticated(): boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}
