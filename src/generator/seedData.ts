/**
 * 파라미터·지표 마스터 시드값 적재 (v1.2 — 국민대 현행 규정).
 * 배점·계수·분포·게이트 기준은 전부 param_* 테이블에(하드코딩 금지, 원칙 P1).
 * 근거: 06_파라미터변경_v1.2.md §2~§13, 01_교수지표체계 v1.2.
 * v1.1 곱셈 q·등급점수는 'jcr_quartile_legacy'·'paper_grade_legacy'로 보존(전환 가능).
 */
import type BetterSqlite3 from "better-sqlite3";

export const PARAM_VERSION_ID = 2; // v1.2

const SCI_FIELDS = ["ENA", "ENB", "ENC"];
const HSSP_FIELDS = ["인문", "사회", "경상", "체육"];
const ALL_FIELDS = [...HSSP_FIELDS, "예능", ...SCI_FIELDS];

export function seedParams(db: BetterSqlite3.Database): void {
  const pv = PARAM_VERSION_ID;

  db.prepare(
    `INSERT INTO param_version (param_version_id,label,effective_from,is_default,note)
     VALUES (?,?,?,?,?)`
  ).run(pv, "지표체계 v1.2 (국민대 현행규정)", "2026-07-09", 1,
    "IF백분위 계단배점·2/(N+k)·신형계열그룹·Moving Target·quality gate·예체능 이식");

  // ── 트랙 가중치 ──
  const tw = db.prepare(
    `INSERT INTO param_track_weight (param_version_id,track_code,track_name,w_R,w_E,w_I,w_S,is_default_track) VALUES (?,?,?,?,?,?,?,?)`
  );
  tw.run(pv, "TR", "연구중점", 50, 25, 15, 10, 0);
  tw.run(pv, "TB", "균형", 40, 35, 15, 10, 1);
  tw.run(pv, "TE", "교육우선", 25, 50, 15, 10, 0);
  tw.run(pv, "TI", "산학중점", 25, 15, 50, 10, 0);

  // ── 등급 정책 (제안 레이어: 절대컷 + 상대상한) ──
  const gp = db.prepare(
    `INSERT INTO param_grade_policy (param_version_id,target_type,mode,grade,cut_score,dist_ratio) VALUES (?,?,?,?,?,?)`
  );
  gp.run(pv, "FACULTY", "ABS_CUT", "S", 95, null);
  gp.run(pv, "FACULTY", "ABS_CUT", "A", 85, null);
  gp.run(pv, "FACULTY", "ABS_CUT", "B", 70, null);
  gp.run(pv, "FACULTY", "ABS_CUT", "C", 60, null);
  gp.run(pv, "FACULTY", "ABS_CUT", "D", null, null);
  gp.run(pv, "FACULTY", "REL_DIST", "S", null, 0.1);
  gp.run(pv, "FACULTY", "REL_DIST", "A", null, 0.25);
  gp.run(pv, "FACULTY", "REL_DIST", "B", null, 0.45);
  gp.run(pv, "FACULTY", "REL_DIST", "C", null, 0.15);
  gp.run(pv, "FACULTY", "REL_DIST", "D", null, 0.05);

  // ── 계수/단가 ──
  const co = db.prepare(
    `INSERT INTO param_coefficient (param_version_id,coef_group,coef_key,coef_value,note) VALUES (?,?,?,?,?)`
  );
  const C = (g: string, k: string, v: number, n = "") => co.run(pv, g, k, v, n);

  // 논문 IF 백분위 계단배점 (별표2-2) — 기본값
  C("paper_band", "SNC", 1000, "Science/Nature/Cell");
  C("paper_band", "SSCI_AHCI", 400, "SSCI·A&HCI");
  C("paper_band", "SCIE_P5", 600, "SCI 상위5%");
  C("paper_band", "SCIE_P10", 400, "SCI 상위10%");
  C("paper_band", "SCIE_P25", 300, "SCI 상위25%");
  C("paper_band", "SCIE_P50", 250, "SCI 상위50%");
  C("paper_band", "SCIE_GEN", 200, "SCI 일반");
  C("paper_band", "SCOPUS", 150, "SCOPUS");
  C("paper_band", "INTL_GEN", 50, "국제 일반");
  C("paper_band", "KCI", 100, "KCI 등재");
  C("paper_band", "KCI_CAND", 80, "KCI 등재후보");
  C("paper_band", "DOM_GEN", 30, "국내 일반");
  C("fusion", "mult", 1.3, "학과간 융복합 논문 가산 ×1.3");
  // v1.1 곱셈 q·등급점수 (대안 파라미터 세트로 보존 — 전환 가능)
  C("jcr_quartile_legacy", "TOP10", 10); C("jcr_quartile_legacy", "Q1", 4);
  C("jcr_quartile_legacy", "Q2", 3); C("jcr_quartile_legacy", "Q3", 2);
  C("jcr_quartile_legacy", "Q4", 1); C("jcr_quartile_legacy", "NA", 1);
  C("paper_grade_legacy", "SCIE", 300, "v1.1 강한안 기본점수");
  C("paper_grade_legacy", "SCOPUS", 200); C("paper_grade_legacy", "KCI", 150);

  // 저자 환산 규칙
  C("author", "max_n", 15, "논문 N 상한");
  C("author", "book_max_n", 10, "저서·지재권 N 상한");
  C("author", "main_max", 2, "주저자 최대 2인");
  // 예체능 실기 인원수 환산율 (%) — §3
  C("art_share", "1", 100); C("art_share", "2", 80); C("art_share", "3", 70);
  C("art_share", "4", 60); C("art_share", "5", 50); C("art_share", "6", 30);
  // 저서·학술대회 (별표2-2)
  C("book", "INTL_PRO", 200); C("book", "DOM_PRO", 150); C("book", "EDIT", 100);
  C("book", "TRANS_FOREIGN", 100); C("book", "TRANS_KR", 70); C("book", "TEXTBOOK", 100);
  // 연구비 종류별 정액 (100만원당) — §5 (계열계수 폐기)
  C("grant_kind", "TECH_TRANSFER", 12); C("grant_kind", "REGIONAL", 4);
  C("grant_kind", "EXTERNAL", 2); C("grant_kind", "INDUSTRY", 2); C("grant_kind", "EQUIP_REVENUE", 2);
  // 특허·산학 지재권 (§6) — 국민대 실값
  C("ip_unit", "INTL_REG", 320); C("ip_unit", "DOM_REG", 60);
  C("ip_unit", "UTILITY_DESIGN", 30); C("ip_unit", "SW", 50); C("ip_unit", "COPYRIGHT", 10);
  C("ip_unit", "STARTUP", 100); C("ip_unit", "LAB_ATTRACT", 100); C("ip_unit", "SCHOOL_ENT", 100);
  C("ip_unit", "NEWTECH_CERT", 50); C("ip_unit", "AWARD_INTL", 150); C("ip_unit", "AWARD_DOM", 100);
  C("ip_unit", "TECH_PER_1M", 12, "기술이전료 100만원당");
  // COUNT_WEIGHT 단가
  C("cw_R03", "INTL", 30); C("cw_R03", "DOM", 30); C("cw_R03", "CS_INTL", 200);
  C("cw_E02", "base", 10); C("cw_E02", "over_credit", 0.5); C("cw_E02", "foreign_course", 7);
  C("cw_E02", "eval_top", 30); C("cw_E02", "cap", 70);
  C("cw_E03", "masters", 2); C("cw_E03", "phd", 5); C("cw_E03", "counseling", 5);
  C("cw_E03", "extracurricular", 3); C("cw_E03", "cap", 40);
  C("cw_I03", "field", 100); C("cw_I03", "capstone", 75); C("cw_I03", "coop_course", 20); C("cw_I03", "cap", 300);
  C("cw_I04", "employ", 1); C("cw_I04", "startup_guide", 30); C("cw_I04", "cap", 200);
  C("cw_S01", "post_high", 15); C("cw_S01", "post_mid", 10); C("cw_S01", "committee_head", 5);
  C("cw_S01", "committee", 3); C("cw_S01", "cap", 60);
  C("cw_S02", "society_head", 15); C("cw_S02", "editor_head", 10); C("cw_S02", "officer", 3);
  C("cw_S02", "review", 2); C("cw_S02", "cap", 40);
  C("cw_E06", "unit", 8); C("cw_E06", "cap", 40);
  // 가점 상한 (§13: R05·R07·R08·E06·I04)
  C("bonus_cap", "R05", 1.5); C("bonus_cap", "R07", 1.0); C("bonus_cap", "R08", 1.0);
  C("bonus_cap", "E06", 0.5); C("bonus_cap", "I04", 1.0); C("bonus_cap", "total", 5.0);

  // ── Quality Gate 편수 기준 (별표1-1-7-1, §8) — field별 OR 조건 ──
  // 키: p10/p25/p50=상위N% 편수, ahci=A&HCI 편수, sci=SCI급 편수, kci=KCI 편수
  const G = (field: string, obj: Record<string, number>) => {
    for (const [k, v] of Object.entries(obj)) C(`gate_${field}`, k, v);
  };
  G("ENA", { p10: 3, p25: 6 });
  G("ENB", { p10: 2, p50: 6 });
  G("ENC", { p10: 1, p50: 3 });
  G("경상", { p25: 3, p50: 6 });
  G("인문", { p50: 3, ahci: 3 });
  G("사회", { p50: 3, ahci: 3 });
  G("체육", { sci: 3, kci: 6 });
  G("예능", { sci: 3, kci: 6 });
  C("gate", "period_years", 6, "평가기간(년)");
  C("mt", "pass_rate", 150, "Moving Target 통과 달성률(%)");

  // ── 분포 파라미터 (§12) ──
  const di = db.prepare(
    `INSERT INTO param_distribution (param_version_id,metric_key,series,dist_type,dist_params) VALUES (?,?,?,?,?)`
  );
  const D = (k: string, s: string, t: string, p: object) => di.run(pv, k, s, t, JSON.stringify(p));

  // 연간 논문수 (field별 포아송)
  const lam: Record<string, number> = { 인문: 1.0, 사회: 1.4, 경상: 1.6, 체육: 0.8, 예능: 0.8, ENA: 2.8, ENB: 2.3, ENC: 1.8 };
  for (const f of ALL_FIELDS) D("annual_papers", f, "poisson", { lambda: lam[f] });
  // 논문 유형 구성 (field별 다항)
  for (const f of SCI_FIELDS) D("paper_type_mix", f, "categorical", { SCIE: 62, SCOPUS: 12, KCI: 20, DOM: 6 });
  D("paper_type_mix", "경상", "categorical", { SSCI_AHCI: 10, SCOPUS: 10, KCI: 65, KCI_CAND: 10, DOM: 5 });
  D("paper_type_mix", "인문", "categorical", { SSCI_AHCI: 8, SCOPUS: 8, KCI: 66, KCI_CAND: 12, DOM: 6 });
  D("paper_type_mix", "사회", "categorical", { SSCI_AHCI: 8, SCOPUS: 8, KCI: 66, KCI_CAND: 12, DOM: 6 });
  D("paper_type_mix", "체육", "categorical", { SCIE: 12, SCOPUS: 10, KCI: 66, KCI_CAND: 8, DOM: 4 });
  D("paper_type_mix", "예능", "categorical", { SCIE: 5, SCOPUS: 8, KCI: 72, KCI_CAND: 10, DOM: 5 });
  // SCIE 논문의 IF 백분위 구간 (다항) + SNC 플래그 확률
  D("scie_if_mix", "ALL", "categorical", { P5: 5, P10: 12, P25: 25, P50: 28, GEN: 30, snc: 0.003 });
  // 저자수 N (로그정규)
  const amed: Record<string, number> = { ENA: 5, ENB: 5, ENC: 5, 인문: 1.6, 사회: 1.6, 경상: 1.6, 체육: 1.6, 예능: 1.3 };
  for (const f of ALL_FIELDS) D("author_n", f, "lognormal", { median: amed[f], sigma: 0.5 });
  // 주저자·교신 k (이산)
  D("author_k", "ALL", "categorical", { "1": 0.6, "2": 0.35, "3": 0.05 });
  // 주저자 확률 p
  for (const f of SCI_FIELDS) D("main_author", f, "categorical", { p: 0.35 });
  for (const f of ["인문", "사회", "경상", "체육", "예능"]) D("main_author", f, "categorical", { p: 0.7 });
  // 비율·질 지표
  D("fusion", "ALL", "beta", { alpha: 1.5, beta: 7 });
  D("fwci", "ALL", "lognormal", { median: 1.0, sigma: 0.6 });
  D("oa", "ALL", "beta", { alpha: 2, beta: 3 });
  D("sdg", "ALL", "beta", { alpha: 1.5, beta: 6 });
  D("intl_coauth", "ENA", "beta", { alpha: 2, beta: 5 });
  D("intl_coauth", "ENB", "beta", { alpha: 2, beta: 5 });
  D("intl_coauth", "ENC", "beta", { alpha: 2, beta: 5 });
  D("intl_coauth", "경상", "beta", { alpha: 1.5, beta: 7 });
  D("intl_coauth", "사회", "beta", { alpha: 1.5, beta: 7 });
  D("intl_coauth", "인문", "beta", { alpha: 1, beta: 9 });
  D("intl_coauth", "체육", "beta", { alpha: 1, beta: 9 });
  D("intl_coauth", "예능", "beta", { alpha: 1, beta: 9 });
  // 연구비 (ziln, group 기준)
  D("grant_amount", "SCI", "ziln", { zero: 0.4, median: 30000000, sigma: 1.0 });
  D("grant_amount", "HSSP", "ziln", { zero: 0.6, median: 8000000, sigma: 1.0 });
  D("grant_amount", "ART", "ziln", { zero: 0.7, median: 6000000, sigma: 1.0 });
  // 교육
  D("lecture_eval", "ALL", "normal_trunc", { mean: 4.2, sd: 0.3, lo: 3.0, hi: 5.0 });
  for (const f of SCI_FIELDS) D("advising", f, "poisson", { lambda: 1.5 });
  for (const f of ["인문", "사회", "경상", "체육", "예능"]) D("advising", f, "poisson", { lambda: 1.0 });
  D("e06", "ALL", "zip", { zero: 0.94, lambda: 1.0 });
  // 산학
  for (const f of SCI_FIELDS) D("patent", f, "zip", { zero: 0.7, lambda: 0.4 });
  for (const f of ["인문", "사회", "경상", "체육", "예능"]) D("patent", f, "zip", { zero: 0.97, lambda: 0.2 });
  D("startup", "ALL", "zip", { zero: 0.9, lambda: 1.2 });
  D("oss", "ALL", "categorical", { p: 0.05 });
  // 봉사
  D("committee", "ALL", "poisson", { lambda: 1.5 });
  // 예체능 실기 (분야별 포아송)
  D("art_exhibition", "ALL", "poisson", { lambda: 2.0 });
  D("art_performance", "ALL", "poisson", { lambda: 1.5 });
  D("art_award", "ALL", "poisson", { lambda: 0.5 });

  // ── 지표 마스터 (v1.2 재분류) ──
  seedIndicators(db);

  // ── RBAC 역할 7종 ──
  const rl = db.prepare(`INSERT INTO role (role_id,role_code,role_name,scope) VALUES (?,?,?,?)`);
  rl.run(1, "FACULTY", "교수(본인)", "SELF");
  rl.run(2, "DEPT_CHAIR", "학과장", "DEPT");
  rl.run(3, "EVAL_COMMITTEE", "평가위원", "ASSIGNED");
  rl.run(4, "STAFF", "직원(본인)", "SELF");
  rl.run(5, "DEPT_HEAD", "부서장", "DEPT");
  rl.run(6, "HR_TEAM", "인사팀", "ORG_ALL");
  rl.run(7, "PRESIDENT", "총장/기획처", "ORG_ALL");
  rl.run(8, "TEAM_LEAD", "팀장", "DEPT");

  // ── 공시 매핑 ──
  const dm = db.prepare(`INSERT INTO ext_disclosure_map (metric_code,indicator_id,agg_rule,note) VALUES (?,?,?,?)`);
  dm.run("RES_PAPER_SCI_PER_FT", "R01", "Σ(SCI급 편수)/전임교원수", "1인당 SCI급");
  dm.run("RES_PAPER_KCI_PER_FT", "R01", "Σ(KCI 편수)/전임교원수", "1인당 KCI");
  dm.run("RES_FUND_PER_FT", "R04", "Σ(amount_won)/전임교원수", "1인당 연구비");
  dm.run("RES_FUND_TOTAL", "R04", "Σ(amount_won)", "연구비 총액");
  dm.run("IP_PATENT_CNT", "I01", "COUNT(특허)", "특허 건수");
  dm.run("TECH_TRANSFER_INCOME", "I02", "Σ(income_won)", "기술이전 수입");
  dm.run("EDU_LECTURE_EVAL", "E01", "가중평균(rating,enroll)", "강의평가");

  // ── 최소기준 앵커 (dim_criteria, §12) ──
  seedCriteria(db);
}

