import {
  initStrudel,
  evaluate,
  hush,
  samples,
  getAudioContext,
} from "@strudel/web";

// initStrudel sets up the shared audio context + global pattern scope, and
// registers a one-time mousedown listener that unlocks audio. It must run
// once and EARLY — call initStrudelOnce() on app mount so the unlock
// listener is in place before the student's first click.
//
// The default initStrudel only loads synth sounds (for note(...)); drum
// samples (bd, hh, sd) referenced by s("...") need an explicit prebake.
let initPromise: Promise<void> | null = null;

export function initStrudelOnce(): Promise<void> {
  if (!initPromise) {
    initPromise = Promise.resolve(
      initStrudel({
        prebake: () => samples("github:tidalcycles/dirt-samples"),
      }),
    ).catch((e) => {
      initPromise = null; // allow retry on a later attempt
      throw e;
    });
  }
  return initPromise;
}

export async function playStrudel(code: string): Promise<void> {
  // Safari only unlocks the AudioContext if resume() is *called* synchronously
  // inside the user gesture. playStrudel runs from the Play click handler, so
  // resume() must fire before the first await that can span I/O — awaiting
  // initStrudelOnce() first (it downloads drum samples, slow on a school
  // network) would push resume() past the gesture and leave Safari silent.
  // Chrome's sticky activation is lenient about this; Safari is not. We kick
  // resume() off here and await its promise only after init.
  const ctx = getAudioContext();
  const resumed =
    ctx.state === "running" ? Promise.resolve() : ctx.resume();

  await initStrudelOnce();
  await resumed;
  await evaluate(code);
}

export function stopStrudel(): void {
  try {
    hush();
  } catch {
    // hush() before init has nothing to stop — safe to ignore.
  }
}
