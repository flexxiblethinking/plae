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
  await initStrudelOnce();

  // Browsers (Safari especially) keep the AudioContext suspended until an
  // explicit resume inside a user gesture. playStrudel runs from the click
  // handler, so resuming here is reliable.
  const ctx = getAudioContext();
  if (ctx.state !== "running") {
    await ctx.resume();
  }

  await evaluate(code);
}

export function stopStrudel(): void {
  try {
    hush();
  } catch {
    // hush() before init has nothing to stop — safe to ignore.
  }
}
