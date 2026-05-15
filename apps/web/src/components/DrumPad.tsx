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
      <div className="panel">
        <p className="panel-label">드럼 패드</p>
        <p className="mt-3 text-sm text-accent">
          드럼 소리를 불러오지 못했어요. 새로고침 해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="panel animate-rise space-y-6">
      <p className="panel-label">드럼 패드 — 16-Step Sequencer</p>

      {/* 탭 패드 — 소리 들어보기 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TRACKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            disabled={!ready}
            onPointerDown={() => handleTap(id)}
            className={
              "pad py-9 text-xs " +
              (flash === id ? "!bg-accent !text-paper" : "")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.07] pt-5">
        <button
          type="button"
          onClick={handlePlayToggle}
          disabled={!ready}
          className={"btn " + (playing ? "btn-dark text-signal" : "btn-accent")}
        >
          {playing ? "■ 정지" : "▶ 재생"}
        </button>
        <label className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wider text-cream/55">
          빠르기
          <input
            type="range"
            min={60}
            max={160}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="accent-accent"
          />
          <span className="w-9 tabular-nums text-signal">{bpm}</span>
        </label>
        <button
          type="button"
          onClick={() => setPattern(emptyPattern())}
          className="btn btn-dark"
        >
          초기화
        </button>
      </div>

      {/* 16-step 시퀀서 그리드 */}
      <div className="overflow-x-auto">
        <div className="space-y-1.5">
          {TRACKS.map(({ id, label }) => (
            <div key={id} className="flex items-center gap-3">
              <span className="w-16 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide text-cream/45">
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
                        "h-8 w-8 shrink-0 rounded-md transition-all " +
                        (on
                          ? "bg-accent"
                          : isBeat
                            ? "bg-white/[0.13]"
                            : "bg-white/[0.05]") +
                        (isPlayhead
                          ? " ring-2 ring-marigold ring-offset-2 ring-offset-panel"
                          : "")
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-cream/35">
        패드를 눌러 소리를 들어보고, 아래 칸을 켜서 리듬을 만들어요. 밝은 칸이
        강박이예요.
      </p>
    </div>
  );
}
