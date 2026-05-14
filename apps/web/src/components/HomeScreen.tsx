import { useAuth } from "../lib/auth";
import { ComposeScreen } from "./ComposeScreen";

export function HomeScreen() {
  const { state, signOut } = useAuth();
  if (state.status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">plae</h1>
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
        <ComposeScreen />
      </main>
    </div>
  );
}
