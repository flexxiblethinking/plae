# Strudel 하네스 — v3.1

> 실제 프롬프트는 `apps/api/src/harness/strudel.ts`의 `STRUDEL_SYSTEM_PROMPT`.
> 이 문서는 버전 이력·근거. 설계 출처: `docs/ideas/harness-music-quality.md`.

## v3.1의 범위

**하네스 축소.** 화성(harmony) 레이어가 LLM 하네스에서 빠지고 클라이언트
결정론 생성(`apps/web/src/lib/harmony.ts`)으로 이관됐다. 하네스는 이제
**drum·melody 두 레이어만** 담당한다. BPM도 학생이 직접 정하므로 하네스는
더 이상 빠르기를 결정하지 않는다.

배경: v2.5 테스트에서 음악적 "구조"는 충분하다고 판단됐으나, 중1이 코드나
자연어로 화성을 설계하는 건 무리라는 결론. 화성은 교육과정 어휘(으뜸·버금딸림·
딸림화음)로 "고르는" 결정론적 위저드가 적합 — Haiku의 분산을 없애고, 응답
지연·비용·사용량 차감도 0.

## v2.5 → v3.1 변경점

1. **harmony 레이어 하네스 제거.** chord/bass를 합친 harmony를 LLM이 생성하는
   대신, 클라이언트가 C장조/A단조 다이어토닉 7화음 고정 테이블을 조회해
   `note("<[화음]...>")` + 베이스를 즉시 조립. (`apps/web/src/lib/harmony.ts`)
   - 화성단음계: A단조 딸림화음(V)은 7음을 반음 올린 장3화음(`e3,g#3,b3`).
2. **BPM 결정 규칙 폐기.** v2.5는 "첫 레이어에서만 bpm을 60~140 정수로 정함".
   v3.1은 학생이 BPM 슬라이더로 직접 설정 → 요청에 항상 실어 보냄. 하네스엔
   컨텍스트로만 전달, 출력 안 함.
3. **스키마 변경.**
   - 입력: `layerType`이 `drum|melody`로 좁아짐(harmony 제거), `bpm` 필수화.
   - 출력: `{code, explanation, bpm?}` → `{code, explanation}` (bpm 제거).
4. **프롬프트 정리.** harmony 레이어 규칙·예시 삭제, "bpm 결정" 지시 삭제,
   출력 형식을 `{code, explanation}` 단일 형태로. 기존 레이어 컨텍스트는
   여전히 chord/bass 타입을 받음 — 클라이언트가 harmony를 두 레이어로 펼쳐 전달.

## 폐기된 v3.0 (커밋되지 않음)

v3.1 직전, harmony를 LLM이 chord+bass 두 패턴으로 생성하는 v3.0을 잠깐
프로토타이핑했다(`HARMONY_OUTPUT_SCHEMA` 등). 그러나 "(A) 결정론적 위저드"로
방향이 정해지며 커밋 전 폐기. 커밋 히스토리는 v2.5 → v3.1로 바로 이어진다.

## v3.1의 구조

- 하네스 담당: **drum, melody** (자유 입력 + LLM)
- 클라이언트 담당: **harmony** (결정론 위저드), **BPM** (학생 슬라이더)
- 클라이언트 조립: `setcpm(bpm/4)` + 각 레이어 `$:` 줄. harmony는 베이스·화음
  두 `$:` 줄로 펼침.

## v3.1의 알려진 한계

- drum 레이어가 드럼 패드 모드와 기능 중복 — 다음 라운드에서 정리 예정
  (드럼 패드 패턴 재사용).
- melody는 여전히 자유 입력 + LLM — "규칙화 불가, 제약 안 랜덤" 방향이나
  미착수 (`docs/ideas/harness-music-quality.md` melody 절).
- 악기 음색은 아직 Strudel 기본 신스(triangle 오실레이터). 사운드 시스템
  조사 후 음색 선택을 별도 작업으로 다룸.
- A단조 화성단음계는 딸림화음(V)만 7음을 올림. 확장 화음 III·VII은
  자연단음계(g) 그대로라, V와 VII을 한 루프에 섞으면 g/g# 충돌이 들릴 수 있음.
