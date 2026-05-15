// instruments.ts — 레이어 음색(악기) 프리셋.
//
// 경로 A: 새 의존성 없이 Strudel 기본 신스를 다듬는다. 각 프리셋은
// note(...) 패턴 뒤에 붙는 함수 체인 — 오실레이터 선택 + 필터(감산합성)
// + 엔벨로프 + 약간의 공간감. 학생이 레이어별로 고른다.
//
// suffix 값은 청취 기반 튜닝이 필요한 초안 — 한 곳에서 쉽게 조정하도록 모음.

export type Instrument = {
  id: string;
  label: string;
  suffix: string; // note(...) 뒤에 그대로 이어붙는 Strudel 체인
};

export const INSTRUMENTS: Instrument[] = [
  {
    id: "soft",
    label: "소프트",
    suffix: '.s("triangle").lpf(1400).attack(0.03).release(0.2).room(0.25)',
  },
  {
    id: "bright",
    label: "밝은",
    suffix: '.s("sawtooth").lpf(2400).attack(0.01).release(0.15).room(0.15)',
  },
  {
    id: "pure",
    label: "순한",
    suffix: '.s("sine").attack(0.02).release(0.2).room(0.2)',
  },
  {
    id: "retro",
    label: "레트로",
    suffix: '.s("square").lpf(2000).attack(0.01).release(0.1)',
  },
];

export const DEFAULT_INSTRUMENT = "soft";

// 베이스는 학생 선택과 무관하게 저음에 어울리는 고정 음색.
export const BASS_SUFFIX = '.s("triangle").lpf(700).attack(0.01).release(0.2)';

// note(...) 패턴에 악기 음색 체인을 붙인다. instrumentId가 없으면(드럼 등)
// 코드를 그대로 둔다.
export function applyInstrument(
  code: string,
  instrumentId: string | undefined,
): string {
  if (!instrumentId) return code;
  const inst = INSTRUMENTS.find((i) => i.id === instrumentId);
  return inst ? code + inst.suffix : code;
}
