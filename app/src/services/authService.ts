interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user';

  async login(email: string, password: string): Promise<User> {
    try {
      // Import TauriService dynamically to avoid circular dependencies
      const { TauriService } = await import('./tauriService');
      
      // Debug Tauri API status
      console.log('Tauri API Debug:', TauriService.debug());
      
      // Wait for Tauri API to be available
      const apiAvailable = await TauriService.waitForAPI(3000);
      if (!apiAvailable) {
        throw new Error('Tauri API not available after waiting. Please refresh the app.');
      }
      
      const data = await TauriService.login({ email, password });
      this.setToken(data.token);
      this.setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to login');
    }
  }

  async register(username: string, email: string, password: string): Promise<User> {
    try {
      // Import TauriService dynamically to avoid circular dependencies
      const { TauriService } = await import('./tauriService');
      
      // Debug Tauri API status
      console.log('Tauri API Debug:', TauriService.debug());
      
      const data = await TauriService.register({ username, email, password });
      this.setToken(data.token);
      this.setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Register error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to register');
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login';
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  updateStoredUser(user: User): void {
    this.setUser(user);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}

export default new AuthService(); 