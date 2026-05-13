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

export type UsageMode = "strudel" | "musicgen";

export type QuotaSnapshot = {
  limit: number;        // 0 means disabled (no calls allowed)
  used: number;         // count BEFORE this request
  resetAt: number;      // unix ms — next KST midnight
};

export type UsageLogResponse = {
  mode: UsageMode;
  quota: QuotaSnapshot;
};

export type GenerateStrudelRequest = {
  prompt: string;       // student's natural-language description, 1..500 chars
};

export type GenerateStrudelResponse = {
  code: string;         // Strudel DSL
  explanation: string;  // Korean explanation for the student
  quota: QuotaSnapshot; // remaining quota after this call
};
