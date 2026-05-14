// @strudel/web ships no type declarations — minimal ambient surface for
// the functions plae actually uses.
declare module "@strudel/web" {
  export function initStrudel(options?: {
    prebake?: () => void | Promise<void>;
    [key: string]: unknown;
  }): Promise<void>;
  export function evaluate(code: string): Promise<unknown>;
  export function hush(): void;
  export function samples(source: string): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function initAudioOnFirstClick(): Promise<void>;
}
