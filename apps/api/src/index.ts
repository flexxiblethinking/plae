import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse, HealthCheck, MeResponse } from "@plae/shared";
import type { Bindings } from "./bindings";
import { requireAuth } from "./middleware/auth";

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

app.get("/api/me", requireAuth(), (c) => {
  const user = c.get("user");
  const body: ApiResponse<MeResponse> = {
    ok: true,
    data: {
      userId: user.userId,
      emailDomain: user.emailDomain,
      role: user.role,
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