function seedIndicators(db: BetterSqlite3.Database): void {
  const ins = db.prepare(
    `INSERT INTO dim_indicator
       (indicator_id,target_type,area,name,definition,formula_type,formula_params,unit,direction,reflect_stage,is_new,data_source,paired_with,sort_order)
     VALUES (@id,'FACULTY',@area,@name,@def,@ft,@fp,@unit,'UP',@stage,@isNew,@ds,@paired,@sort)`
  );
  type R = { id: string; area: string; name: string; def: string; ft: string; fp: string; unit: string; stage: string; isNew: number; ds: string; paired: string | null; sort: number };
  const I = (id: string, area: string, name: string, def: string, ft: string, fp: object, unit: string, stage: string, isNew: number, ds: string, paired: string | null, sort: number): R =>
    ({ id, area, name, def, ft, fp: JSON.stringify(fp), unit, stage, isNew, ds, paired, sort });
  const rows: R[] = [
    I("R01", "R", "논문 환산점수", "IF 백분위 계단배점×저자환산×융복합", "PAPER_SUM", { band_key: "paper_band", f_key: "author", fusion_key: "fusion" }, "점", "SCORE", 0, "교내가상/KRI/OpenAlex", "R05,R06", 1),
    I("R02", "R", "저·역서 환산점수", "학술저서·역서·교재", "BOOK_SUM", { coef_group: "book" }, "점", "SCORE", 0, "교내가상", null, 2),
    I("R03", "R", "학술대회 발표", "국내외 학술대회", "COUNT_WEIGHT", { coef_group: "cw_R03" }, "점", "SCORE", 0, "교내가상", null, 3),
    I("R04", "R", "연구비 수주 환산점수", "종류별 정액(100만원당)", "GRANT_SUM", { coef_group: "grant_kind" }, "점", "SCORE", 0, "산학협력단(가상)", null, 4),
    I("R05", "R", "FWCI", "분야정규화 피인용", "RATIO_DIRECT", { metric: "fwci" }, "배", "BONUS", 1, "OpenAlex(가상)", "R01,R06", 5),
    I("R06", "R", "피인용·h-index", "총 피인용·h", "RATIO_DIRECT", { metric: "citations" }, "회", "MONITOR", 1, "OpenAlex(가상)", "R01,R05", 6),
    I("R07", "R", "국제공동연구 비율", "해외기관 공저 비율", "RATIO_DIRECT", { metric: "intl_coauth" }, "%", "BONUS", 1, "OpenAlex(가상)", null, 7),
    I("R08", "R", "오픈액세스 비율", "OA 논문 비율", "RATIO_DIRECT", { metric: "oa" }, "%", "BONUS", 1, "OpenAlex(가상)", null, 8),
    I("R09", "R", "융복합 논문 지수", "학과간 융복합(×1.3 가산 반영)", "RATIO_DIRECT", { metric: "fusion" }, "지수", "MONITOR", 0, "OpenAlex(가상)", null, 9),
    I("R10", "R", "오픈소스 SW", "Github·Apache 기여(별표2-2)", "COUNT_WEIGHT", { coef_group: "oss_direct" }, "점", "SCORE", 0, "교내가상", null, 10),
    I("R11", "R", "예체능 실기실적", "전시·공연·수상(별표2-2-1~7)", "ART_SUM", { coef_group: "art_share" }, "점", "SCORE", 0, "교내가상", null, 11),
    I("E01", "E", "강의평가 지수", "수강규모 가중 강의평가", "WEIGHTED_AVG", { value: "rating", weight: "enroll" }, "점", "SCORE", 0, "학사(가상)", null, 12),
    I("E02", "E", "수업 시수·부담", "책임시수·원어강의·우수강의", "COUNT_WEIGHT", { coef_group: "cw_E02" }, "점", "SCORE", 0, "학사(가상)", null, 13),
    I("E03", "E", "학생지도 실적", "논문지도·상담·비교과", "COUNT_WEIGHT", { coef_group: "cw_E03" }, "점", "SCORE", 0, "학사(가상)", null, 14),
    I("E04", "E", "강의개선·혁신교수법", "선진교수법·팀팀클래스(기존)", "COUNT_WEIGHT", { coef_group: "cw_E06" }, "점", "MONITOR", 0, "교수학습센터(가상)", null, 15),
    I("E05", "E", "온라인 콘텐츠 개발", "K-MOOC 개발·운영(기존)", "COUNT_WEIGHT", { coef_group: "cw_E06" }, "점", "MONITOR", 0, "교수학습센터(가상)", null, 16),
    I("E06", "E", "AI·디지털 교육역량", "생성형AI 교과 개편·연수", "COUNT_WEIGHT", { coef_group: "cw_E06", metric: "e06" }, "점", "BONUS", 1, "교수학습센터(가상)", null, 17),
    I("I01", "I", "특허·지식재산", "국내외 특허·SW·저작권", "IP_SUM", { coef_group: "ip_unit" }, "점", "SCORE", 0, "특허DB(가상)", null, 18),
    I("I02", "I", "기술이전 수입", "기술이전 계약·수입료", "IP_SUM", { coef_group: "ip_unit" }, "점", "SCORE", 0, "TLO(가상)", null, 19),
    I("I03", "I", "산학 교육 지도", "현장실습·캡스톤·산학교과(기존)", "COUNT_WEIGHT", { coef_group: "cw_I03" }, "점", "SCORE", 0, "학사(가상)", null, 20),
    I("I04", "I", "학생 취·창업 지도", "취업·창업지도(창업생존=신설분 가점)", "COUNT_WEIGHT", { coef_group: "cw_I04", metric: "startup" }, "점", "SCORE", 0, "취업·창업지원단(가상)", null, 21),
    I("S01", "S", "보직·위원회 봉사", "교무위원·위원회(별표4)", "COUNT_WEIGHT", { coef_group: "cw_S01" }, "점", "SCORE", 0, "인사(가상)", null, 22),
    I("S02", "S", "학회·학술 심사활동", "학회 임원·심사", "COUNT_WEIGHT", { coef_group: "cw_S02" }, "점", "SCORE", 0, "본인입력(가상)", null, 23),
    I("S03", "S", "SDG·시민참여 기여", "시민참여·SDG(시민참여=기존)", "RATIO_DIRECT", { metric: "sdg" }, "점", "MONITOR", 0, "교내사업DB(가상)", null, 24),
    I("S04", "S", "사회적 임팩트 서사", "임팩트 사례(정성)", "QUAL_GRADE", {}, "등급", "MONITOR", 1, "본인입력(가상)", null, 25),
  ];
  const tx = db.transaction((rs: R[]) => { for (const r of rs) ins.run(r); });
  tx(rows);
}

