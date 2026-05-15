import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
  ApiResponse,
  GenerateMusicgenRequest,
  GenerateMusicgenResponse,
  GenerateStrudelRequest,
  GenerateStrudelResponse,
  HealthCheck,
  MeResponse,
  TeacherStatsResponse,
} from "@plae/shared";
import type { Bindings } from "./bindings";
import { requireAuth, requireTeacher } from "./middleware/auth";
import { requireQuota } from "./middleware/quota";
import { recordUsage } from "./services/usage";
import {
  generateStrudel,
  HarnessError,
  refineMusicgenPrompt,
} from "./services/anthropic";
import { generateMusicgenAudio } from "./services/musicgen";
import { getTeacherStats } from "./services/stats";
import { checkInput } from "./lib/input-filter";
import { kstDayStartMs } from "./lib/time";

const PROMPT_MIN = 1;
const PROMPT_MAX = 500;
// Harmony is generated deterministically on the client — the harness
// route handles only drum & melody.
const STRUDEL_LAYER_TYPES: readonly string[] = ["drum", "melody"];
const BPM_MIN = 60;
const BPM_MAX = 160;

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

    const req = body as Partial<GenerateStrudelRequest>;
    const layerType = req?.layerType;
    const description = req?.description;
    const bpm = req?.bpm;
    const existingLayers = Array.isArray(req?.existingLayers)
      ? req.existingLayers
      : [];

    if (!layerType || !STRUDEL_LAYER_TYPES.includes(layerType)) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "invalid_input",
          message: `layerType must be one of ${STRUDEL_LAYER_TYPES.join(", ")}`,
        },
      };
      return c.json(err, 400);
    }

    if (typeof bpm !== "number" || bpm < BPM_MIN || bpm > BPM_MAX) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "invalid_input",
          message: `bpm must be a number between ${BPM_MIN} and ${BPM_MAX}`,
        },
      };
      return c.json(err, 400);
    }

    if (
      typeof description !== "string" ||
      description.length < PROMPT_MIN ||
      description.length > PROMPT_MAX
    ) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "invalid_input",
          message: `description must be a string between ${PROMPT_MIN} and ${PROMPT_MAX} chars`,
        },
      };
      return c.json(err, 400);
    }

    const strudelFilter = checkInput(description);
    if (!strudelFilter.safe) {
      console.warn(
        `[input-filter] blocked strudel input (matched: ${strudelFilter.matched})`,
      );
      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "strudel",
        status: "blocked",
      });
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "blocked_input",
          message: "입력에 사용할 수 없는 표현이 포함되어 있어요.",
        },
      };
      return c.json(err, 422);
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
        layerType,
        description,
        bpm,
        existingLayers,
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

app.post(
  "/api/generate/musicgen",
  requireAuth(),
  requireQuota("musicgen"),
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

    const prompt = (body as Partial<GenerateMusicgenRequest>)?.prompt;
    if (
      typeof prompt !== "string" ||
      prompt.length < PROMPT_MIN ||
      prompt.length > PROMPT_MAX
    ) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "invalid_input",
          message: `prompt must be a string between ${PROMPT_MIN} and ${PROMPT_MAX} chars`,
        },
      };
      return c.json(err, 400);
    }

    const musicgenFilter = checkInput(prompt);
    if (!musicgenFilter.safe) {
      console.warn(
        `[input-filter] blocked musicgen input (matched: ${musicgenFilter.matched})`,
      );
      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "musicgen",
        status: "blocked",
      });
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "blocked_input",
          message: "입력에 사용할 수 없는 표현이 포함되어 있어요.",
        },
      };
      return c.json(err, 422);
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

    if (!c.env.HF_ENDPOINT_URL || !c.env.HF_TOKEN) {
      const err: ApiResponse<never> = {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "HF_ENDPOINT_URL or HF_TOKEN is not set",
        },
      };
      return c.json(err, 500);
    }

    const startedAt = Date.now();
    try {
      const refinement = await refineMusicgenPrompt({
        apiKey: c.env.ANTHROPIC_API_KEY,
        prompt,
      });
      const audio = await generateMusicgenAudio({
        endpointUrl: c.env.HF_ENDPOINT_URL,
        token: c.env.HF_TOKEN,
        prompt: refinement.prompt,
      });

      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "musicgen",
        status: "ok",
        durationMs: Date.now() - startedAt,
      });

      const ok: ApiResponse<GenerateMusicgenResponse> = {
        ok: true,
        data: {
          audioBase64: audio.audioBase64,
          mimeType: audio.mimeType,
          refinedPrompt: refinement.prompt,
          explanation: refinement.explanation,
          quota: {
            limit: quota.limit,
            used: quota.used + 1,
            resetAt: quota.resetAt,
          },
        },
      };
      return c.json(ok);
    } catch (e) {
      await recordUsage(c.env.DB, {
        userId: user.userId,
        mode: "musicgen",
        status: "error",
        durationMs: Date.now() - startedAt,
      });

      if (e instanceof HarnessError) {
        const err: ApiResponse<never> = {
          ok: false,
          error: { code: e.code, message: e.message },
        };
        return c.json(err, 502);
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

app.get("/api/teacher/stats", requireAuth(), requireTeacher(), async (c) => {
  const stats = await getTeacherStats(c.env.DB, kstDayStartMs());
  const body: ApiResponse<TeacherStatsResponse> = { ok: true, data: stats };
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
