# 국민대학교 성과관리통합시스템 (Phase 2 프로토타입)

교수 성과 지표체계·평가를 SQLite에 구현하고, 시드 고정 가상 데이터(교수 600명·5개년)를
생성·검증하는 웹앱 스캐폴드입니다. 산식·계수·분포는 전부 파라미터 테이블에 저장하며
(하드코딩 금지), 생성기와 런타임이 동일한 계산 엔진을 공유합니다.

**현재 반영 버전: 지표체계 v1.2 (국민대 현행 「교원업적평가규정」)** — 논문 IF 백분위 계단배점,
저자환산 2/(N+k), 신형 계열그룹 5종 + 임용시기 버전 라우팅, Quality Gate·Moving Target(V_2024 신임),
예체능 실기 배점, 특허·연구비 국민대 실값. (v1.1 곱셈 q는 대안 계수군으로 보존)

- 설계 근거: `../../02_기획/04_데이터모델.md`(스키마), `../../02_기획/01_교수지표체계.md`(v1.2), `../../02_기획/06_파라미터변경_v1.2.md`(마이그레이션 스펙)
- 설계와 달라진 점·캘리브레이션 실측·v1.2 마이그레이션: `../../02_기획/05_구현노트_Phase2.md`(§7)

## 🔗 라이브 데모

**https://dongjinshin-kookmin.github.io/kmu-performance-system/**

Next.js 정적 export(`output: 'export'`) 산출물을 GitHub Pages로 서빙합니다.
모든 서버 컴포넌트 쿼리는 **빌드 타임에 SQLite에서 실행**되어 정적 HTML로 굳으며,
교원 600명·직원 100명 성과카드를 포함해 전 화면이 사전 생성됩니다(약 830페이지).

빌드: `GITHUB_PAGES=true BASE_PATH=/kmu-performance-system npm run build` → `out/` 생성.
CI 자동 배포용 GitHub Actions 워크플로가 `.github/workflows/deploy.yml`에 준비되어 있습니다
(`main` push → db:rebuild → export → Pages 배포). 이 파일을 원격에 커밋하려면 토큰에
`workflow` 스코프가 필요합니다(`gh auth refresh -s workflow`).

### 데모 제약 (정적 배포)
정적 사이트에는 서버가 없어 요청별 쿠키/세션 분기가 불가능합니다. 따라서 데모는:
- **역할 = 인사팀(전사 열람) 고정** — 사이드바 역할 전환 UI는 로컬 실행에서만 동작합니다.
  (총장 뷰 개인정보 마스킹, 교수 본인 SELF 범위 제한 등 RBAC 시연은 로컬에서 확인)
- 직원 성과카드의 **반기 선택은 최신 반기 고정** (추이 차트는 전 반기 표시).
- 성과카드 드릴다운·성과 총람(성과맵) 클릭·차트·테마·사이드바 내비게이션 등
  **클라이언트 상호작용은 정상 동작**합니다.
- 반면 서버 쿼리스트링에 의존하는 필터(학과/부서 상세 선택, 계열·부서유형 필터,
  상관분석 히트맵 축 전환)는 **기본 뷰로 고정**됩니다. (전체 데이터를 빌드타임에
  주입해 `useSearchParams` 클라이언트 선택으로 전환하면 복원 가능 — 후속 개선 항목)

전체 기능(역할 전환·반기 전환·쿠키 RBAC)은 아래 **로컬 실행**으로 확인하세요.

## 기술 스택
- Next.js 15 (App Router, TypeScript) · React 19
- better-sqlite3 (동기 임베디드 DB) — 스키마는 마이그레이션 SQL + 초기화 스크립트로 단순 관리
- 생성기: seedrandom(시드 고정) + 자체 분포 샘플러(포아송/로그정규/베타/절단정규/ZIP)
- 설치만 된 UI 라이브러리: tailwindcss, recharts, framer-motion (Phase 3 대시보드용)

## 빠른 시작
```bash
npm install
npm run db:rebuild     # = db:init → db:seed → db:validate 순차 실행
npm run dev            # http://localhost:3000 스캐폴드 확인 페이지
```