function seedCriteria(db: BetterSqlite3.Database): void {
  const ins = db.prepare(
    `INSERT INTO dim_criteria (param_version_id,crit_type,appointed_version,series_group,achievement_total,research_total,intl_required)
     VALUES (?,?,?,?,?,?,?)`
  );
  const pv = PARAM_VERSION_ID;
  // 승진 구형(별표1-1-5)
  ins.run(pv, "PROMOTE", "V_LEGACY", "G_HSSP", 2100, 1080, "국제필수 900");
  // 승진 V_2019(별표1-1-7)
  ins.run(pv, "PROMOTE", "V_2019", "G_HSSP", 2820, 1800, "SCI 2편 / 1600");
  ins.run(pv, "PROMOTE", "V_2019", "G_ENA", 2820, 1800, "1300");
  ins.run(pv, "PROMOTE", "V_2019", "G_ENB", 2420, 1400, "900");
  ins.run(pv, "PROMOTE", "V_2019", "G_ENC", 2120, 1100, "600");
  // 승진 V_2024(별표1-1-7-1) — quality gate + Moving Target
  ins.run(pv, "PROMOTE", "V_2024", null, 2120, 1100, "질적(IF편수) OR Moving Target ≥150%");
  // 승급(별표1-1-8/9)
  ins.run(pv, "UPGRADE", "V_LEGACY", "G_HSSP", 400, 240, "200");
  ins.run(pv, "UPGRADE", "V_2019", null, 600, null, "400");
}
