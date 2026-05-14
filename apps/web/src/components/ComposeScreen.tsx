import { useEffect, useState } from "react";
import type { GenerateStrudelResponse } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { initStrudelOnce } from "../lib/strudel";
import { StrudelPlayer } from "./StrudelPlayer";

const PROMPT_MAX = 500;

// API + client error codes mapped to friendly Korean copy for 7th-graders.
function errorMessage(code: string): string {
  switch (code) {
    case "quota_exceeded":
      return "오늘 만들 수 있는 횟수를 다 썼어요. 내일 다시 만들 수 있어요.";
    case "unsafe_output":
      return "안전하지 않은 코드가 만들어져서 멈췄어요. 다른 표현으로 다시 해볼까요?";
    case "invalid_input":
      return "입력을 확인해 주세요. (1~500자 사이로 적어요)";
    case "network_error":
    case "parse_failure":
      return "서버와 연결이 잘 안 됐어요. 잠시 후 다시 시도해 주세요.";
    default:
      return "음악을 만드는 중에 문제가 생겼어요. 다시 시도해 주세요.";
  }
}

export function ComposeScreen() {
  const { state } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GenerateStrudelResponse | null>(null);
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await api.generateStrudel(idToken, { prompt: trimmed });
    if (res.ok) {
      setResult(res.data);
    } else {
      setErrorMsg(errorMessage(res.error.code));
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
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
          placeholder="예: 느린 피아노 멜로디, 신나는 드럼 비트"
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
            {submitting ? "만드는 중…" : "음악 만들기"}
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
          <StrudelPlayer code={result.code} />
          <p className="text-xs text-slate-400">
            오늘 {result.quota.used}/{result.quota.limit}회 사용했어요.
          </p>
        </div>
      )}
    </div>
  );
}
