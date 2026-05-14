import { useEffect, useState } from "react";
import type {
  GenerateMusicgenResponse,
  GenerateStrudelResponse,
} from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { initStrudelOnce } from "../lib/strudel";
import { StrudelPlayer } from "./StrudelPlayer";
import { AudioPlayer } from "./AudioPlayer";

const PROMPT_MAX = 500;

type Mode = "strudel" | "musicgen";

type Result =
  | { mode: "strudel"; data: GenerateStrudelResponse }
  | { mode: "musicgen"; data: GenerateMusicgenResponse };

// API + client error codes mapped to friendly Korean copy for 7th-graders.
function errorMessage(code: string): string {
  switch (code) {
    case "quota_exceeded":
      return "오늘 만들 수 있는 횟수를 다 썼어요. 내일 다시 만들 수 있어요.";
    case "unsafe_output":
      return "안전하지 않은 결과가 만들어져서 멈췄어요. 다른 표현으로 다시 해볼까요?";
    case "invalid_input":
      return "입력을 확인해 주세요. (1~500자 사이로 적어요)";
    case "network_error":
    case "parse_failure":
      return "서버와 연결이 잘 안 됐어요. 잠시 후 다시 시도해 주세요.";
    default:
      return "음악을 만드는 중에 문제가 생겼어요. 다시 시도해 주세요.";
  }
}

const MODE_LABEL: Record<Mode, string> = {
  strudel: "객관 모드",
  musicgen: "감성 모드",
};

const MODE_PLACEHOLDER: Record<Mode, string> = {
  strudel: "예: 느린 피아노 멜로디, 신나는 드럼 비트",
  musicgen: "예: 비 오는 날 카페에서 듣고 싶은 잔잔한 음악",
};

export function ComposeScreen() {
  const { state } = useAuth();
  const [mode, setMode] = useState<Mode>("strudel");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Warm up Strudel early so its audio-unlock listener is registered before
  // the student's first click, and drum samples start downloading.
  useEffect(() => {
    void initStrudelOnce();
  }, []);

  if (state.status !== "authenticated") return null;
  const idToken = state.idToken;

  const trimmed = prompt.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= PROMPT_MAX && !submitting;

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);

    if (mode === "strudel") {
      const res = await api.generateStrudel(idToken, { prompt: trimmed });
      if (res.ok) setResult({ mode: "strudel", data: res.data });
      else setErrorMsg(errorMessage(res.error.code));
    } else {
      const res = await api.generateMusicgen(idToken, { prompt: trimmed });
      if (res.ok) setResult({ mode: "musicgen", data: res.data });
      else setErrorMsg(errorMessage(res.error.code));
    }

    setSubmitting(false);
  };

  const submitLabel = submitting
    ? mode === "musicgen"
      ? "음악을 만드는 중이에요… (조금 걸려요)"
      : "만드는 중…"
    : "음악 만들기";

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["strudel", "musicgen"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
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

      <div>
        <label
          htmlFor="prompt"
          className="block text-sm font-medium text-slate-700"
        >
          어떤 음악을 만들고 싶나요?
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={PROMPT_MAX}
          rows={3}
          placeholder={MODE_PLACEHOLDER[mode]}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {prompt.length}/{PROMPT_MAX}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {result?.mode === "strudel" && (
        <div className="space-y-3">
          <p className="text-slate-700">{result.data.explanation}</p>
          <StrudelPlayer code={result.data.code} />
          <p className="text-xs text-slate-400">
            오늘 {result.data.quota.used}/{result.data.quota.limit}회 사용했어요.
          </p>
        </div>
      )}

      {result?.mode === "musicgen" && (
        <div className="space-y-3">
          <p className="text-slate-700">{result.data.explanation}</p>
          <AudioPlayer
            audioBase64={result.data.audioBase64}
            mimeType={result.data.mimeType}
          />
          <p className="text-xs text-slate-400">
            AI 프롬프트:{" "}
            <span className="font-mono">{result.data.refinedPrompt}</span>
          </p>
          <p className="text-xs text-slate-400">
            오늘 {result.data.quota.used}/{result.data.quota.limit}회 사용했어요.
          </p>
        </div>
      )}
    </div>
  );
}
