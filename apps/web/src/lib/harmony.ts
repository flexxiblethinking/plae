// harmony.ts — 결정론적 화성 생성.
//
// 화성 레이어는 LLM을 거치지 않는다. 학생이 조성(C장조/A단조)과 4마디
// 화음 진행을 고르면, 고정 테이블을 조회해 Strudel 코드(화음 + 베이스)를
// 즉시 조립한다. 교육과정 어휘(으뜸·버금딸림·딸림화음)를 그대로 노출한다.

export type KeyMode = "major" | "minor"; // C장조 / A단조
export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ChordInfo = {
  chord: string; // note() 안에 들어갈 화음 음들, 예: "c3,e3,g3"
  bass: string; // 베이스 근음(2옥타브), 예: "c2"
  roman: string; // 진행 표기용 로마숫자, 예: "I"
};

// 7음계 다이어토닉 3화음 — 모두 흰 건반(조표 없음). 화음은 3~4옥타브,
// 베이스는 2옥타브. A단조는 C장조의 나란한조라 음 구성이 그대로 돈다.
const CHORDS: Record<KeyMode, Record<ScaleDegree, ChordInfo>> = {
  major: {
    1: { chord: "c3,e3,g3", bass: "c2", roman: "I" },
    2: { chord: "d3,f3,a3", bass: "d2", roman: "ii" },
    3: { chord: "e3,g3,b3", bass: "e2", roman: "iii" },
    4: { chord: "f3,a3,c4", bass: "f2", roman: "IV" },
    5: { chord: "g3,b3,d4", bass: "g2", roman: "V" },
    6: { chord: "a3,c4,e4", bass: "a2", roman: "vi" },
    7: { chord: "b3,d4,f4", bass: "b2", roman: "vii°" },
  },
  minor: {
    1: { chord: "a3,c4,e4", bass: "a2", roman: "i" },
    2: { chord: "b3,d4,f4", bass: "b2", roman: "ii°" },
    3: { chord: "c3,e3,g3", bass: "c2", roman: "III" },
    4: { chord: "d3,f3,a3", bass: "d2", roman: "iv" },
    5: { chord: "e3,g3,b3", bass: "e2", roman: "v" },
    6: { chord: "f3,a3,c4", bass: "f2", roman: "VI" },
    7: { chord: "g3,b3,d4", bass: "g2", roman: "VII" },
  },
};

// 주요 3화음 — 중1 교육과정 코어. 교육과정 어휘로 라벨링.
export const CORE_DEGREES: ScaleDegree[] = [1, 4, 5];
// 확장 화음 — "더 해보고 싶을 때". 로마숫자로 라벨링.
export const EXTENSION_DEGREES: ScaleDegree[] = [2, 3, 6, 7];

const CORE_LABEL: Record<number, string> = {
  1: "으뜸화음",
  4: "버금딸림화음",
  5: "딸림화음",
};

const KEY_NAME: Record<KeyMode, string> = {
  major: "C장조",
  minor: "A단조",
};

export function keyName(mode: KeyMode): string {
  return KEY_NAME[mode];
}

// 화음 선택지에 보여줄 라벨. 주요 3화음은 교육과정 용어, 확장은 로마숫자.
export function chordLabel(mode: KeyMode, degree: ScaleDegree): string {
  return CORE_LABEL[degree] ?? CHORDS[mode][degree].roman;
}

export type HarmonyLayer = {
  code: string; // 화음 패턴 (note(...) 한 줄)
  bassCode: string; // 베이스 패턴 (note(...) 한 줄)
  description: string; // 레이어 목록에 표시할 요약
  explanation: string; // 학생용 한국어 설명
};

// 조성 + 4마디 화음 진행 → Strudel 코드(화음/베이스). 마디당 코드 하나.
export function buildHarmonyLayer(
  mode: KeyMode,
  degrees: ScaleDegree[],
): HarmonyLayer {
  const infos = degrees.map((d) => CHORDS[mode][d]);
  const code = `note("<[${infos.map((i) => i.chord).join("] [")}]>")`;
  const bassCode = `note("<${infos.map((i) => i.bass).join(" ")}>")`;
  const romans = infos.map((i) => i.roman).join("–");
  const description = `${KEY_NAME[mode]} · ${romans}`;
  const explanation = `${KEY_NAME[mode]}에서 ${romans} 순서로 화음을 쌓고, 베이스는 각 화음의 으뜸음을 따라가게 했어요.`;
  return { code, bassCode, description, explanation };
}

// 위저드 기본값 — 으뜸–버금딸림–딸림–으뜸 (가장 익숙한 교육과정 진행).
export const DEFAULT_DEGREES: ScaleDegree[] = [1, 4, 5, 1];
