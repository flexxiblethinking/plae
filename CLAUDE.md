# CLAUDE.md

중학교 1학년 대상 AI 음악 제작 특강용 웹 애플리케이션. 학생이 자연어로 음악을 묘사하면 LLM 하네스가 이를 Strudel 코드 또는 MusicGen 프롬프트로 변환하여 음악을 생성·재생한다.

---

## 1. PRD 핵심 요구사항

### 사용자
- **학생**: 중1, 7학급 × 약 20명, 1인 1태블릿 + 1구글 계정 (무료)
- **강사**: 본인 (수업 모니터링, 사용량 관리)

### 핵심 기능
1. **구글 OAuth 로그인** — 학교 무료 구글 계정으로 인증
2. **자연어 입력** — 학생이 음악을 텍스트로 묘사
3. **모드 분리**:
   - **객관 모드 (Strudel)**: 음악 이론 어휘 → 결정론적 코드/패턴 생성
   - **감성 모드 (MusicGen)**: 분위기·감성 어휘 → 오디오 클립 생성
4. **생성·재생** — 결과물을 브라우저에서 즉시 청취
5. **저장·공유 (옵션)** — 학생 본인의 작품 저장, 학급 내 갤러리
6. **사용량 제한** — 학생당 일일/누적 호출 횟수 제한

### 비기능 요구사항
- **동시성**: 최대 약 20명 동시 요청 안정 처리
- **응답성**: Strudel 변환 ≤3초, MusicGen 생성 ≤30초 (사용자 인지 기준)
- **보안**: API 키 클라이언트 노출 금지, 부적절 입력 필터링
- **비용 통제**: 학생당 약 1,000원 이내, 전체 ≤140,000원

---

## 2. 기술 스택

| 레이어 | 선택 | 비고 |
|--------|------|------|
| 프론트엔드 | React + Vite (또는 Next.js) | 단일 페이지 웹앱 |
| Strudel | `@strudel/web` 패키지 또는 strudel.cc iframe | REPL 컴포넌트 임베드 |
| 백엔드 (프록시) | Cloudflare Workers 또는 Vercel Edge Functions | 서버리스, 무료 티어 |
| 인증 | Google OAuth 2.0 | 학교 구글 계정 |
| LLM (하네스) | Anthropic Claude Haiku | 자연어 → Strudel/MusicGen 프롬프트 변환 |
| 음악 생성 모델 | MusicGen (HF Inference Endpoint) | medium 모델 우선 검토 |
| 데이터 저장 | Cloudflare D1 (SQLite) | 사용자, 사용량 로그, 작품 메타데이터. 관계형·원자성 필요 |
| 작품 오디오 저장 | Cloudflare R2 (옵션) | MusicGen 결과물 보관 시 |
| 모니터링 | 간단한 로그 + 강사용 대시보드 | 학급별 사용량 확인 |

---

## 3. 아키텍처 개요

```
[학생 태블릿 (브라우저)]
   │
   │ Google OAuth
   ▼
[Frontend (React SPA)]
   │  ┌─────────────────────────────┐
   │  │ - Strudel REPL 임베드        │
   │  │ - 입력 UI (객관/감성 모드)    │
   │  │ - 결과 재생/저장 UI          │
   │  └─────────────────────────────┘
   │
   │ HTTPS (인증 토큰 포함)
   ▼
[Backend Proxy (Cloudflare Workers)]
   │  ┌─────────────────────────────┐
   │  │ - 인증 검증                  │
   │  │ - 사용량 카운터 (D1)         │
   │  │ - 입력 안전 필터             │
   │  │ - LLM/모델 라우팅             │
   │  └─────────────────────────────┘
   │
   ├──────────────┐
   ▼              ▼
[Anthropic API]   [HF Inference Endpoint]
 (Haiku 하네스)    (MusicGen)
```

### 데이터 흐름
1. **객관 모드**: 학생 입력 → Workers → Haiku (Strudel DSL 생성) → 클라이언트 Strudel REPL 실행
2. **감성 모드**: 학생 입력 → Workers → Haiku (MusicGen 프롬프트 정제) → MusicGen Endpoint → 오디오 반환 → 클라이언트 재생

---

## 4. 구현 단계

### Phase 1 — 인프라 골격 (최우선)
- [ ] Cloudflare Workers 프로젝트 셋업
- [ ] Google OAuth 통합 (학교 도메인 화이트리스트 가능 시 적용)
- [ ] Anthropic API 프록시 엔드포인트 (`POST /api/generate/strudel`)
- [ ] D1 기반 사용자/사용량 테이블 (학생별 일일 카운터)
- [ ] 기본 React 프론트엔드 + 로그인 흐름

