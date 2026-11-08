import { apiRequest } from "./api";

export interface AuthUser {
  id: number;
  username: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer" | string;
  expiresIn: string;
  user: AuthUser;
}

export async function loginRequest(username: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password }),
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}
