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
  strudel: "객관 모드",
  musicgen: "감성 모드",
  drumpad: "드럼 패드",
};

export function ComposeScreen() {
  const { state } = useAuth();
  const [mode, setMode] = useState<Mode>("strudel");
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
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["strudel", "musicgen", "drumpad"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              m === mode
                ? "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                : "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            }
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

      <div className={mode === "musicgen" ? "space-y-6" : "hidden"}>
        <div>
          <label
            htmlFor="musicgen-prompt"
            className="block text-sm font-medium text-slate-700"
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
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {prompt.length}/{PROMPT_MAX}
            </span>
            <button
              type="button"
              onClick={handleMusicgenSubmit}
              disabled={!canSubmit}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting
                ? "음악을 만드는 중이에요… (조금 걸려요)"
                : "음악 만들기"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-slate-700">{result.explanation}</p>
            <AudioPlayer
              audioBase64={result.audioBase64}
              mimeType={result.mimeType}
            />
            <p className="text-xs text-slate-400">
              AI 프롬프트:{" "}
              <span className="font-mono">{result.refinedPrompt}</span>
            </p>
            <p className="text-xs text-slate-400">
              오늘 {result.quota.used}/{result.quota.limit}회 사용했어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
