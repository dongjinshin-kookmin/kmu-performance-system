-- =====================================================================
-- 국민대학교 성과관리통합시스템 — SQLite 스키마 v1.0
-- 근거: 02_기획/04_데이터모델.md (29개 테이블, 3계층×3원 스타 스키마)
-- 설계 문서와의 차이는 05_구현노트_Phase2.md에 별도 기록.
-- 타입은 SQLite 스토리지 클래스(INTEGER/REAL/TEXT) 기준.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 3. 차원 테이블
-- ---------------------------------------------------------------------

-- 3.1 dim_org — 조직 (자기참조 트리, 학사 ACAD / 행정 ADMIN)
CREATE TABLE dim_org (
  org_id      INTEGER PRIMARY KEY,
  org_code    TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  org_kind    TEXT    NOT NULL CHECK (org_kind IN ('ACAD','ADMIN')),
  level       TEXT    NOT NULL,  -- 대학/단과대/학과 (ACAD), 본부/부서 (ADMIN)
  parent_id   INTEGER REFERENCES dim_org(org_id),
  series      TEXT,   -- v1.2: 세분 field(인문/사회/경상/체육/예능/ENA/ENB/ENC)
  series_group TEXT,  -- v1.2: 신형 계열그룹(G_HSSP/G_ENA/G_ENB/G_ENC/G_ART)
  dept_type   TEXT,   -- 직원: 부서유형(ACAD_AFF/ADMISSION/... §2)
  sort_order  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1
);

