import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse, HealthCheck } from "@plae/shared";

type Bindings = {
  ALLOWED_EMAIL_DOMAIN: string;
  DAILY_QUOTA_PER_STUDENT: string;
  // Secrets (injected by Wrangler; not present in dev unless .dev.vars set):
  ANTHROPIC_API_KEY?: string;
  HF_ENDPOINT_URL?: string;
  HF_TOKEN?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors({ origin: "*" }));

app.get("/api/health", (c) => {
  const body: ApiResponse<HealthCheck> = {
    ok: true,
    data: {
      status: "ok",
      service: "plae-api",
      timestamp: new Date().toISOString(),
    },
  };
  return c.json(body);
});

app.notFound((c) => {
  const body: ApiResponse<never> = {
    ok: false,
    error: { code: "not_found", message: "Route not found" },
  };
  return c.json(body, 404);
});

app.onError((err, c) => {
  console.error(err);
  const body: ApiResponse<never> = {
    ok: false,
    error: { code: "internal_error", message: "Internal server error" },
  };
  return c.json(body, 500);
});

export default app;
