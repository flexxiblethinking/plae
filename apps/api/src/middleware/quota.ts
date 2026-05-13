import type { MiddlewareHandler } from "hono";
import type { ApiResponse } from "@plae/shared";
import type { Bindings } from "../bindings";
import { kstDayStartMs, kstNextDayStartMs } from "../lib/time";
import { countUsageSince, type UsageMode } from "../services/usage";

export type QuotaInfo = {
  mode: UsageMode;
  limit: number;
  used: number;
  resetAt: number; // unix ms — next KST midnight
};

declare module "hono" {
  interface ContextVariableMap {
    quota: QuotaInfo;
  }
}

function quotaLimitFor(env: Bindings, mode: UsageMode): number {
  const raw =
    mode === "strudel" ? env.STRUDEL_DAILY_QUOTA : env.MUSICGEN_DAILY_QUOTA;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const requireQuota = (
  mode: UsageMode,
): MiddlewareHandler<{ Bindings: Bindings }> => {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      const body: ApiResponse<never> = {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "requireQuota used before requireAuth",
        },
      };
      return c.json(body, 500);
    }

    const limit = quotaLimitFor(c.env, mode);
    const sinceMs = kstDayStartMs();
    const used = await countUsageSince(c.env.DB, {
      userId: user.userId,
      mode,
      sinceMs,
    });
    const resetAt = kstNextDayStartMs();

    c.set("quota", { mode, limit, used, resetAt });

    c.header("X-Quota-Mode", mode);
    c.header("X-Quota-Limit", String(limit));
    c.header("X-Quota-Used", String(used));
    c.header("X-Quota-Reset", String(resetAt));

    if (used >= limit) {
      const body: ApiResponse<never> = {
        ok: false,
        error: {
          code: "quota_exceeded",
          message: `daily ${mode} quota exhausted (limit=${limit})`,
        },
      };
      return c.json(body, 429);
    }

    await next();
  };
};
