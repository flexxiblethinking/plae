import type { D1Database } from "@cloudflare/workers-types";

export type UsageMode = "strudel" | "musicgen";
export type UsageStatus = "ok" | "error" | "blocked";

export async function countUsageSince(
  db: D1Database,
  args: { userId: string; mode: UsageMode; sinceMs: number },
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM usage_log
        WHERE user_id = ?1 AND mode = ?2
          AND created_at >= ?3
          AND status = 'ok'`,
    )
    .bind(args.userId, args.mode, args.sinceMs)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function recordUsage(
  db: D1Database,
  args: {
    userId: string;
    mode: UsageMode;
    status: UsageStatus;
    durationMs?: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO usage_log (user_id, mode, status, created_at, duration_ms)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      args.userId,
      args.mode,
      args.status,
      Date.now(),
      args.durationMs ?? null,
    )
    .run();
}
