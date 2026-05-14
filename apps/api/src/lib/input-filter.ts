// Server-side input filter — defense-in-depth on top of the harness system
// prompts (CLAUDE.md §5). Blocks obvious profanity / inappropriate input
// before any model call.
//
// This is a STARTER list for a 중1 classroom. The teacher should review and
// extend BANNED_TERMS with terms specific to their students and context —
// it is intentionally version-controlled here so changes are reviewable.
//
// Matching is a simple lowercased substring check: low false-positive rate,
// no evasion-detection arms race. The harness prompts are the second layer.

const BANNED_TERMS: readonly string[] = [
  // 비속어 / 욕설
  "씨발",
  "시발",
  "씨바",
  "시바",
  "ㅅㅂ",
  "ㅆㅂ",
  "병신",
  "ㅂㅅ",
  "지랄",
  "ㅈㄹ",
  "개새끼",
  "개색기",
  "좆",
  "존나",
  "졸라",
  "닥쳐",
  "꺼져",
  "미친놈",
  "미친년",
  "또라이",
  // 성적 표현
  "섹스",
  "야동",
  "포르노",
  "자위",
  "성기",
  // 폭력 / 자해
  "죽여버",
  "죽일거",
  "자살",
  "자해",
  // 차별 / 혐오
  "장애인새끼",
  "병신새끼",
  // English (lowercased)
  "fuck",
  "shit",
  "porn",
];

export type InputFilterResult =
  | { safe: true }
  | { safe: false; matched: string };

export function checkInput(text: string): InputFilterResult {
  const normalized = text.toLowerCase();
  for (const term of BANNED_TERMS) {
    if (normalized.includes(term)) {
      return { safe: false, matched: term };
    }
  }
  return { safe: true };
}
