export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iat?: number;
  exp?: number;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}
