export type Role = "customer" | "restaurant" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: "customer" | "restaurant";
}