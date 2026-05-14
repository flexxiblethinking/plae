import { useEffect, useState } from "react";
import type { TeacherStatsResponse } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
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
    return <div className="text-slate-500">불러오는 중…</div>;
  }
  if (error || !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        대시보드를 불러오지 못했어요: {error ?? "알 수 없는 오류"}
      </div>
    );
  }

  const { today, recentIssues } = stats;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-medium text-slate-700">오늘 사용량</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <StatCard label="전체 호출" value={today.total} />
          <StatCard label="객관 모드" value={today.strudel} />
          <StatCard label="감성 모드" value={today.musicgen} />
          <StatCard label="성공" value={today.ok} />
          <StatCard label="오류" value={today.error} />
          <StatCard label="차단됨" value={today.blocked} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-700">
          최근 오류·차단 ({recentIssues.length})
        </h2>
        {recentIssues.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            최근 오류나 차단 기록이 없어요.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {recentIssues.map((issue, i) => (
              <li
                key={`${issue.createdAt}-${i}`}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={
                      issue.status === "blocked"
                        ? "rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
                        : "rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
                    }
                  >
                    {issue.status === "blocked" ? "차단" : "오류"}
                  </span>
                  <span className="text-slate-600">
                    {issue.mode === "strudel" ? "객관 모드" : "감성 모드"}
                  </span>
                </span>
                <span className="text-xs text-slate-400">
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
