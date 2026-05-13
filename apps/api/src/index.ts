import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
  ApiResponse,
  GenerateStrudelRequest,
  GenerateStrudelResponse,
  HealthCheck,
  MeResponse,
  UsageLogResponse,
} from "@plae/shared";
import type { Bindings } from "./bindings";
import { requireAuth } from "./middleware/auth";
import { requireQuota } from "./middleware/quota";
import { recordUsage } from "./services/usage";
import { generateStrudel, HarnessError } from "./services/anthropic";

const PROMPT_MIN = 1;
const PROMPT_MAX = 500;

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

app.post(
  "/api/generate/strudel",
  requireAuth(),
  requireQuota("strudel"),
  async (c) => {
    const user = c.get("user");
    const quota = c.get("quota");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      const err: ApiResponse<never> = {
        ok: false,
        error: { code: "invalid_input", message: "request body must be JSON" },
      };
      return c.json(err, 400);
    }

    const prompt = (body as Partial<GenerateStrudelRequest>)?.prompt;
    if (typeof prompt !== "string" || prompt.length < PROMPT_MIN || prompt.length > PROMPT_MAX) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "invalid_input",
          message: `prompt must be a string between ${PROMPT_MIN} and ${PROMPT_MAX} chars`,
        },
      };
      return c.json(err, 400);
    }

    if (!c.env.ANTHROPIC_API_KEY) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "ANTHROPIC_API_KEY is not set",
        },
      };
      return c.json(err, 500);
    }

    const startedAt = Date.now();
    try {
      const result = await generateStrudel({
        apiKey: c.env.ANTHROPIC_API_KEY,
        prompt,
      });

      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "strudel",
        status: "ok",
        durationMs: Date.now() - startedAt,
      });

      const ok: ApiResponse<GenerateStrudelResponse> = {
        ok: true,
        data: {
          code: result.code,
          explanation: result.explanation,
          quota: {
            limit: quota.limit,
            used: quota.used + 1,
            resetAt: quota.resetAt,
          },
        },
      };
      return c.json(ok);
    } catch (e) {
      const blocked = e instanceof HarnessError && e.code === "unsafe_output";
      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "strudel",
        status: blocked ? "blocked" : "error",
        durationMs: Date.now() - startedAt,
      });

      if (e instanceof HarnessError) {
        const status = e.code === "unsafe_output" ? 422 : 502;
        const err: ApiResponse<never> = {
          ok: false,
          error: { code: e.code, message: e.message },
        };
        return c.json(err, status);
      }

      console.error(e);
      const err: ApiResponse<never> = {
        ok: false,
        error: { code: "internal_error", message: "unexpected harness failure" },
      };
      return c.json(err, 500);
    }
  },
);

// Phase 3 placeholder — MusicGen wiring lands with Phase 3.
app.post(
  "/api/_test/log/musicgen",
  requireAuth(),
  requireQuota("musicgen"),
  async (c) => {
    const user = c.get("user");
    const quota = c.get("quota");
    await recordUsage(c.env.DB, {
      userId: user.userId,
      mode: "musicgen",
      status: "ok",
    });
    const body: ApiResponse<UsageLogResponse> = {
      ok: true,
      data: {
        mode: "musicgen",
        quota: {
          limit: quota.limit,
          used: quota.used,
          resetAt: quota.resetAt,
        },
      },
    };
    return c.json(body);
  },
);

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
