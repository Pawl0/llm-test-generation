export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthTokens | null> {
    return null;
  }

  static async register(data: { name: string; email: string; password: string }): Promise<{ id: string; email: string }> {
    return { id: `usr_${Date.now()}`, email: data.email };
  }

  static async refreshToken(token: string): Promise<AuthTokens | null> {
    return null;
  }

  static async logout(token: string): Promise<void> {}
}
