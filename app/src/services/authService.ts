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
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to login');
    }

    const data: AuthResponse = await response.json();
    this.setToken(data.token);
    this.setUser(data.user);
    return data.user;
  }

  async register(username: string, email: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register');
    }

    const data: AuthResponse = await response.json();
    this.setToken(data.token);
    this.setUser(data.user);
    return data.user;
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

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}

export default new AuthService(); 