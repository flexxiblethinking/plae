// Shared types between apps/web and apps/api.
// Keep this file dependency-free so both sides can consume it.

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type HealthCheck = {
  status: "ok";
  service: "plae-api";
  timestamp: string;
};

export type UserRole = "student" | "teacher";

export type MeResponse = {
  userId: string;       // sha256(lowercased email)
  emailDomain: string;  // lowercased domain portion
  role: UserRole;
};