-- 3.2 dim_person — 구성원 공통
CREATE TABLE dim_person (
  person_id       INTEGER PRIMARY KEY,
  person_code     TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  person_type     TEXT    NOT NULL CHECK (person_type IN ('FACULTY','STAFF')),
  org_id          INTEGER NOT NULL REFERENCES dim_org(org_id),
  gender          TEXT,
  appointed_year  INTEGER NOT NULL,
  appointed_version TEXT  CHECK (appointed_version IN ('V_LEGACY','V_2019','V_2024')), -- v1.2 임용시기 버전 라우팅
  birth_year      INTEGER,
  status          TEXT    DEFAULT 'ACTIVE',
  created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 prof_profile — 교수 확장 (1:1)
CREATE TABLE prof_profile (
  person_id       INTEGER PRIMARY KEY REFERENCES dim_person(person_id),
  rank            TEXT    NOT NULL CHECK (rank IN ('정교수','부교수','조교수')),
  promoted_year   INTEGER,
  track_code      TEXT    NOT NULL DEFAULT 'TB',
  is_admin_post   INTEGER DEFAULT 0,
  admin_post_name TEXT,
  tenure          INTEGER DEFAULT 0
);

-- 3.4 staff_profile — 직원 확장 (1:1, 골격만)
CREATE TABLE staff_profile (
  person_id       INTEGER PRIMARY KEY REFERENCES dim_person(person_id),
  job_grade       TEXT    NOT NULL,
  job_family      TEXT,   -- 세부 직군(학사·회계 등)
  job_family_top  TEXT,   -- 직종: GENERAL(일반·기술) / FUNCTIONAL(기능)
  tenure_years    INTEGER DEFAULT 0,
  is_manager      INTEGER DEFAULT 0,
  mgr_role        TEXT,   -- DEPT_HEAD(부서장) / TEAM_LEAD(팀장) / NULL
  eval_type       TEXT    DEFAULT 'PERF' CHECK (eval_type IN ('CONTRACT','PERF'))
);

-- 3.5 dim_period — 달력 기간
CREATE TABLE dim_period (
  period_id  INTEGER PRIMARY KEY,
  year       INTEGER NOT NULL,
  half       INTEGER CHECK (half IN (1,2)),
  semester   INTEGER CHECK (semester IN (1,2)),
  label      TEXT
);

-- 3.6 dim_cycle — 평가 사이클
CREATE TABLE dim_cycle (
  cycle_id          INTEGER PRIMARY KEY,
  target_type       TEXT    NOT NULL CHECK (target_type IN ('FACULTY','STAFF')),
  year              INTEGER NOT NULL,
  half              INTEGER CHECK (half IN (1,2)),
  param_version_id  INTEGER NOT NULL REFERENCES param_version(param_version_id),
  score_model       TEXT    DEFAULT 'ABSOLUTE' CHECK (score_model IN ('ABSOLUTE','TARGET')),
  grade_mode        TEXT    DEFAULT 'BOTH' CHECK (grade_mode IN ('ABS_CUT','REL_DIST','BOTH')),
  open_at           TEXT,
  close_at          TEXT,
  status            TEXT    DEFAULT 'PLANNED'
);

-- ---------------------------------------------------------------------
-- 4. 지표 마스터
-- ---------------------------------------------------------------------
CREATE TABLE dim_indicator (
  indicator_id   TEXT    PRIMARY KEY,
  target_type    TEXT    NOT NULL DEFAULT 'FACULTY',
  area           TEXT    NOT NULL,  -- 교수 R/E/I/S/C / 직원 WORK/ATTITUDE/JOB_COMP/LEADERSHIP/DEPT_SVC/KPI 등
  name           TEXT    NOT NULL,
  definition     TEXT,
  formula_type   TEXT    NOT NULL,
  formula_params TEXT,   -- JSON
  unit           TEXT,
  direction      TEXT    DEFAULT 'UP' CHECK (direction IN ('UP','DOWN')),
  reflect_stage  TEXT    NOT NULL CHECK (reflect_stage IN ('MONITOR','BONUS','SCORE')),
  is_new         INTEGER DEFAULT 0,
  data_source    TEXT,
  paired_with    TEXT,
  sort_order     INTEGER
);

-- ---------------------------------------------------------------------
-- 5. 파라미터 테이블 (하드코딩 금지)
-- ---------------------------------------------------------------------
CREATE TABLE param_version (
  param_version_id INTEGER PRIMARY KEY,
  label            TEXT    NOT NULL UNIQUE,
  effective_from   TEXT,
  is_default       INTEGER DEFAULT 0,
  note             TEXT
);

CREATE TABLE param_track_weight (
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  track_code       TEXT    NOT NULL CHECK (track_code IN ('TR','TB','TE','TI')),
  track_name       TEXT,
  w_R              INTEGER NOT NULL,
  w_E              INTEGER NOT NULL,
  w_I              INTEGER NOT NULL,
  w_S              INTEGER NOT NULL,
  is_default_track INTEGER DEFAULT 0,
  PRIMARY KEY (param_version_id, track_code),
  CHECK (w_R + w_E + w_I + w_S = 100)
);

CREATE TABLE param_grade_policy (
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  target_type      TEXT    NOT NULL,
  mode             TEXT    NOT NULL CHECK (mode IN ('ABS_CUT','REL_DIST')),
  grade            TEXT    NOT NULL CHECK (grade IN ('S','A','B','C','D')),
  cut_score        REAL,
  dist_ratio       REAL,
  PRIMARY KEY (param_version_id, target_type, mode, grade)
);

CREATE TABLE param_coefficient (
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  coef_group       TEXT    NOT NULL,
  coef_key         TEXT    NOT NULL,
  coef_value       REAL    NOT NULL,
  note             TEXT,
  PRIMARY KEY (param_version_id, coef_group, coef_key)
);

CREATE TABLE param_benchmark (
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  track_code       TEXT    NOT NULL,
  series           TEXT    NOT NULL,
  area             TEXT    NOT NULL,
  benchmark_score  REAL    NOT NULL,
  cap              REAL    DEFAULT 120,
  floor            REAL    DEFAULT 0,
  PRIMARY KEY (param_version_id, track_code, series, area)
);

CREATE TABLE param_distribution (
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  metric_key       TEXT    NOT NULL,
  series           TEXT    NOT NULL,
  dist_type        TEXT    NOT NULL,
  dist_params      TEXT    NOT NULL,  -- JSON
  PRIMARY KEY (param_version_id, metric_key, series)
);

-- ---------------------------------------------------------------------
-- 6. 실적 팩트
-- ---------------------------------------------------------------------
CREATE TABLE fact_activity (
  activity_id   INTEGER PRIMARY KEY,
  person_id     INTEGER NOT NULL REFERENCES dim_person(person_id),
  indicator_id  TEXT    NOT NULL REFERENCES dim_indicator(indicator_id),
  period_id     INTEGER NOT NULL REFERENCES dim_period(period_id),
  activity_type TEXT    NOT NULL,
  title         TEXT,
  occurred_on   TEXT,
  attributes    TEXT,   -- JSON
  claim_status  TEXT    DEFAULT 'AUTO' CHECK (claim_status IN ('AUTO','CLAIMED','EDITED','REJECTED')),
  evidence_url  TEXT,
  source        TEXT,
  created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE act_paper (
  activity_id    INTEGER PRIMARY KEY REFERENCES fact_activity(activity_id),
  grade          TEXT    NOT NULL,   -- 코스 유형(SCI/SSCI_AHCI/SCOPUS/KCI/KCI_CAND/DOM) — quality gate SCI급 판정용
  if_band        TEXT,   -- v1.2 IF 백분위 계단배점 밴드(SNC/SCIE_P5/P10/P25/P50/SCIE_GEN/SSCI_AHCI/SCOPUS/INTL_GEN/KCI/KCI_CAND/DOM_GEN)
  author_role    TEXT    NOT NULL CHECK (author_role IN ('SOLE','FIRST','CORRESP','CO')),
  author_n       INTEGER NOT NULL CHECK (author_n >= 1),
  author_k       INTEGER DEFAULT 1, -- v1.2 주저자·교신 인원 k(가변 분모 2/(N+k))
  jcr_quartile   TEXT,   -- 참고용(TOP10/Q1/Q2/Q3/Q4/NA)
  is_intl_coauth INTEGER DEFAULT 0,
  is_oa          INTEGER DEFAULT 0,
  asjc_field     TEXT,
  is_fusion      INTEGER DEFAULT 0,
  citations_3y   INTEGER DEFAULT 0,
  fwci           REAL
);

CREATE TABLE act_grant (
  activity_id  INTEGER PRIMARY KEY REFERENCES fact_activity(activity_id),
  amount_won   INTEGER NOT NULL,
  role         TEXT    CHECK (role IN ('PI','CO')),
  researcher_n INTEGER,
  fund_source  TEXT
);

CREATE TABLE act_ip (
  activity_id    INTEGER PRIMARY KEY REFERENCES fact_activity(activity_id),
  ip_kind        TEXT    NOT NULL,  -- INTL_REG/INTL_APP/DOM_REG/DOM_APP/SW/TECH_TRANSFER
  inventor_share REAL    DEFAULT 1.0,
  income_won     INTEGER
);

CREATE TABLE fact_indicator_score (
  score_id         INTEGER PRIMARY KEY,
  indicator_id     TEXT    NOT NULL REFERENCES dim_indicator(indicator_id),
  person_id        INTEGER REFERENCES dim_person(person_id),
  org_id           INTEGER REFERENCES dim_org(org_id),
  period_id        INTEGER NOT NULL REFERENCES dim_period(period_id),
  param_version_id INTEGER NOT NULL REFERENCES param_version(param_version_id),
  raw_value        REAL,
  converted_score  REAL,
  grain            TEXT    NOT NULL CHECK (grain IN ('PERSON','ORG')),
  computed_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (indicator_id, person_id, org_id, period_id, param_version_id)
);

-- ---------------------------------------------------------------------
-- 7. 평가 팩트
-- ---------------------------------------------------------------------
CREATE TABLE fact_evaluation (
  eval_id           INTEGER PRIMARY KEY,
  cycle_id          INTEGER NOT NULL REFERENCES dim_cycle(cycle_id),
  person_id         INTEGER NOT NULL REFERENCES dim_person(person_id),
  track_code        TEXT,
  composite_score   REAL,   -- 교수: 종합점수 / 직원: 정규화 종합(0~100, 등급용)
  bonus_score       REAL    DEFAULT 0,
  research_total    REAL,   -- v1.2 연구 부문총점(원점수)
  achievement_total REAL,   -- v1.2 업적총점(전 영역 원점수 합)
  -- 직원(STAFF) 전용
  raw_total         REAL,   -- 실제 정기평가 점수(90 또는 200점 만점)
  score_scale       INTEGER,-- 만점(90/200)
  service_score     REAL,   -- 부서 서비스성과(15점 환산 전 0~5)
  gain_points       REAL,   -- 가점 합(부서·개인·포상)
  penalty_points    REAL,   -- 감점(징계)
  adjustment_coef   REAL,   -- 평가집단 조정계수
  mbo_rate          REAL,   -- 개인 MBO 평균 달성률(%)
  grade_abs         TEXT,
  grade_rel         TEXT,
  grade_final       TEXT,
  -- v1.2 [현행] 게이트 축 (V_2024 신임만 적용, 그 외 NULL)
  quality_gate_pass  INTEGER, -- 1=충족 0=미충족 NULL=미적용
  quality_gate_basis TEXT,    -- 'IF'(편수) / 'MT'(Moving Target) / NULL
  moving_target_rate REAL,    -- 달성률(%) = 성취/기준×100, ≥150 통과
  status            TEXT    NOT NULL DEFAULT 'GOAL_SET',
  current_step      INTEGER DEFAULT 1,
  calibrated_flag   INTEGER DEFAULT 0,
  self_comment      TEXT,
  chair_comment     TEXT,
  committee_comment TEXT,
  impact_narrative  TEXT,
  finalized_at      TEXT,
  UNIQUE (cycle_id, person_id)
);

CREATE TABLE fact_evaluation_area (
  eval_id        INTEGER NOT NULL REFERENCES fact_evaluation(eval_id),
  area           TEXT    NOT NULL,  -- 교수 R/E/I/S / 직원 WORK/ATTITUDE/JOB_COMP/LEADERSHIP/DEPT_SVC/C
  raw_score      REAL,
  benchmark      REAL,
  std_score      REAL,
  weight         INTEGER,
  weighted_score REAL,
  qual_grade     TEXT,
  PRIMARY KEY (eval_id, area)
);

CREATE TABLE eval_step_log (
  log_id        INTEGER PRIMARY KEY,
  eval_id       INTEGER NOT NULL REFERENCES fact_evaluation(eval_id),
  step_no       INTEGER NOT NULL,
  from_status   TEXT,
  to_status     TEXT    NOT NULL,
  actor_user_id INTEGER REFERENCES app_user(user_id),
  actor_role    TEXT,
  action        TEXT,
  comment       TEXT,
  acted_at      TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_appeal (
  appeal_id   INTEGER PRIMARY KEY,
  eval_id     INTEGER NOT NULL REFERENCES fact_evaluation(eval_id),
  reason      TEXT    NOT NULL,
  filed_at    TEXT    NOT NULL,
  status      TEXT    DEFAULT 'FILED' CHECK (status IN ('FILED','REVIEWING','ACCEPTED','REJECTED')),
  resolution  TEXT,
  resolved_at TEXT
);

-- ---------------------------------------------------------------------
-- 7b. 동료평가·360도 다면평가 (전향적 제안 — 04 §fact_feedback 후보 구현)
--   블라인드 원칙: 평가자 식별자는 rater_hash(비가역 해시)로만 저장,
--   조회 뷰·API는 rater_hash/rater_org_id를 절대 노출하지 않고 관계유형·평가자수만 공개.
-- ---------------------------------------------------------------------
CREATE TABLE fact_feedback (
  feedback_id   INTEGER PRIMARY KEY,
  cycle_id      INTEGER NOT NULL REFERENCES dim_cycle(cycle_id),
  subject_id    INTEGER NOT NULL REFERENCES dim_person(person_id),  -- 피평가자
  rel_type      TEXT    NOT NULL CHECK (rel_type IN ('MGR_DOWN','PEER','SUBORD_UP','CROSS_DEPT')),
  rater_hash    TEXT    NOT NULL,   -- 평가자 익명 해시(비가역·조회 절대 비노출)
  rater_org_id  INTEGER,            -- 평가자 소속(집계 전용, 개인 식별 불가)
  score_overall REAL,               -- 종합 1~5 (미응답 시 NULL)
  item_scores   TEXT    DEFAULT '{}', -- JSON 문항별 1~5
  comment       TEXT,               -- 익명 서술
  responded     INTEGER NOT NULL DEFAULT 1, -- 1=응답 0=미응답(진행률용)
  created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_feedback_subject ON fact_feedback(subject_id, cycle_id);

-- ---------------------------------------------------------------------
-- 10. 보안(RBAC)·감사·외부 공시
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
  user_id      INTEGER PRIMARY KEY,
  person_id    INTEGER REFERENCES dim_person(person_id),
  login_id     TEXT    NOT NULL UNIQUE,
  display_name TEXT,
  is_active    INTEGER DEFAULT 1
);

CREATE TABLE role (
  role_id   INTEGER PRIMARY KEY,
  role_code TEXT    NOT NULL UNIQUE,
  role_name TEXT,
  scope     TEXT    CHECK (scope IN ('SELF','DEPT','ASSIGNED','ORG_ALL'))
);

CREATE TABLE user_role (
  user_id         INTEGER NOT NULL REFERENCES app_user(user_id),
  role_id         INTEGER NOT NULL REFERENCES role(role_id),
  scope_org_id    INTEGER REFERENCES dim_org(org_id),
  assigned_period TEXT,
  PRIMARY KEY (user_id, role_id, scope_org_id)
);

CREATE TABLE audit_log (
  audit_id     INTEGER PRIMARY KEY,
  user_id      INTEGER REFERENCES app_user(user_id),
  action       TEXT    NOT NULL,
  target_table TEXT,
  target_id    TEXT,
  detail       TEXT,   -- JSON
  ip           TEXT,
  created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ext_disclosure (
  disclosure_id INTEGER PRIMARY KEY,
  year          INTEGER NOT NULL,
  metric_code   TEXT    NOT NULL,
  metric_name   TEXT,
  org_scope     TEXT,
  our_value     REAL,
  peer_avg      REAL,
  unit          TEXT,
  snapshot_at   TEXT
);

CREATE TABLE ext_disclosure_map (
  map_id       INTEGER PRIMARY KEY,
  metric_code  TEXT    NOT NULL,
  indicator_id TEXT    REFERENCES dim_indicator(indicator_id),
  agg_rule     TEXT,
  note         TEXT
);

-- ---------------------------------------------------------------------
-- v1.2 신규: Moving Target 기준값 · 최소기준(승진/승급) 앵커
-- ---------------------------------------------------------------------
-- dim_moving_target — 전공×임용버전 이동 기준값 (별표1-1-7-1)
CREATE TABLE dim_moving_target (
  major_id          INTEGER NOT NULL REFERENCES dim_org(org_id), -- 전공=학과
  appointed_version TEXT    NOT NULL,
  target_value      REAL    NOT NULL, -- 기준값(전공 최근 3년 성취값 중앙값)
  param_version_id  INTEGER NOT NULL REFERENCES param_version(param_version_id),
  PRIMARY KEY (major_id, appointed_version, param_version_id)
);

-- dim_criteria — 승진/승급 최소기준 앵커 (별표1-1-5/7/7-1/8/9, §12)
CREATE TABLE dim_criteria (
  crit_id           INTEGER PRIMARY KEY,
  param_version_id  INTEGER NOT NULL REFERENCES param_version(param_version_id),
  crit_type         TEXT    NOT NULL,  -- PROMOTE(승진)/UPGRADE(승급)
  appointed_version TEXT,              -- 적용 임용버전(NULL=공통)
  series_group      TEXT,              -- 계열그룹(NULL=공통)
  achievement_total REAL,              -- 업적총점 최소
  research_total    REAL,              -- 연구총점 최소
  intl_required     TEXT               -- 국제필수 요건(설명)
);

-- ---------------------------------------------------------------------
-- 인덱스 (조회 성능)
-- ---------------------------------------------------------------------
CREATE INDEX idx_person_org        ON dim_person(org_id);
CREATE INDEX idx_activity_person   ON fact_activity(person_id, period_id);
CREATE INDEX idx_activity_ind      ON fact_activity(indicator_id, period_id);
CREATE INDEX idx_score_person      ON fact_indicator_score(person_id, period_id);
CREATE INDEX idx_score_org         ON fact_indicator_score(org_id, period_id, grain);
CREATE INDEX idx_eval_cycle        ON fact_evaluation(cycle_id);
CREATE INDEX idx_eval_person       ON fact_evaluation(person_id);
CREATE INDEX idx_org_parent        ON dim_org(parent_id);
