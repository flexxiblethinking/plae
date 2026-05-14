import { useEffect, useRef, useState } from "react";
import {
  TRACKS,
  STEPS,
  loadKit,
  tapPad,
  emptyPattern,
  DrumSequencer,
  type Pattern,
  type TrackId,
} from "../lib/drumkit";

// 드럼 패드 — 4개 탭 패드(소리 들어보기) + 16-step 시퀀서(리듬 만들기).
// 객관 모드(StrudelComposer)와 달리 자체 경량 오디오 경로를 쓴다.
export function DrumPad() {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pattern, setPattern] = useState<Pattern>(emptyPattern);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [flash, setFlash] = useState<TrackId | null>(null);

  // 시퀀서 인스턴스는 컴포넌트 수명 동안 한 번만 생성.
  const seqRef = useRef<DrumSequencer | null>(null);
  if (seqRef.current === null) seqRef.current = new DrumSequencer();
  const seq = seqRef.current;

  useEffect(() => {
    loadKit().then(
      () => setReady(true),
      () => setLoadError(true),
    );
  }, []);

  useEffect(() => {
    seq.setOnStep(setCurrentStep);
  }, [seq]);
  useEffect(() => {
    seq.setPattern(pattern);
  }, [seq, pattern]);
  useEffect(() => {
    seq.setBpm(bpm);
  }, [seq, bpm]);
  // 언마운트(모드 전환) 시 재생 정지.
  useEffect(() => () => seq.stop(), [seq]);

  const handlePlayToggle = async () => {
    if (playing) {
      seq.stop();
      setPlaying(false);
    } else {
      await seq.start();
      setPlaying(true);
    }
  };

  const handleTap = (id: TrackId) => {
    tapPad(id);
    setFlash(id);
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 120);
  };

  const toggleCell = (id: TrackId, step: number) => {
    setPattern((prev) => {
      const next: Pattern = { ...prev, [id]: [...prev[id]] };
      next[id][step] = !next[id][step];
      return next;
    });
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        드럼 소리를 불러오지 못했어요. 새로고침 해보세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 탭 패드 — 소리 들어보기 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TRACKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            disabled={!ready}
            onPointerDown={() => handleTap(id)}
            className={
              "select-none rounded-xl py-8 text-sm font-semibold transition-colors " +
              (flash === id
                ? "bg-indigo-500 text-white"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700") +
              (ready ? "" : " opacity-50")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handlePlayToggle}
          disabled={!ready}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {playing ? "■ 정지" : "▶ 재생"}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          빠르기
          <input
            type="range"
            min={60}
            max={160}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <span className="w-10 tabular-nums">{bpm}</span>
        </label>
        <button
          type="button"
          onClick={() => setPattern(emptyPattern())}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          지우기
        </button>
      </div>

      {/* 16-step 시퀀서 그리드 */}
      <div className="overflow-x-auto">
        <div className="space-y-2">
          {TRACKS.map(({ id, label }) => (
            <div key={id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-slate-600">
                {label}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: STEPS }, (_, step) => {
                  const on = pattern[id][step];
                  const isBeat = step % 4 === 0;
                  const isPlayhead = step === currentStep;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => toggleCell(id, step)}
                      aria-label={`${label} ${step + 1}번째 칸`}
                      aria-pressed={on}
                      className={
                        "h-8 w-8 shrink-0 rounded transition-colors hover:opacity-80 " +
                        (on
                          ? "bg-indigo-600"
                          : isBeat
                            ? "bg-slate-300"
                            : "bg-slate-200") +
                        (isPlayhead ? " ring-2 ring-amber-400" : "")
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        패드를 눌러 소리를 들어보고, 아래 칸을 켜서 리듬을 만들어요. 진한 칸이
        박자(1·2·3·4박)예요.
      </p>
    </div>
  );
}
