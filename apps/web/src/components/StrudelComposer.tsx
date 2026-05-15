import { useEffect, useState } from "react";
import type { LayerType, ApiLayerType, HarnessLayerType, StrudelLayer } from "@plae/shared";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { initStrudelOnce } from "../lib/strudel";
import {
  buildHarmonyLayer,
  chordLabel,
  keyName,
  CORE_DEGREES,
  EXTENSION_DEGREES,
  DEFAULT_DEGREES,
  type KeyMode,
  type ScaleDegree,
} from "../lib/harmony";
import {
  INSTRUMENTS,
  applyInstrument,
  DEFAULT_INSTRUMENT,
  BASS_SUFFIX,
} from "../lib/instruments";
import { StrudelPlayer } from "./StrudelPlayer";

const PROMPT_MAX = 500;
const BPM_MIN = 60;
const BPM_MAX = 160;

type Layer = {
  type: LayerType;
  description: string;
  code: string;        // chord code for harmony; pattern for drum/melody
  bassCode?: string;   // only for harmony
  instrument?: string; // synth timbre id; set for harmony/melody, undefined for drum
};

const LAYER_TYPES: LayerType[] = ["drum", "harmony", "melody"];

const LAYER_LABEL: Record<LayerType, string> = {
  drum: "리듬",
  harmony: "화성",
  melody: "선율",
};

const LAYER_PLACEHOLDER: Record<ApiLayerType, string> = {
  drum: "예: 4박자 기본 리듬, 3박자 왈츠 리듬",
  melody: "예: 도레미로 시작하는 밝은 선율",
};

// Bass line goes before chord so the chord voicing sits on top.
// Each layer's picked timbre is applied here; bass uses a fixed bass synth.
function assembleStack(layers: Layer[], bpm: number): string {
  const lines = [`setcpm(${bpm}/4)`];
  for (const l of layers) {
    if (l.bassCode) lines.push(`$: ${l.bassCode}${BASS_SUFFIX}`);
    lines.push(`$: ${applyInstrument(l.code, l.instrument)}`);
  }
  return lines.join("\n");
}

// Harmony expands to chord + bass entries for the harness context.
function toHarnessLayers(layers: Layer[]): StrudelLayer[] {
  return layers.flatMap((l) => {
    if (l.type === "harmony" && l.bassCode) {
      return [
        { type: "chord" as HarnessLayerType, code: l.code },
        { type: "bass" as HarnessLayerType, code: l.bassCode },
      ];
    }
    return [{ type: l.type as HarnessLayerType, code: l.code }];
  });
}

