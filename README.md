# plae

**Prompt-Layered Audio Engine** — 중학교 1학년 대상 AI 음악 제작 특강용 웹 애플리케이션.

학생이 자연어로 음악을 묘사하면, LLM 하네스가 이를 **Strudel 코드**(객관 모드) 또는 **MusicGen 프롬프트**(감성 모드)로 변환하여 음악을 생성·재생한다.

자세한 PRD/설계는 [`CLAUDE.md`](./CLAUDE.md) 참고.

---

## 요구 사항

- Node.js **20 LTS** 이상 (`>=20.11`)
- pnpm **9.x** (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)

## 설치

```bash
pnpm install
```

## 개발 서버 실행

루트에서 양쪽 동시 실행:

```bash
pnpm dev
```

- 프론트엔드 (Vite): http://localhost:5173
- 백엔드 (Workers): http://localhost:8787
- 헬스체크: http://localhost:8787/api/health

개별 실행:

```bash
pnpm dev:web   # 프론트만
pnpm dev:api   # 백엔드만
```

## 환경 변수

`.env.example`을 참고하여 두 곳에 파일을 만든다:

- `apps/web/.env.local` — Vite가 읽음. `VITE_` 접두사가 있는 키만 브라우저에 노출됨.
- `apps/api/.dev.vars` — Wrangler dev가 읽음. 서버 측 비밀 키 (Anthropic, HF 토큰 등).

**프로덕션 비밀**은 코드/저장소에 절대 두지 말 것. Workers는 `wrangler secret put <KEY>`로 주입.

## 모노레포 구조

```
plae/
├── apps/
│   ├── web/        # React + Vite (학생용 SPA)
│   └── api/        # Cloudflare Workers + Hono (백엔드 프록시)
├── packages/
│   └── shared/     # 프론트·백 공통 타입
└── docs/
    ├── curriculum/ # 차시별 수업 계획
    └── harness/    # LLM 시스템 프롬프트 버전 관리
```

## 다음 단계

Phase 1 나머지 (Google OAuth, Anthropic 프록시, KV 사용량 카운터) 작업 예정. [`CLAUDE.md`](./CLAUDE.md) §4 참고.
