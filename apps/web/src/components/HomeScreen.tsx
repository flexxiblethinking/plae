import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ComposeScreen } from "./ComposeScreen";
import { TeacherDashboard } from "./TeacherDashboard";

type View = "compose" | "dashboard";

export function HomeScreen() {
  const { state, signOut } = useAuth();
  const [view, setView] = useState<View>("compose");
  if (state.status !== "authenticated") return null;

  const isTeacher = state.user.role === "teacher";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">plae</h1>
          {isTeacher && (
            <nav className="flex gap-1">
              <button
                type="button"
                onClick={() => setView("compose")}
                className={
                  view === "compose"
                    ? "rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
                }
              >
                음악 만들기
              </button>
              <button
                type="button"
                onClick={() => setView("dashboard")}
                className={
                  view === "dashboard"
                    ? "rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
                }
              >
                강사 대시보드
              </button>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            @{state.user.emailDomain}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="px-6 py-10 max-w-2xl mx-auto">
        {isTeacher && view === "dashboard" ? (
          <TeacherDashboard />
        ) : (
          <ComposeScreen />
        )}
      </main>
    </div>
  );
}