export function StrudelComposer() {
  const { state } = useAuth();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [bpm, setBpm] = useState(120);
  const [nextType, setNextType] = useState<LayerType>("drum");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestExplanation, setLatestExplanation] = useState<string | null>(null);
  const [quotaText, setQuotaText] = useState<string | null>(null);

  // 화성 위저드 상태 — 조성 + 4마디 화음 진행.
  const [harmonyKey, setHarmonyKey] = useState<KeyMode>("major");
  const [harmonyDegrees, setHarmonyDegrees] =
    useState<ScaleDegree[]>(DEFAULT_DEGREES);

  useEffect(() => {
    void initStrudelOnce();
  }, []);

  if (state.status !== "authenticated") return null;
  const idToken = state.idToken;

  const trimmed = description.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= PROMPT_MAX && !submitting;

  // 리듬 / 선율 — LLM 하네스 경유.
  const handleAddLayer = async () => {
    if (nextType === "harmony" || !canSubmit) return;
    const layerType: ApiLayerType = nextType;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await api.generateStrudel(idToken, {
      layerType,
      description: trimmed,
      bpm,
      existingLayers: toHarnessLayers(layers),
    });
    if (res.ok) {
      setLayers((prev) => [
        ...prev,
        {
          type: layerType,
          description: trimmed,
          code: res.data.code,
          // 드럼은 샘플이라 음색 선택 없음. 선율만 신스 음색을 가짐.
          instrument: layerType === "melody" ? DEFAULT_INSTRUMENT : undefined,
        },
      ]);
      setLatestExplanation(res.data.explanation);
      setQuotaText(`오늘 ${res.data.quota.used}/${res.data.quota.limit}회 사용했어요.`);
      setDescription("");
    } else {
      setErrorMsg(errorMessage(res.error.code));
    }
    setSubmitting(false);
  };

  // 화성 — 결정론적 생성, API 호출 없음 (사용량 차감 없음).
  const handleAddHarmonyLayer = () => {
    const built = buildHarmonyLayer(harmonyKey, harmonyDegrees);
    setLayers((prev) => [
      ...prev,
      {
        type: "harmony",
        description: built.description,
        code: built.code,
        bassCode: built.bassCode,
        instrument: DEFAULT_INSTRUMENT,
      },
    ]);
    setLatestExplanation(built.explanation);
    setErrorMsg(null);
  };

  const setDegree = (index: number, degree: ScaleDegree) => {
    setHarmonyDegrees((prev) => prev.map((d, i) => (i === index ? degree : d)));
  };

  const setLayerInstrument = (index: number, instrument: string) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === index ? { ...l, instrument } : l)),
    );
  };

  const handleRemoveLast = () => {
    setLayers((prev) => prev.slice(0, -1));
    setLatestExplanation(null);
  };

  const stackCode = layers.length > 0 ? assembleStack(layers, bpm) : null;

  return (
    <div className="panel space-y-5">
      <p className="panel-label">AI 코딩 음악 — 레이어 작곡기</p>

      {/* 빠르기(BPM) — 작곡 시작 전에 정하고, 모든 레이어에 공통 적용. */}
      <label className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wider text-cream/55">
        빠르기
        <input
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="accent-accent"
        />
        <span className="w-9 tabular-nums text-signal">{bpm}</span>
      </label>

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

        {nextType === "harmony" ? (
          /* 화성 위저드 — 조성 + 4마디 화음 진행을 골라 결정론적으로 생성. */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-cream/55">
                조성
              </span>
              {(["major", "minor"] as KeyMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHarmonyKey(m)}
                  className={"btn " + (m === harmonyKey ? "btn-accent" : "btn-dark")}
                >
                  {keyName(m)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {harmonyDegrees.map((deg, i) => (
                <label key={i} className="block">
                  <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-cream/45">
                    {i + 1}마디
                  </span>
                  <select
                    value={deg}
                    onChange={(e) =>
                      setDegree(i, Number(e.target.value) as ScaleDegree)
                    }
                    className="field text-sm"
                  >
                    <optgroup label="주요 3화음">
                      {CORE_DEGREES.map((d) => (
                        <option key={d} value={d}>
                          {chordLabel(harmonyKey, d)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="확장 화음">
                      {EXTENSION_DEGREES.map((d) => (
                        <option key={d} value={d}>
                          {chordLabel(harmonyKey, d)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddHarmonyLayer}
                className="btn btn-accent"
              >
                화성 레이어 추가
              </button>
            </div>
          </div>
        ) : (
          /* 리듬 / 선율 — 자연어 묘사 → LLM 하네스. */
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
        )}
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
              <span className="text-signal"> · {bpm} BPM</span>
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
                  <span className="flex-1 truncate text-sm text-cream/75">
                    {l.description}
                  </span>
                  {l.instrument !== undefined && (
                    <select
                      value={l.instrument}
                      onChange={(e) => setLayerInstrument(i, e.target.value)}
                      aria-label={`${LAYER_LABEL[l.type]} 악기`}
                      className="shrink-0 rounded-lg border border-white/[0.06] bg-panel-2 px-2 py-1 font-mono text-[11px] text-cream"
                    >
                      {INSTRUMENTS.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <code className="mt-1 block overflow-x-auto whitespace-pre font-mono text-[11px] text-cream/35">
                  {l.bassCode
                    ? `코드: ${l.code}\n베이스: ${l.bassCode}`
                    : l.code}
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
