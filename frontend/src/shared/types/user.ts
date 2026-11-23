export type Role = "customer" | "restaurant" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  /** Present for restaurant owners once the backend links the account to a restaurant. */
  restaurantId?: string;
}

export interface UpdateProfilePayload {
  name: string;
  phone?: string;
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
  phone?: string;
  role: "customer" | "restaurant";
}
