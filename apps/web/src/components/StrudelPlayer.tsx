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
    <div className="rounded-xl border border-white/[0.06] bg-panel-2 p-4">
      <pre className="overflow-x-auto rounded-lg bg-black/35 px-3 py-2.5 font-mono text-xs leading-relaxed text-signal">
        <code>{code}</code>
      </pre>
      <div className="mt-3 flex items-center gap-3">
        {status === "playing" ? (
          <button
            type="button"
            onClick={handleStop}
            className="btn btn-dark text-signal"
          >
            ■ 정지
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            disabled={status === "loading"}
            className="btn btn-accent"
          >
            {status === "loading" ? "준비 중…" : "▶ 재생"}
          </button>
        )}
        {status === "error" && error && (
          <span className="text-sm text-accent">{error}</span>
        )}
      </div>
    </div>
  );
}