## 명령어
| 명령 | 설명 |
|---|---|
| `npm run db:init` | 기존 DB 삭제 후 `db/migrations/001_init.sql` 실행 (28개 테이블) |
| `npm run db:seed` | 가상 데이터 생성 (`--seed=<문자열>`로 시드 변경 가능, 기본 `kmu-perf-2026`) |
| `npm run db:validate` | 정합성 6종 검사 → `data/validation-report.txt` 저장, 실패 시 exit 1 |
| `npm run db:rebuild` | 위 3개를 순서대로 |
| `npm run dev` / `build` / `start` | Next.js 개발/빌드/프로덕션 (UI: 대시보드·성과카드·드릴다운·워크플로·지표투명성 + RBAC 역할전환 시뮬레이터) |

생성 산출물: `data/kmu.db`(약 16MB), `data/validation-report.txt`.

## 디렉터리 구조
```
db/migrations/001_init.sql       # SQLite DDL (차원·지표·파라미터·실적·평가·RBAC·공시)
scripts/
  init-db.ts    seed.ts    validate.ts
src/
  lib/db.ts                      # 앱 런타임 DB 커넥션(WAL, FK on)
  generator/
    rng.ts                       # 시드 RNG + 분포 샘플러
    seedData.ts                  # 파라미터·지표 마스터 시드값(배점·계수·분포)
    loadParams.ts                # param_* → 타입 구조 로더
    content/
      departments.ts             # 학과 50개 + 학과별 주제/저널/교과목 풀
      lexicon.ts                 # 인명·저널·제목·과제명·특허·강의명 조합기
    engine/                      # 생성기·앱 공용 계산 엔진
      score.ts                   # formula_type별 환산(PAPER_SUM·GRANT_SUM·IP_SUM·COUNT_WEIGHT…)
      composite.ts               # 영역 표준화·트랙 가중·종합점수·가점(5종)
      grade.ts                   # 절대컷 + 상대배분 상한 병기
      gate.ts                    # Quality Gate(IF 편수) + Moving Target 판정(현행, V_2024)
    generators/
      core.ts                    # 조직·기간·사이클·인물·계정
      activity.ts                # 실적 이벤트 + 상세(논문/연구비/특허) + 환산
      evaluation.ts              # 집계·공시·캘리브레이션·평가·워크플로
app/                             # Next.js — 데이터 요약 확인 페이지
```

## 데이터 생성 규모 (기본 시드, v1.2)
- 교수 600명(계열그룹 5종·50학과), 직원 100명(25부서, 골격), 5개년(2021~2025)
- fact_activity 33,128건(PAPER 5,389·ART 2,206·OSS 20 등) · fact_indicator_score 49,286
- fact_evaluation 3,000 · dim_moving_target 50 · dim_criteria 8 · DB 16.2MB
- 2025 종합점수 평균 85.8 · 등급 S 57 / A 150 / B 206 / C 159 / D 28
- Quality Gate(V_2024 신임 72명) 충족 18명 · Moving Target 달성률 평균 127% · 1인당 SCI급 0.79건
- 검증 8종 전체 통과 (개인=학과집계, 등급상한, 종합평균 80~90, 논문분포+SCI앵커, 학과-주제정합, 버전라우팅, 게이트, MT)

## 드릴다운 상세 데이터
각 실적 레코드는 클릭 시 실제 실적 수준의 상세를 갖습니다(학과 전공과 정합):
- 논문: 전공 주제 제목(국내지 국문/국제지 영문), 학과별 KCI 저널·계열별 국제 저널, 권·호·페이지,
  발행월, 저자 역할·총 저자수, 공저자 목록, DOI
- 연구비: 과제명·지원기관·프로그램·기간·총액·역할
- 특허/기술이전: 발명 명칭·출원/등록번호·발명자 지분·계약사·수입료
- 강의: 교과목명·분반·수강인원·강의평가

예) 영어영문학과 교수 → `담화 화용론의 영향 요인 분석` / KCI `현대영미어문학`,
`Analysis of Second Language Acquisition` / SCOPUS `Acta Koreana`.
