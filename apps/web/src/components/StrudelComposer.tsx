import { useEffect, useState } from "react";
import type { LayerType } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { initStrudelOnce } from "../lib/strudel";
import { StrudelPlayer } from "./StrudelPlayer";

const PROMPT_MAX = 500;

type Layer = {
  type: LayerType;
  description: string;
  code: string;
};

const LAYER_TYPES: LayerType[] = ["drum", "bass", "chord", "melody"];

const LAYER_LABEL: Record<LayerType, string> = {
  drum: "드럼",
  bass: "베이스",
  chord: "코드",
  melody: "멜로디",
};

const LAYER_PLACEHOLDER: Record<LayerType, string> = {
  drum: "예: 신나고 빠른 드럼 비트",
  bass: "예: 드럼에 맞춰 통통 튀는 베이스",
  chord: "예: 잔잔하게 깔리는 화음 반주",
  melody: "예: 밝고 경쾌한 멜로디",
};

// The client owns composition assembly: tempo + each layer as a `$:` line.
// Layer code itself never contains setcpm (see harness/strudel.ts).
function assembleStack(layers: Layer[], bpm: number): string {
  return [`setcpm(${bpm}/4)`, ...layers.map((l) => `$: ${l.code}`)].join("\n");
}

export function StrudelComposer() {
  const { state } = useAuth();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [nextType, setNextType] = useState<LayerType>("drum");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestExplanation, setLatestExplanation] = useState<string | null>(
    null,
  );
  const [quotaText, setQuotaText] = useState<string | null>(null);

  // Warm up Strudel early so its audio-unlock listener is registered before
  // the student's first play click, and drum samples start downloading.
  useEffect(() => {
    void initStrudelOnce();
  }, []);

  if (state.status !== "authenticated") return null;
  const idToken = state.idToken;

  const trimmed = description.trim();
  const canSubmit =
    trimmed.length > 0 && trimmed.length <= PROMPT_MAX && !submitting;

  const handleAddLayer = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await api.generateStrudel(idToken, {
      layerType: nextType,
      description: trimmed,
      bpm: bpm ?? undefined,
      existingLayers: layers.map((l) => ({ type: l.type, code: l.code })),
    });
    if (res.ok) {
      setLayers((prev) => [
        ...prev,
        { type: nextType, description: trimmed, code: res.data.code },
      ]);
      setBpm(res.data.bpm);
      setLatestExplanation(res.data.explanation);
      setQuotaText(
        `오늘 ${res.data.quota.used}/${res.data.quota.limit}회 사용했어요.`,
      );
      setDescription("");
    } else {
      setErrorMsg(errorMessage(res.error.code));
    }
    setSubmitting(false);
  };

  const handleRemoveLast = () => {
    if (layers.length <= 1) setBpm(null);
    setLayers((prev) => prev.slice(0, -1));
    setLatestExplanation(null);
  };

  const stackCode =
    bpm !== null && layers.length > 0 ? assembleStack(layers, bpm) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          {LAYER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNextType(t)}
              className={
                t === nextType
                  ? "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {LAYER_LABEL[t]}
            </button>
          ))}
        </div>

        <div>
          <label
            htmlFor="layer-desc"
            className="block text-sm font-medium text-slate-700"
          >
            {LAYER_LABEL[nextType]} 레이어를 어떻게 만들까요?
          </label>
          <textarea
            id="layer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={PROMPT_MAX}
            rows={2}
            placeholder={LAYER_PLACEHOLDER[nextType]}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {description.length}/{PROMPT_MAX}
            </span>
            <button
              type="button"
              onClick={handleAddLayer}
              disabled={!canSubmit}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "레이어 만드는 중…" : "레이어 추가"}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {layers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">
              내 작품 — {layers.length}개 레이어
              {bpm !== null && ` · ${bpm} BPM`}
            </h3>
            <button
              type="button"
              onClick={handleRemoveLast}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              마지막 레이어 빼기
            </button>
          </div>

          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {layers.map((l, i) => (
              <li key={i} className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                    {LAYER_LABEL[l.type]}
                  </span>
                  <span className="text-sm text-slate-600">
                    {l.description}
                  </span>
                </div>
                <code className="mt-1 block overflow-x-auto text-xs text-slate-400">
                  {l.code}
                </code>
              </li>
            ))}
          </ul>

          {latestExplanation && (
            <p className="text-slate-700">{latestExplanation}</p>
          )}
          {stackCode && <StrudelPlayer code={stackCode} />}
          {quotaText && <p className="text-xs text-slate-400">{quotaText}</p>}
        </div>
      )}
    </div>
  );
}
