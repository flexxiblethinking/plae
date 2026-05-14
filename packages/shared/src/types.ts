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

// Layered Strudel composition: the student stacks one typed layer at a time.
export type LayerType = "drum" | "bass" | "chord" | "melody";

export type StrudelLayer = {
  type: LayerType;
  code: string;         // a single Strudel pattern line (no setcpm / $: prefix)
};

export type GenerateStrudelRequest = {
  layerType: LayerType;
  description: string;        // student's natural-language description, 1..500 chars
  bpm?: number;               // composition tempo; omitted on the first layer
  existingLayers: StrudelLayer[]; // layers already in the composition, for coherence
};

export type GenerateStrudelResponse = {
  code: string;         // the new layer's Strudel pattern line
  explanation: string;  // Korean explanation for the student
  bpm: number;          // effective composition tempo (decided on the first layer)
  quota: QuotaSnapshot; // remaining quota after this call
};

export type GenerateMusicgenRequest = {
  prompt: string;       // student's natural-language mood description, 1..500 chars
};

export type GenerateMusicgenResponse = {
  audioBase64: string;   // base64-encoded audio clip from MusicGen
  mimeType: string;      // audio MIME type, e.g. "audio/wav" or "audio/flac"
  refinedPrompt: string; // English prompt the harness sent to MusicGen
  explanation: string;   // Korean explanation for the student
  quota: QuotaSnapshot;  // remaining quota after this call
};

// ---- Teacher dashboard ----

export type UsageCounts = {
  total: number;
  strudel: number;
  musicgen: number;
  ok: number;
  error: number;
  blocked: number;
};

export type RecentIssue = {
  mode: UsageMode;
  status: "error" | "blocked";
  createdAt: number; // unix ms
};

export type TeacherStatsResponse = {
  today: UsageCounts;          // counts since KST midnight
  recentIssues: RecentIssue[]; // last error/blocked entries, newest first
};
