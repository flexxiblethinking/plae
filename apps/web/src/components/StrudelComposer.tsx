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
    <div className="panel space-y-5">
      <p className="panel-label">객관 모드 — 레이어 작곡기</p>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {LAYER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNextType(t)}
              className={"btn " + (t === nextType ? "btn-accent" : "btn-dark")}
            >
              {LAYER_LABEL[t]}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="layer-desc" className="block text-cream/80">
            {LAYER_LABEL[nextType]} 레이어를 어떻게 만들까요?
          </label>
          <textarea
            id="layer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={PROMPT_MAX}
            rows={2}
            placeholder={LAYER_PLACEHOLDER[nextType]}
            className="field mt-2 text-base"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-cream/35">
              {description.length}/{PROMPT_MAX}
            </span>
            <button
              type="button"
              onClick={handleAddLayer}
              disabled={!canSubmit}
              className="btn btn-accent"
            >
              {submitting ? "레이어 만드는 중…" : "레이어 추가"}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {errorMsg}
        </div>
      )}

      {layers.length > 0 && (
        <div className="space-y-3 border-t border-white/[0.07] pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cream/70">
              내 작품 — {layers.length}개 레이어
              {bpm !== null && <span className="text-signal"> · {bpm} BPM</span>}
            </h3>
            <button
              type="button"
              onClick={handleRemoveLast}
              className="font-mono text-[11px] font-bold uppercase tracking-wider text-cream/40 transition-colors hover:text-accent"
            >
              마지막 레이어 빼기
            </button>
          </div>

          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-panel-2">
            {layers.map((l, i) => (
              <li key={i} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="chip bg-accent/15 text-accent">
                    {LAYER_LABEL[l.type]}
                  </span>
                  <span className="text-sm text-cream/75">
                    {l.description}
                  </span>
                </div>
                <code className="mt-1 block overflow-x-auto font-mono text-[11px] text-cream/35">
                  {l.code}
                </code>
              </li>
            ))}
          </ul>

          {latestExplanation && (
            <p className="text-cream/80">{latestExplanation}</p>
          )}
          {stackCode && <StrudelPlayer code={stackCode} />}
          {quotaText && (
            <p className="font-mono text-[11px] text-cream/35">{quotaText}</p>
          )}
        </div>
      )}
    </div>
  );
}
