import type { D1Database } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  ALLOWED_EMAIL_DOMAIN: string;
  STRUDEL_DAILY_QUOTA: string;
  MUSICGEN_DAILY_QUOTA: string;
  // Secrets (server-only):
  GOOGLE_OAUTH_CLIENT_ID?: string;
  ANTHROPIC_API_KEY?: string;
  HF_ENDPOINT_URL?: string;
  HF_TOKEN?: string;
  TEACHER_EMAILS?: string; // comma-separated emails promoted to the teacher role
};