### Phase 2 — Strudel 통합 (객관 모드)
- [ ] Strudel REPL 컴포넌트 임베드
- [ ] Haiku 하네스 시스템 프롬프트 v1 작성 (음악 이론 어휘 → Strudel DSL)
- [ ] 입력 → 코드 생성 → 재생 end-to-end 확인
- [ ] 출력 파싱·검증·fallback 로직

### Phase 3 — MusicGen 통합 (감성 모드)
- [ ] HF Inference Endpoint 배포 (musicgen-medium)
- [ ] MusicGen 프록시 엔드포인트 (`POST /api/generate/musicgen`)
- [ ] Haiku 하네스: 학생 입력 → MusicGen용 영문 프롬프트 정제
- [ ] 오디오 클립 클라이언트 재생 (HTMLAudioElement 또는 Web Audio)

### Phase 4 — 안전·관리 기능
- [ ] 입력 필터링 (금칙어, 부적절 표현)
- [ ] 학생당 사용량 한도 enforce
- [ ] 강사용 모니터링 대시보드 (학급별 사용량, 에러 로그)
- [ ] (옵션) 작품 저장·공유 기능

### Phase 5 — 수업 직전 검증
- [ ] 학교 네트워크 환경 테스트 (가능하면 사전 방문)
- [ ] 태블릿 브라우저 호환성 테스트 (특히 Web Audio API)
- [ ] 동시 요청 부하 테스트 (20명 시뮬레이션)
- [ ] MusicGen Endpoint 워밍업 절차 문서화

---

## 5. 컨벤션

### 코드
- **언어**: TypeScript (프론트·백엔드 공통)
- **포매팅**: Prettier, ESLint
- **네이밍**: camelCase (변수·함수), PascalCase (컴포넌트·타입), SCREAMING_SNAKE_CASE (env)
- **커밋**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

### API 설계
- REST 기반, JSON I/O
- 엔드포인트는 `/api/<resource>/<action>` 형태
- 응답: `{ ok: boolean, data?: T, error?: { code, message } }`
- 인증: `Authorization: Bearer <google_id_token>` 헤더

### LLM 하네스 규칙
- 시스템 프롬프트에 **출력 형식 강제** (JSON 또는 명확한 마커)
- few-shot 예시 충분히 포함
- 출력 파싱 실패 시 fallback 반환 (사용자에게 친절한 에러)
- 사용자 입력은 **항상 user role**로만 전달, 시스템 프롬프트에 삽입 금지 (prompt injection 방지)

### 보안
- 모든 API 키는 Workers Secret으로 관리 (코드·저장소에 평문 금지)
- 클라이언트는 Anthropic/HF 직접 호출 금지, 반드시 프록시 경유
- 학생 입력은 서버 측 필터 통과 후에만 모델 호출
- 로그에 PII (이메일 등) 저장 금지, 필요시 해시 처리

### 환경 변수
```
ANTHROPIC_API_KEY=
HF_ENDPOINT_URL=
HF_TOKEN=
GOOGLE_OAUTH_CLIENT_ID=
ALLOWED_EMAIL_DOMAIN=        # 학교 도메인 (가능 시)
DAILY_QUOTA_PER_STUDENT=     # 일일 호출 횟수 제한
```

### 디렉토리 구조 (제안)
```
/
├── apps/
│   ├── web/              # React 프론트엔드
│   └── api/              # Cloudflare Workers
├── packages/
│   └── shared/           # 공통 타입·유틸
├── docs/
│   ├── curriculum/       # 차시별 수업 계획
│   └── harness/          # LLM 하네스 프롬프트 버전 관리
└── CLAUDE.md
```

---

## 6. 오픈 이슈 / TODO

- [ ] 담당 음악 교사와 진도 확인 → 음악 이론 어휘 범위 확정
- [ ] 학교 네트워크/태블릿 사양 확인
- [ ] 학교 구글 계정 도메인 정책 확인 (OAuth 허용 도메인 설정용)
- [ ] 차시별 커리큘럼 (6차시 또는 8차시) 작성
- [ ] 하네스 시스템 프롬프트 v1 작성 및 테스트
- [ ] MusicGen 모델 사이즈 선정 (small vs medium 비교 테스트)
