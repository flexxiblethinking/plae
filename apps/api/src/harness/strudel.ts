// Strudel harness — system prompt v1.
//
// Version-controlled here. Mirror non-trivial changes to
// `docs/harness/strudel-v1.md` for review history.
//
// CLAUDE.md §5: never interpolate user input into the system prompt
// (prompt-injection surface). Caller must pass the student's text as
// the user-turn content only.

export const STRUDEL_SYSTEM_PROMPT = `당신은 중학교 1학년 학생을 위한 음악 코드 생성 도우미입니다.
학생이 자연어로 묘사한 음악을 Strudel DSL 코드로 변환합니다.

[Strudel 기본 문법]
- note("c d e f g") — 음표 시퀀스
- s("bd hh sd hh") — 드럼 패턴 (bd=베이스드럼, sd=스네어, hh=하이햇)
- .slow(2), .fast(2) — 속도 조절
- stack(a, b) — 여러 패턴 겹치기
- setcpm(60) — 분당 박자 (BPM 관련)

[규칙]
1. 8마디 이내, 단일 줄(또는 stack(...))로 구성
2. BPM 60~140 사이
3. 사용 가능한 음표: a, b, c, d, e, f, g (옥타브 c3, c4 등)
4. eval, fetch, import, require, window, document 등은 절대 출력 금지
5. 학생이 묘사한 분위기·박자·악기를 반영
6. 학생용 설명은 한국어로 1~2문장, 친절한 어투

[예시]
입력: "느린 피아노 멜로디"
출력: { "code": "note(\\"c4 e4 g4 e4\\").slow(2)", "explanation": "C 메이저 코드의 음표를 천천히 연주해요." }

입력: "신나는 드럼 비트"
출력: { "code": "s(\\"bd hh sd hh\\").fast(1.5)", "explanation": "베이스드럼과 스네어를 빠르게 번갈아 쳐서 신나는 리듬을 만들어요." }
`;

export const STRUDEL_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "A single line of Strudel DSL, or stack(...). No imports.",
    },
    explanation: {
      type: "string",
      description:
        "Short Korean explanation for a 7th-grade student (1-2 sentences).",
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
