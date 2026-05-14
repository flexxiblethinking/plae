// drumkit.ts — 드럼 패드 오디오: 샘플 로딩, 저지연 원샷 재생,
// 룩어헤드 스텝 시퀀서.
//
// Strudel(superdough)이 만드는 공유 AudioContext를 재사용한다 — 하드웨어
// 오디오 장치를 두고 다투지 않기 위해. getAudioContext()는 initStrudel과
// 무관하게 동작하는 단순 싱글턴 게터다.

import { getAudioContext } from "@strudel/web";

export type TrackId = "kick" | "snare" | "hat" | "openhat";

export const TRACKS: { id: TrackId; label: string }[] = [
  { id: "kick", label: "킥" },
  { id: "snare", label: "스네어" },
  { id: "hat", label: "닫힌 하이햇" },
  { id: "openhat", label: "오픈 하이햇" },
];

export const STEPS = 16; // 16분음표 한 마디

const SAMPLE_URL: Record<TrackId, string> = {
  kick: "/drumkit/kick.wav",
  snare: "/drumkit/snare.wav",
  hat: "/drumkit/hat.wav",
  openhat: "/drumkit/openhat.wav",
};

const buffers: Partial<Record<TrackId, AudioBuffer>> = {};
let loadPromise: Promise<void> | null = null;

// 4개 샘플을 한 번만 fetch + decode 해 캐싱한다.
export function loadKit(): Promise<void> {
  if (!loadPromise) {
    const ctx = getAudioContext();
    loadPromise = Promise.all(
      TRACKS.map(async ({ id }) => {
        const res = await fetch(SAMPLE_URL[id]);
        if (!res.ok) throw new Error(`샘플 로드 실패: ${id}`);
        buffers[id] = await ctx.decodeAudioData(await res.arrayBuffer());
      }),
    )
      .then(() => undefined)
      .catch((e) => {
        loadPromise = null; // 재시도 허용
        throw e;
      });
  }
  return loadPromise;
}

// 브라우저(특히 Safari)는 user gesture 안에서 resume() 될 때까지
// AudioContext를 suspended로 둔다. 패드/재생 핸들러에서 동기적으로 호출할 것.
export function resumeAudio(): void {
  const ctx = getAudioContext();
  if (ctx.state !== "running") void ctx.resume();
}

// 샘플 하나 재생. when은 AudioContext 타임스탬프(기본: 지금).
function trigger(track: TrackId, when?: number): void {
  const ctx = getAudioContext();
  const buf = buffers[track];
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(when ?? ctx.currentTime);
}

// 탭 패드용 원샷 — resume 후 즉시 재생.
export function tapPad(track: TrackId): void {
  resumeAudio();
  trigger(track);
}

export type Pattern = Record<TrackId, boolean[]>; // 각 배열 길이 STEPS

export function emptyPattern(): Pattern {
  return {
    kick: Array(STEPS).fill(false),
    snare: Array(STEPS).fill(false),
    hat: Array(STEPS).fill(false),
    openhat: Array(STEPS).fill(false),
  };
}

// 룩어헤드 스텝 시퀀서 (Chris Wilson "A Tale of Two Clocks" 패턴).
// setInterval로 조금 앞을 미리 스케줄하고, 플레이헤드는 rAF로 그린다.
export class DrumSequencer {
  private pattern: Pattern = emptyPattern();
  private bpm = 120;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private nextStep = 0;
  private onStep: ((step: number) => void) | null = null;
  private drawQueue: { step: number; time: number }[] = [];
  private raf = 0;

  private readonly lookaheadMs = 25;
  private readonly scheduleAhead = 0.1; // 초

  setPattern(p: Pattern): void {
    this.pattern = p;
  }
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }
  setOnStep(cb: (step: number) => void): void {
    this.onStep = cb;
  }
  get playing(): boolean {
    return this.timer !== null;
  }

  private stepDuration(): number {
    return 60 / this.bpm / 4; // 16분음표 한 칸
  }

  async start(): Promise<void> {
    if (this.timer !== null) return;
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();
    this.nextStep = 0;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), this.lookaheadMs);
    this.raf = requestAnimationFrame(() => this.draw());
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    cancelAnimationFrame(this.raf);
    this.drawQueue = [];
    this.onStep?.(-1);
  }

  private schedule(): void {
    const ctx = getAudioContext();
    while (this.nextStepTime < ctx.currentTime + this.scheduleAhead) {
      for (const { id } of TRACKS) {
        if (this.pattern[id][this.nextStep]) trigger(id, this.nextStepTime);
      }
      this.drawQueue.push({ step: this.nextStep, time: this.nextStepTime });
      this.nextStepTime += this.stepDuration();
      this.nextStep = (this.nextStep + 1) % STEPS;
    }
  }

  private draw(): void {
    const now = getAudioContext().currentTime;
    let current = -1;
    while (this.drawQueue.length > 0 && this.drawQueue[0].time <= now) {
      current = this.drawQueue.shift()!.step;
    }
    if (current !== -1) this.onStep?.(current);
    if (this.timer !== null) {
      this.raf = requestAnimationFrame(() => this.draw());
    }
  }
}
