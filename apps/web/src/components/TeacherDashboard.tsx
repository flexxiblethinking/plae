import { useEffect, useState } from "react";
import type { TeacherStatsResponse } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-panel-2 px-4 py-3">
      <div className="font-mono text-2xl font-bold tabular-nums text-cream">
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cream/40">
        {label}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TeacherDashboard() {
  const { state } = useAuth();
  const [stats, setStats] = useState<TeacherStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const idToken = state.status === "authenticated" ? state.idToken : null;

  useEffect(() => {
    if (!idToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.teacherStats(idToken).then((res) => {
      if (cancelled) return;
      if (res.ok) setStats(res.data);
      else setError(res.error.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [idToken]);

  if (state.status !== "authenticated") return null;

  if (loading) {
    return (
      <div className="panel">
        <p className="panel-label">강사 대시보드</p>
        <p className="mt-3 font-mono text-sm uppercase tracking-wider text-signal">
          불러오는 중…
        </p>
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="panel">
        <p className="panel-label">강사 대시보드</p>
        <p className="mt-3 text-sm text-accent">
          대시보드를 불러오지 못했어요: {error ?? "알 수 없는 오류"}
        </p>
      </div>
    );
  }

  const { today, recentIssues } = stats;

  return (
    <div className="animate-rise space-y-6">
      <section className="panel">
        <p className="panel-label">오늘 사용량</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="전체 호출" value={today.total} />
          <StatCard label="객관 모드" value={today.strudel} />
          <StatCard label="감성 모드" value={today.musicgen} />
          <StatCard label="성공" value={today.ok} />
          <StatCard label="오류" value={today.error} />
          <StatCard label="차단됨" value={today.blocked} />
        </div>
      </section>

      <section className="panel">
        <p className="panel-label">최근 오류·차단 ({recentIssues.length})</p>
        {recentIssues.length === 0 ? (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-cream/35">
            최근 오류나 차단 기록이 없어요.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-panel-2">
            {recentIssues.map((issue, i) => (
              <li
                key={`${issue.createdAt}-${i}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={
                      "chip " +
                      (issue.status === "blocked"
                        ? "bg-marigold/15 text-marigold"
                        : "bg-accent/15 text-accent")
                    }
                  >
                    {issue.status === "blocked" ? "차단" : "오류"}
                  </span>
                  <span className="text-cream/70">
                    {issue.mode === "strudel" ? "객관 모드" : "감성 모드"}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-cream/35">
                  {formatTime(issue.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
