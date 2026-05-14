import { useEffect, useState } from "react";
import { playStrudel, stopStrudel } from "../lib/strudel";

type PlayerStatus = "idle" | "loading" | "playing" | "error";

export function StrudelPlayer({ code }: { code: string }) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // When the generated code changes, drop any prior playback + state.
  useEffect(() => {
    setStatus("idle");
    setError(null);
    return () => stopStrudel();
  }, [code]);

  const handlePlay = async () => {
    setStatus("loading");
    setError(null);
    try {
      await playStrudel(code);
      setStatus("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "재생에 실패했어요.");
      setStatus("error");
    }
  };

  const handleStop = () => {
    stopStrudel();
    setStatus("idle");
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <pre className="overflow-x-auto rounded bg-slate-900 px-3 py-2 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
      <div className="mt-3 flex items-center gap-3">
        {status === "playing" ? (
          <button
            type="button"
            onClick={handleStop}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ■ 정지
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            disabled={status === "loading"}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {status === "loading" ? "준비 중…" : "▶ 재생"}
          </button>
        )}
        {status === "error" && error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}
