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

  const navBtn = (active: boolean) =>
    "rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors " +
    (active ? "bg-panel-2 text-cream" : "text-cream/40 hover:text-cream");

  return (
    <div className="min-h-screen">
      <header className="bg-panel text-cream">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-5">
            <span className="font-mono text-xl font-bold lowercase tracking-tight">
              pl<span className="text-accent">a</span>e
            </span>
            {isTeacher && (
              <nav className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setView("compose")}
                  className={navBtn(view === "compose")}
                >
                  음악 만들기
                </button>
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={navBtn(view === "dashboard")}
                >
                  강사 대시보드
                </button>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[11px] tracking-wider text-cream/40 sm:inline">
              {state.email ?? `@${state.user.emailDomain}`}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="font-mono text-[11px] font-bold uppercase tracking-wider text-cream/60 transition-colors hover:text-accent"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        {isTeacher && view === "dashboard" ? (
          <TeacherDashboard />
        ) : (
          <ComposeScreen />
        )}
      </main>
    </div>
  );
}
