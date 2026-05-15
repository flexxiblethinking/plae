import { useState } from "react";
import type { GenerateMusicgenResponse } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { StrudelComposer } from "./StrudelComposer";
import { DrumPad } from "./DrumPad";
import { AudioPlayer } from "./AudioPlayer";

const PROMPT_MAX = 500;

type Mode = "strudel" | "musicgen" | "drumpad";

const MODE_LABEL: Record<Mode, string> = {
  drumpad: "드럼 패드",
  strudel: "AI 코딩 음악",
  musicgen: "AI 생성 음악",
};

export function ComposeScreen() {
  const { state } = useAuth();
  const [mode, setMode] = useState<Mode>("drumpad");
  // 감성 모드(MusicGen) state — 객관 모드 상태는 StrudelComposer가 자체 보유.
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GenerateMusicgenResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (state.status !== "authenticated") return null;
  const idToken = state.idToken;

  const trimmed = prompt.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= PROMPT_MAX && !submitting;

  const handleMusicgenSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await api.generateMusicgen(idToken, { prompt: trimmed });
    if (res.ok) setResult(res.data);
    else setErrorMsg(errorMessage(res.error.code));
    setSubmitting(false);
  };

  return (
    <div className="animate-rise space-y-6">
      {/* 모드 토글 — 세그먼티드 */}
      <div className="flex flex-wrap gap-1.5">
        {(["drumpad", "strudel", "musicgen"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={"btn " + (m === mode ? "btn-accent" : "btn-ghost")}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {/* 객관 모드 — StrudelComposer는 항상 마운트해 레이어 상태를 보존하고,
          다른 모드일 때만 숨긴다. */}
      <div className={mode === "strudel" ? "" : "hidden"}>
        <StrudelComposer />
      </div>

      {/* 드럼 패드 — 오디오 시퀀서가 있어 숨김 대신 조건부 렌더(언마운트 시 정지). */}
      {mode === "drumpad" && <DrumPad />}

      {/* 감성 모드 — MusicGen */}
      <div className={mode === "musicgen" ? "panel space-y-5" : "hidden"}>
        <div>
          <p className="panel-label">감성 모드 — MusicGen</p>
          <label
            htmlFor="musicgen-prompt"
            className="mt-3 block text-cream/80"
          >
            어떤 분위기의 음악을 만들고 싶나요?
          </label>
          <textarea
            id="musicgen-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={PROMPT_MAX}
            rows={3}
            placeholder="예: 비 오는 날 카페에서 듣고 싶은 잔잔한 음악"
            className="field mt-2 text-base"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-cream/35">
              {prompt.length}/{PROMPT_MAX}
            </span>
            <button
              type="button"
              onClick={handleMusicgenSubmit}
              disabled={!canSubmit}
              className="btn btn-accent"
            >
              {submitting ? "만드는 중… 조금 걸려요" : "음악 만들기"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-cream/85">{result.explanation}</p>
            <AudioPlayer
              audioBase64={result.audioBase64}
              mimeType={result.mimeType}
            />
            <p className="font-mono text-[11px] text-cream/40">
              AI 프롬프트:{" "}
              <span className="text-cream/65">{result.refinedPrompt}</span>
            </p>
            <p className="font-mono text-[11px] text-cream/40">
              오늘 {result.quota.used}/{result.quota.limit}회 사용했어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
