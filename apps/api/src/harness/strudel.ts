// Strudel harness — system prompt v2 (layered composition).
//
// Version-controlled here. Mirror non-trivial changes to
// `docs/harness/strudel-v2.md` for review history.
//
// CLAUDE.md §5: never interpolate user input into the system prompt
// (prompt-injection surface). The student's free text is passed only as
// the `description` field inside the structured user turn.
//
// This harness generates ONE layer of a 4-bar loop at a time — a drum,
// bass, chord, or melody pattern that fits the layers already in the
// composition. The student stacks layers one by one (코딩→자연어,
// 듣고→판단하고→더 쌓고). The client assembles `setcpm(bpm/4)` + each
// layer as a `$:` line; layer code itself never contains setcpm.

export type LayerType = "drum" | "bass" | "chord" | "melody";

export const STRUDEL_SYSTEM_PROMPT = `당신은 중학교 1학년 학생을 위한 음악 코드 생성 도우미입니다.
학생이 자연어로 묘사한 한 개의 "레이어"를 Strudel DSL 패턴으로 변환합니다.
학생은 레이어를 하나씩 쌓아 4마디 루프를 완성합니다.

[레이어 타입]
- drum: 드럼 패턴. s("bd hh sd hh") — bd=베이스드럼, sd=스네어, hh=하이햇, cp=박수
- bass: 베이스 라인. note("c2 e2 g2 c2") 처럼 낮은 음(2~3옥타브)
- chord: 코드 반주. note("c3,e3,g3") 처럼 쉼표로 음을 동시에 — 화음
- melody: 멜로디. note("c4 e4 g4 e4") 처럼 한 음씩 이어지는 가락(4~5옥타브)

[Strudel 문법]
- note("c d e f g"), s("bd hh sd hh") — 시퀀스
- 동시 재생(화음): note("c3,e3,g3")
- 한 칸에 여러 음: note("[c4 e4] g4")
- 쉼표 대신 빈 칸: note("c4 ~ e4 ~")
- .slow(2), .fast(2) — 길이 조절

[규칙]
1. 출력 code는 **패턴 한 줄**만. setcpm, stack, $: 는 절대 쓰지 않음 (클라이언트가 조립)
2. eval, fetch, import, require, window, document 등 절대 출력 금지
3. 주어진 레이어 타입에 맞는 패턴을 생성. 학생 설명의 분위기·리듬·셈여림을 반영
4. 기존 레이어가 있으면 그것과 어울리게 (같은 박자 느낌, 보완적 리듬)
5. 4마디 안에서 반복되는 깔끔한 패턴으로
6. explanation은 한국어 1~2문장, 친절한 어투. 학생이 배운 음악 용어를 활용
7. **첫 레이어**(기존 레이어 없음)일 때만 bpm을 60~140 사이 정수로 정함. 학생 설명이 빠르면 높게, 느리면 낮게. 이후 레이어에서는 bpm을 출력하지 않음

[출력 형식]
JSON: { "code": "...", "explanation": "...", "bpm": 정수 또는 생략 }

[예시]
입력: 타입=drum, 설명="신나고 빠른 드럼", 기존 레이어 없음
출력: { "code": "s(\\"bd hh sd hh bd hh sd hh\\")", "explanation": "베이스드럼과 스네어를 번갈아 쳐서 신나는 4박자 리듬을 만들었어요.", "bpm": 128 }

입력: 타입=bass, 설명="드럼에 맞춰 통통 튀는 베이스", 기존 레이어=[drum: s("bd hh sd hh")]
출력: { "code": "note(\\"c2 ~ c2 e2 g2 ~ e2 ~\\")", "explanation": "드럼 박자에 맞춰 낮은 음으로 통통 튀는 베이스를 깔았어요." }

입력: 타입=chord, 설명="잔잔한 화음", 기존 레이어=[drum: ..., bass: ...]
출력: { "code": "note(\\"<c3,e3,g3> <a2,c3,e3>>\\").slow(2)", "explanation": "C 코드와 A 코드를 천천히 번갈아 연주해서 잔잔한 화음을 더했어요." }
`;

export const STRUDEL_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description:
        "A single line of Strudel DSL for one layer. No setcpm, no stack, no $: prefix, no imports.",
    },
    explanation: {
      type: "string",
      description:
        "Short Korean explanation for a 7th-grade student (1-2 sentences).",
    },
    bpm: {
      type: "integer",
      description:
        "Tempo in BPM (60-140). Set ONLY for the first layer; omit otherwise.",
    },
  },
  required: ["code", "explanation"],
  additionalProperties: false,
} as const;

// Defense-in-depth on top of the model's instructions. Reject obviously
// dangerous output before returning to the client.
const FORBIDDEN_PATTERNS = [
  /\beval\b/i,
  /\bfetch\b/i,
  /\bimport\b/i,
  /\brequire\b/i,
  /\bwindow\b/i,
  /\bdocument\b/i,
  /<script/i,
];

export function isStrudelCodeSafe(code: string): boolean {
  return !FORBIDDEN_PATTERNS.some((re) => re.test(code));
}
