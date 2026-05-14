import type { D1Database } from "@cloudflare/workers-types";
import type {
  RecentIssue,
  TeacherStatsResponse,
  UsageCounts,
} from "@plae/shared";

const RECENT_ISSUE_LIMIT = 20;

// Aggregate usage stats for the teacher dashboard. Counts are derived from
// usage_log; no per-student breakdown — user_id is a hash, so it would not
// be actionable for the teacher anyway (CLAUDE.md §5 PII policy).
export async function getTeacherStats(
  db: D1Database,
  sinceMs: number,
): Promise<TeacherStatsResponse> {
  const counts = await db
    .prepare(
      `SELECT mode, status, COUNT(*) AS n FROM usage_log
        WHERE created_at >= ?1
        GROUP BY mode, status`,
    )
    .bind(sinceMs)
    .all<{ mode: string; status: string; n: number }>();

  const today: UsageCounts = {
    total: 0,
    strudel: 0,
    musicgen: 0,
    ok: 0,
    error: 0,
    blocked: 0,
  };
  for (const r of counts.results ?? []) {
    today.total += r.n;
    if (r.mode === "strudel") today.strudel += r.n;
    else if (r.mode === "musicgen") today.musicgen += r.n;
    if (r.status === "ok") today.ok += r.n;
    else if (r.status === "error") today.error += r.n;
    else if (r.status === "blocked") today.blocked += r.n;
  }

  const issues = await db
    .prepare(
      `SELECT mode, status, created_at FROM usage_log
        WHERE status IN ('error', 'blocked')
        ORDER BY created_at DESC
        LIMIT ?1`,
    )
    .bind(RECENT_ISSUE_LIMIT)
    .all<{ mode: string; status: string; created_at: number }>();

  const recentIssues: RecentIssue[] = (issues.results ?? []).map((r) => ({
    mode: r.mode as RecentIssue["mode"],
    status: r.status as RecentIssue["status"],
    createdAt: r.created_at,
  }));

  return { today, recentIssues };
}
