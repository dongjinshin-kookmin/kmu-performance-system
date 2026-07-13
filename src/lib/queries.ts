import { getDb } from "./db";
import { Session, RoleCode, ROLES, DEFAULT_SESSION } from "./rbac";
import { BAND_LABEL, ROLE_KO } from "./format";

const YEAR = 2025;
const PV = 2;

// ─────────────────────────── 역할 전환 옵션 ───────────────────────────
export interface PersonOpt { id: number; name: string; dept: string; group: string; }
export function roleOptions(): { faculty: PersonOpt[]; chairs: PersonOpt[] } {
  const db = getDb();
  // 대표 교원: 그룹별 상위/중위 섞어 12명
  const faculty = db.prepare(
    `SELECT p.person_id id, p.name, o.name dept, o.series_group grp
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE e.cycle_id=? ORDER BY (e.composite_score+e.bonus_score) DESC LIMIT 6`
  ).all(YEAR) as any[];
  const more = db.prepare(
    `SELECT p.person_id id, p.name, o.name dept, o.series_group grp
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id JOIN prof_profile pr ON pr.person_id=p.person_id
     WHERE p.appointed_version='V_2024' ORDER BY p.person_id LIMIT 6`
  ).all() as any[];
  const chairs = db.prepare(
    `SELECT u.person_id id, p.name, o.name dept, o.series_group grp
     FROM user_role ur JOIN app_user u ON u.user_id=ur.user_id JOIN dim_person p ON p.person_id=u.person_id
     JOIN dim_org o ON o.org_id=ur.scope_org_id
     WHERE ur.role_id=2 ORDER BY o.sort_order LIMIT 10`
  ).all() as any[];
  const map = (r: any): PersonOpt => ({ id: r.id, name: r.name, dept: r.dept, group: r.grp });
  return { faculty: [...faculty, ...more].map(map), chairs: chairs.map(map) };
}

export interface Viewer { id: number; name: string; orgId: number; dept: string; group: string; rank: string; }
export function getViewer(s: Session): Viewer | null {
  if (!s.viewer) return null;
  const db = getDb();
  const r = db.prepare(
    `SELECT p.person_id id, p.name, p.org_id orgId, o.name dept, o.series_group grp, pr.rank
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id LEFT JOIN prof_profile pr ON pr.person_id=p.person_id
     WHERE p.person_id=?`
  ).get(s.viewer) as any;
  return r ? { id: r.id, name: r.name, orgId: r.orgId, dept: r.dept, group: r.grp, rank: r.rank } : null;
}

/** 개인 카드 열람 권한 (행수준 필터) */
export function canViewPerson(s: Session, targetId: number): { ok: boolean; masked: boolean; reason?: string } {
  const db = getDb();
  if (s.role === "HR_TEAM") return { ok: true, masked: false };
  if (s.role === "PRESIDENT") return { ok: true, masked: true }; // 집계·백분위만, raw 마스킹
  if (s.role === "EVAL_COMMITTEE") return { ok: true, masked: false };
  if (s.role === "FACULTY") {
    return s.viewer === targetId ? { ok: true, masked: false } : { ok: false, masked: false, reason: "교수 본인 권한은 본인 카드만 열람할 수 있습니다." };
  }
  if (s.role === "DEPT_CHAIR") {
    const v = getViewer(s);
    const t = db.prepare(`SELECT org_id FROM dim_person WHERE person_id=?`).get(targetId) as any;
    return v && t && t.org_id === v.orgId ? { ok: true, masked: false } : { ok: false, masked: false, reason: "학과장 권한은 소속 학과 교원만 열람할 수 있습니다." };
  }
  return { ok: false, masked: false };
}

// ─────────────────────────── 대시보드 (기관) ───────────────────────────
export function instituteKpis(year = YEAR) {
  const db = getDb();
  const q = (sql: string, ...a: any[]) => (db.prepare(sql).get(...a) as any);
  const facN = q(`SELECT COUNT(*) n FROM dim_person WHERE person_type='FACULTY'`).n;
  const sciN = q(`SELECT COUNT(*) n FROM act_paper ap JOIN fact_activity fa ON fa.activity_id=ap.activity_id WHERE ap.grade IN ('SCI','SSCI_AHCI') AND fa.period_id=?`, year).n;
  const fund = q(`SELECT COALESCE(SUM(amount_won),0) s FROM act_grant ag JOIN fact_activity fa ON fa.activity_id=ag.activity_id WHERE fa.period_id=?`, year).s;
  const patents = q(`SELECT COUNT(*) n FROM act_ip WHERE ip_kind LIKE '%_REG'`).n;
  const ev = q(`SELECT AVG(composite_score+bonus_score) m, SUM(grade_rel IN ('S','A')) sa, COUNT(*) n FROM fact_evaluation WHERE cycle_id=?`, year);
  const gate = q(`SELECT SUM(quality_gate_pass) p, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? AND quality_gate_pass IS NOT NULL`, year);
  return {
    facN, sciN, fund, patents,
    avgScore: +ev.m.toFixed(1), saRatio: ev.sa / ev.n,
    gatePass: gate.p, gateN: gate.n,
  };
}

export function trendByYear() {
  const db = getDb();
  return db.prepare(
    `SELECT e.cycle_id year, ROUND(AVG(e.composite_score+e.bonus_score),1) score,
            (SELECT COUNT(*) FROM act_paper ap JOIN fact_activity fa ON fa.activity_id=ap.activity_id WHERE fa.period_id=e.cycle_id AND ap.grade IN ('SCI','SSCI_AHCI')) sci,
            (SELECT COALESCE(SUM(amount_won),0) FROM act_grant ag JOIN fact_activity fa ON fa.activity_id=ag.activity_id WHERE fa.period_id=e.cycle_id) fund
     FROM fact_evaluation e WHERE e.cycle_id BETWEEN 2021 AND 2025 GROUP BY e.cycle_id ORDER BY e.cycle_id`
  ).all() as { year: number; score: number; sci: number; fund: number }[];
}

export function groupCompare(year = YEAR) {
  const db = getDb();
  return db.prepare(
    `SELECT o.series_group grp, COUNT(*) n, ROUND(AVG(e.composite_score+e.bonus_score),1) score,
            SUM(e.grade_rel='S') s, SUM(e.grade_rel='A') a, SUM(e.grade_rel='B') b, SUM(e.grade_rel='C') c, SUM(e.grade_rel='D') d
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE e.cycle_id=? GROUP BY o.series_group ORDER BY score DESC`
  ).all(year) as any[];
}

export function collegeCompare(year = YEAR) {
  const db = getDb();
  return db.prepare(
    `SELECT col.name college, COUNT(*) n, ROUND(AVG(e.composite_score+e.bonus_score),1) score
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id JOIN dim_org col ON col.org_id=o.parent_id
     WHERE e.cycle_id=? GROUP BY col.org_id HAVING n>=3 ORDER BY score DESC`
  ).all(year) as { college: string; n: number; score: number }[];
}

export function gradeDist(year = YEAR) {
  const db = getDb();
  const rows = db.prepare(`SELECT grade_rel g, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? GROUP BY grade_rel`).all(year) as any[];
  const m: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) m[r.g] = r.n;
  return m;
}

export function disclosure(year = YEAR) {
  const db = getDb();
  return db.prepare(`SELECT metric_code code, metric_name name, our_value our, peer_avg peer, unit FROM ext_disclosure WHERE year=? ORDER BY disclosure_id`).all(year) as any[];
}

// ─────────────────────────── 개인 성과 카드 ───────────────────────────
export function facultyHeader(id: number) {
  const db = getDb();
  return db.prepare(
    `SELECT p.person_id id, p.name, p.person_code code, p.appointed_year appointed, p.appointed_version version,
            o.org_id orgId, o.name dept, o.series_group grp, o.series field, pr.rank, pr.track_code track, pr.tenure, pr.is_admin_post adminPost, pr.admin_post_name adminName
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id LEFT JOIN prof_profile pr ON pr.person_id=p.person_id
     WHERE p.person_id=?`
  ).get(id) as any;
}

/** 소셀 마스킹(MASK_MIN)용 — 같은 조직(학과/부서) 평가 대상 인원 수. n<5면 개인 재식별 위험. */
export function facultyDeptSize(orgId: number, year = YEAR): number {
  const db = getDb();
  return (db.prepare(`SELECT COUNT(*) n FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND p.org_id=?`).get(year, orgId) as any).n;
}
export function staffDeptSize(orgId: number, half = STAFF_LATEST): number {
  const db = getDb();
  return (db.prepare(`SELECT COUNT(*) n FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND p.org_id=?`).get(half, orgId) as any).n;
}

export function facultyEval(id: number, year = YEAR) {
  const db = getDb();
  return db.prepare(
    `SELECT eval_id evalId, composite_score comp, bonus_score bonus, research_total research, achievement_total achievement,
            grade_abs abs, grade_rel rel, grade_final final, status, current_step step,
            quality_gate_pass gatePass, quality_gate_basis gateBasis, moving_target_rate mtRate
     FROM fact_evaluation WHERE person_id=? AND cycle_id=?`
  ).get(id, year) as any;
}

export function facultyAreas(id: number, year = YEAR) {
  const db = getDb();
  const h = db.prepare(`SELECT org_id FROM dim_person WHERE person_id=?`).get(id) as any;
  const areas = db.prepare(
    `SELECT a.area, a.raw_score raw, a.std_score std, a.weight, a.weighted_score weighted
     FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id
     WHERE e.person_id=? AND e.cycle_id=?`
  ).all(id, year) as any[];
  // 학과 내 백분위 (영역 std 기준)
  for (const a of areas) {
    const peers = (db.prepare(
      `SELECT a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id JOIN dim_person p ON p.person_id=e.person_id
       WHERE e.cycle_id=? AND a.area=? AND p.org_id=?`
    ).all(year, a.area, h.org_id) as any[]).map((x) => x.s);
    const below = peers.filter((s) => s <= a.std).length;
    a.pct = peers.length > 1 ? Math.round((below / peers.length) * 100) : 50;
  }
  return areas as { area: string; raw: number; std: number; weight: number; weighted: number; pct: number }[];
}

export function facultyTrend(id: number) {
  const db = getDb();
  return db.prepare(`SELECT cycle_id year, ROUND(composite_score+bonus_score,1) score, grade_rel grade FROM fact_evaluation WHERE person_id=? ORDER BY cycle_id`).all(id) as any[];
}

/** 종합점수 학과·전체 백분위 */
export function compositePercentile(id: number, year = YEAR) {
  const db = getDb();
  const me = (db.prepare(`SELECT composite_score+bonus_score t, person_id FROM fact_evaluation WHERE person_id=? AND cycle_id=?`).get(id, year) as any);
  const h = facultyHeader(id);
  const all = (db.prepare(`SELECT composite_score+bonus_score t FROM fact_evaluation WHERE cycle_id=?`).all(year) as any[]).map((x) => x.t);
  const grp = (db.prepare(`SELECT e.composite_score+e.bonus_score t FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id WHERE e.cycle_id=? AND o.series_group=?`).all(year, h.grp) as any[]).map((x) => x.t);
  const p = (arr: number[]) => Math.round((arr.filter((v) => v <= me.t).length / arr.length) * 100);
  return { univ: p(all), group: p(grp), score: +me.t.toFixed(1) };
}

/** 종합점수 만점(기준환산). 교원 종합점수는 트랙·계열 벤치마크(param_benchmark)를
 *  달성했을 때 100이 되도록 표준화된 지수 → 기준환산 만점 = 100, 가점 상한은 param에서 읽음. */
export function facultyScoreMax(): { base: number; bonusCap: number; max: number } {
  const db = getDb();
  const cap = (db.prepare(`SELECT coef_value v FROM param_coefficient WHERE coef_group='bonus_cap' AND coef_key='total' AND param_version_id=?`).get(PV) as any)?.v ?? 5;
  return { base: 100, bonusCap: cap, max: 100 + cap };
}

// 분포 통계(평균·표준편차) + 순위·상위% 공통 계산
export interface RankStat { value: number; mean: number; sd: number; scope1Rank: number; scope1N: number; scope2Rank: number; scope2N: number; topPct: number; pctile: number; }
function rankStats(me: number, scope1: number[], scope2: number[]): RankStat {
  const rank = (arr: number[]) => arr.filter((v) => v > me).length + 1;
  const mean = scope2.reduce((s, v) => s + v, 0) / (scope2.length || 1);
  const sd = Math.sqrt(scope2.reduce((s, v) => s + (v - mean) ** 2, 0) / (scope2.length || 1));
  const s2Rank = rank(scope2);
  const topPct = Math.max(1, Math.round((s2Rank / (scope2.length || 1)) * 100));
  const pctile = Math.round((scope2.filter((v) => v <= me).length / (scope2.length || 1)) * 100);
  return { value: +me.toFixed(1), mean: +mean.toFixed(1), sd: +sd.toFixed(1), scope1Rank: rank(scope1), scope1N: scope1.length, scope2Rank: s2Rank, scope2N: scope2.length, topPct, pctile };
}

/** 교원 '내 위치': 종합 + 4영역 각각 학과·전체 순위/표준화 분포 */
export function facultyRanks(id: number, year = YEAR): (RankStat & { key: string })[] {
  const db = getDb();
  const h = facultyHeader(id);
  const org = h.orgId;
  const out: (RankStat & { key: string })[] = [];
  const meC = (db.prepare(`SELECT composite_score+bonus_score t FROM fact_evaluation WHERE person_id=? AND cycle_id=?`).get(id, year) as any).t;
  const allC = (db.prepare(`SELECT composite_score+bonus_score t FROM fact_evaluation WHERE cycle_id=?`).all(year) as any[]).map((x) => x.t);
  const deptC = (db.prepare(`SELECT e.composite_score+e.bonus_score t FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND p.org_id=?`).all(year, org) as any[]).map((x) => x.t);
  out.push({ key: "ALL", ...rankStats(meC, deptC, allC) });
  const mine = db.prepare(`SELECT a.area, a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id WHERE e.person_id=? AND e.cycle_id=?`).all(id, year) as any[];
  for (const area of ["R", "E", "I", "S"]) {
    const me = mine.find((x) => x.area === area)?.s ?? 0;
    const dept = (db.prepare(`SELECT a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND a.area=? AND p.org_id=?`).all(year, area, org) as any[]).map((x) => x.s);
    const all = (db.prepare(`SELECT a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id WHERE e.cycle_id=? AND a.area=?`).all(year, area) as any[]).map((x) => x.s);
    out.push({ key: area, ...rankStats(me, dept, all) });
  }
  return out;
}

/** 가점 5종 세부 (fact_indicator_score raw 기반) */
export function bonusBreakdown(id: number, year = YEAR) {
  const db = getDb();
  const get = (ind: string) => (db.prepare(`SELECT raw_value v FROM fact_indicator_score WHERE person_id=? AND period_id=? AND indicator_id=? AND grain='PERSON'`).get(id, year, ind) as any)?.v ?? 0;
  const clamp = (x: number, hi: number) => Math.max(0, Math.min(hi, x));
  const fwci = get("R05"), intl = get("R07"), oa = get("R08");
  const e06 = get("E06");
  // I04 창업 신설분 가점: 생성기 computeBonus와 동일하게 창업지도 건수(startup_guide) × 0.5, 상한 1.0.
  // I04 활동 attributes에서 창업 건수를 조회(하드코딩 0 제거) → 세부 합 = bonus_score.
  const i04a = db.prepare(`SELECT attributes attrs FROM fact_activity WHERE person_id=? AND period_id=? AND indicator_id='I04' LIMIT 1`).get(id, year) as any;
  const startup = i04a ? (JSON.parse(i04a.attrs || "{}").startup_guide ?? 0) : 0;
  return [
    { key: "R05", label: "FWCI", metric: fwci.toFixed(2) + "배", pts: clamp((fwci - 1) * 1.5, 1.5), cap: 1.5 },
    { key: "R07", label: "국제공동", metric: (intl * 100).toFixed(0) + "%", pts: clamp(intl * 3, 1.0), cap: 1.0 },
    { key: "R08", label: "오픈액세스", metric: (oa * 100).toFixed(0) + "%", pts: clamp(oa * 2, 1.0), cap: 1.0 },
    { key: "E06", label: "AI·디지털", metric: e06 + "건", pts: clamp(e06 * 0.25, 0.5), cap: 0.5 },
    { key: "I04", label: "창업지도", metric: startup + "건", pts: clamp(startup * 0.5, 1.0), cap: 1.0 },
  ].map((b) => ({ ...b, pts: +b.pts.toFixed(2) }));
}

// ─────────────────────────── 드릴다운 (실적 목록·근거) ───────────────────────────
function coefMap(group: string): Map<string, number> {
  const db = getDb();
  const m = new Map<string, number>();
  for (const r of db.prepare(`SELECT coef_key k, coef_value v FROM param_coefficient WHERE coef_group=? AND param_version_id=?`).all(group, PV) as any[]) m.set(r.k, r.v);
  return m;
}

export interface DrillItem {
  title: string; sub: string; score: number; basis: string; meta: Record<string, string>;
}
/** 지표별 실적 목록 + 개별 산출 근거 */
export function drilldown(id: number, indicator: string, year = YEAR): { indicator: string; items: DrillItem[]; total: number } {
  const db = getDb();
  const bands = coefMap("paper_band");
  const ipUnit = coefMap("ip_unit");
  const grantKind = coefMap("grant_kind");
  const artShare = coefMap("art_share");
  const acts = db.prepare(`SELECT activity_id id, title, attributes attrs, activity_type type FROM fact_activity WHERE person_id=? AND period_id=? AND indicator_id=? ORDER BY activity_id`).all(id, year, indicator) as any[];
  const items: DrillItem[] = [];
  for (const a of acts) {
    const at = JSON.parse(a.attrs || "{}");
    if (indicator === "R01") {
      const pr = db.prepare(`SELECT grade, if_band band, author_role role, author_n n, author_k k, is_fusion fusion FROM act_paper WHERE activity_id=?`).get(a.id) as any;
      const base = bands.get(pr.band) ?? 0;
      const f = pr.role === "SOLE" ? 1 : (pr.role === "FIRST" || pr.role === "CORRESP" ? 2 : 1) / (Math.min(pr.n, 15) + pr.k);
      const mult = pr.fusion ? 1.3 : 1;
      const score = base * f * mult;
      items.push({
        title: a.title, score: +score.toFixed(1),
        sub: `${at.journal ?? ""} ${at.volume ?? ""}(${at.issue ?? ""}) · ${ROLE_KO[pr.role]}`,
        basis: `${BAND_LABEL[pr.band]} 계단배점 ${base} × 저자환산 ${f.toFixed(3)}(N=${pr.n},k=${pr.k})${mult > 1 ? " × 융복합 1.3" : ""} = ${score.toFixed(1)}점`,
        meta: { DOI: at.doi ?? "-", 공저자: (at.co_authors ?? []).join(", ") || "단독", 피인용: String(at.citations ?? "-"), IF밴드: BAND_LABEL[pr.band] },
      });
    } else if (indicator === "R04") {
      const g = db.prepare(`SELECT amount_won amt, role, researcher_n rn FROM act_grant WHERE activity_id=?`).get(a.id) as any;
      const unit = grantKind.get(at.kind) ?? 2;
      const rr = Math.max(1, g.rn);
      const f = g.role === "PI" ? 2 / (rr + 1) : 1 / (rr + 1);
      const score = (g.amt / 1e6) * unit * f;
      items.push({ title: a.title, score: +score.toFixed(1), sub: `${at.funder} · ${g.role === "PI" ? "연구책임자" : "공동연구원"}`,
        basis: `(${(g.amt / 1e6).toFixed(0)}백만원 ÷ 100만) × 종류단가 ${unit} × 역할환산 ${f.toFixed(3)} = ${score.toFixed(1)}점`,
        meta: { 지원기관: at.funder, 사업: at.program ?? "-", 총액: (g.amt / 1e8).toFixed(2) + "억", 기간: at.period ?? "-" } });
    } else if (indicator === "I01") {
      const ip = db.prepare(`SELECT ip_kind kind, inventor_share share FROM act_ip WHERE activity_id=?`).get(a.id) as any;
      const unit = ipUnit.get(ip.kind) ?? 0;
      const score = unit * ip.share;
      items.push({ title: a.title, score: +score.toFixed(1), sub: `${at.number ?? ""} · 지분 ${(ip.share * 100).toFixed(0)}%`,
        basis: `단가 ${unit} × 발명자지분 ${ip.share} = ${score.toFixed(1)}점`, meta: { 출원등록번호: at.number ?? "-", 지분율: (ip.share * 100).toFixed(0) + "%" } });
    } else if (indicator === "R11") {
      // 인원환산율은 param(art_share)에서 조회 — 참여인원 1~6인 → 100/80/70/60/50/30% (하드코딩 금지, 생성기 artScore와 동일)
      const sharePct = artShare.get(String(Math.min(Math.max(at.participants, 1), 6))) ?? 100;
      const share = sharePct / 100;
      const score = at.base * share;
      items.push({ title: a.title, score: +score.toFixed(1), sub: `${at.label} · ${at.venue}`,
        basis: `${at.label} 배점 ${at.base} × 인원환산 ${sharePct}%(${at.participants}인) = ${score.toFixed(1)}점`,
        meta: { 장소: at.venue, 규모: at.scale === "INTL" ? "국제" : "국내", 참여인원: at.participants + "인" } });
    } else if (indicator === "E01") {
      items.push({ title: a.title, score: +(at.rating ?? 0), sub: `수강 ${at.enroll ?? "-"}명 · ${at.credits ?? 3}학점${at.foreign ? " · 원어강의" : ""}`,
        basis: `강의평가 ${at.rating}점(5점 만점) · 수강규모 ${at.enroll}명 가중`, meta: { 강의평가: at.rating + "점", 수강인원: at.enroll + "명" } });
    } else {
      items.push({ title: a.title, score: 0, sub: a.type, basis: "", meta: {} });
    }
  }
  const total = items.reduce((s, x) => s + x.score, 0);
  return { indicator, items, total: +total.toFixed(1) };
}

/** 개인의 실적 요약 (드릴다운 진입점: 지표별 건수·환산합) */
export function facultyIndicatorSummary(id: number, year = YEAR) {
  const db = getDb();
  return db.prepare(
    `SELECT s.indicator_id ind, di.name, di.area, di.reflect_stage stage, s.converted_score conv,
            (SELECT COUNT(*) FROM fact_activity fa WHERE fa.person_id=s.person_id AND fa.period_id=s.period_id AND fa.indicator_id=s.indicator_id) cnt
     FROM fact_indicator_score s JOIN dim_indicator di ON di.indicator_id=s.indicator_id
     WHERE s.person_id=? AND s.period_id=? AND s.grain='PERSON' AND di.reflect_stage='SCORE'
     ORDER BY di.sort_order`
  ).all(id, year) as any[];
}

// ─────────────────────────── 학과·단과대 비교 ───────────────────────────
export function deptRanking(year = YEAR, group?: string) {
  const db = getDb();
  const sql = `SELECT o.org_id id, o.name dept, o.series_group grp, o.series field, COUNT(*) n,
            ROUND(AVG(e.composite_score+e.bonus_score),1) score,
            SUM(e.grade_rel='S') s, SUM(e.grade_rel='A') a, SUM(e.grade_rel='B') b, SUM(e.grade_rel='C') c, SUM(e.grade_rel='D') d,
            ROUND(AVG(e.research_total),0) research
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE e.cycle_id=? ${group ? "AND o.series_group=?" : ""} GROUP BY o.org_id ORDER BY score DESC`;
  return (group ? db.prepare(sql).all(year, group) : db.prepare(sql).all(year)) as any[];
}

export function deptScores(deptId: number, year = YEAR) {
  const db = getDb();
  return (db.prepare(
    `SELECT p.name, e.composite_score+e.bonus_score t, e.grade_rel grade, e.person_id id, pr.rank
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id LEFT JOIN prof_profile pr ON pr.person_id=p.person_id
     WHERE e.cycle_id=? AND p.org_id=? ORDER BY t DESC`
  ).all(year, deptId)) as any[];
}

// ─────────────────────────── 지표·파라미터 투명성 ───────────────────────────
export function paperBands() {
  const db = getDb();
  return db.prepare(`SELECT coef_key k, coef_value v, note FROM param_coefficient WHERE coef_group='paper_band' AND param_version_id=? ORDER BY v DESC`).all(PV) as any[];
}
export function indicatorMaster() {
  const db = getDb();
  return db.prepare(`SELECT indicator_id id, area, name, formula_type ft, reflect_stage stage, is_new isNew, unit FROM dim_indicator ORDER BY sort_order`).all() as any[];
}
export function trackWeights() {
  const db = getDb();
  return db.prepare(`SELECT track_code code, track_name name, w_R, w_E, w_I, w_S FROM param_track_weight WHERE param_version_id=?`).all(PV) as any[];
}
export function ipUnits() {
  const db = getDb();
  return db.prepare(`SELECT coef_key k, coef_value v, note FROM param_coefficient WHERE coef_group='ip_unit' AND param_version_id=? ORDER BY v DESC`).all(PV) as any[];
}
export function gradeCuts() {
  const db = getDb();
  return db.prepare(`SELECT grade, cut_score cut, dist_ratio dist, mode FROM param_grade_policy WHERE param_version_id=? AND target_type='FACULTY' ORDER BY mode, grade`).all(PV) as any[];
}

// ─────────────────────────── 평가 워크플로 ───────────────────────────
export function workflowQueue(session: Session, year = YEAR) {
  const db = getDb();
  let where = "e.cycle_id=?";
  const args: any[] = [year];
  if (session.role === "DEPT_CHAIR") {
    const v = getViewer(session);
    if (v) { where += " AND p.org_id=?"; args.push(v.orgId); }
  } else if (session.role === "FACULTY") {
    where += " AND e.person_id=?"; args.push(session.viewer);
  } else if (session.role === "EVAL_COMMITTEE") {
    where += " AND e.status IN ('COMMITTEE','NOTIFIED')";
  }
  return db.prepare(
    `SELECT e.eval_id id, p.name, p.person_id pid, o.name dept, e.status, e.current_step step,
            ROUND(e.composite_score+e.bonus_score,1) score, e.grade_rel grade, p.appointed_version version, e.quality_gate_pass gate,
            (SELECT COUNT(*) FROM fact_appeal ap WHERE ap.eval_id=e.eval_id) appeals,
            (SELECT ap.status FROM fact_appeal ap WHERE ap.eval_id=e.eval_id ORDER BY ap.appeal_id DESC LIMIT 1) appealStatus
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE ${where} ORDER BY e.status, score DESC LIMIT 60`
  ).all(...args) as any[];
}

export function evalById(evalId: number) {
  const db = getDb();
  return db.prepare(
    `SELECT e.eval_id id, e.person_id pid, e.cycle_id cycle, p.name, o.name dept, o.series_group grp, pr.rank, pr.track_code track,
            p.appointed_version version, e.status, e.current_step step, ROUND(e.composite_score+e.bonus_score,1) score,
            e.grade_rel grade, e.grade_final final, e.quality_gate_pass gate, e.moving_target_rate mtRate,
            e.chair_comment chairC, e.committee_comment commC
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     LEFT JOIN prof_profile pr ON pr.person_id=p.person_id WHERE e.eval_id=?`
  ).get(evalId) as any;
}

export function workflowSteps(evalId: number) {
  const db = getDb();
  return db.prepare(`SELECT step_no step, from_status f, to_status t, actor_role actor, action, comment, acted_at at FROM eval_step_log WHERE eval_id=? ORDER BY log_id`).all(evalId) as any[];
}

/** 이의신청·반려 내역 (fact_appeal). 워크플로 상세에 표시. */
export function evalAppeals(evalId: number) {
  const db = getDb();
  return db.prepare(`SELECT reason, filed_at filedAt, status, resolution, resolved_at resolvedAt FROM fact_appeal WHERE eval_id=? ORDER BY appeal_id`).all(evalId) as any[];
}

// ─────── 정적 export(generateStaticParams)용 전체 id 목록 ───────
export function allFacultyIds(): number[] {
  const db = getDb();
  return (db.prepare(`SELECT person_id id FROM prof_profile ORDER BY person_id`).all() as any[]).map((r) => r.id);
}
export function allStaffIds(): number[] {
  const db = getDb();
  return (db.prepare(`SELECT person_id id FROM staff_profile ORDER BY person_id`).all() as any[]).map((r) => r.id);
}
/** 워크플로 목록에서 링크되는 평가 건(교원+직원 대기열 상한 내) id */
export function workflowStaticIds(): number[] {
  const db = getDb();
  const fac = workflowQueue(DEFAULT_SESSION).map((r: any) => r.id as number);
  const stf = staffWorkflowQueue(DEFAULT_SESSION).map((r: any) => r.id as number);
  // 이의신청이 있는 평가 건은 반드시 상세 페이지를 생성(정적 export에서 누락 방지) — B3 이의·반려 표시.
  const appeals = (db.prepare(`SELECT DISTINCT eval_id id FROM fact_appeal`).all() as any[]).map((r) => r.id as number);
  return Array.from(new Set([...fac, ...stf, ...appeals]));
}

// ═══════════════════════════ 직원(STAFF) ═══════════════════════════
export const STAFF_LATEST = 20252;

export function staffRoleOptions(): { staff: PersonOpt[]; leads: PersonOpt[]; heads: PersonOpt[] } {
  const db = getDb();
  const map = (r: any): PersonOpt => ({ id: r.id, name: r.name, dept: r.dept, group: r.grp });
  const staff = db.prepare(
    `SELECT e.person_id id, p.name, o.name dept, o.dept_type grp FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE e.cycle_id=? ORDER BY e.composite_score DESC LIMIT 8`
  ).all(STAFF_LATEST).map(map);
  const leads = db.prepare(`SELECT p.person_id id, p.name, o.name dept, o.dept_type grp FROM staff_profile sp JOIN dim_person p ON p.person_id=sp.person_id JOIN dim_org o ON o.org_id=p.org_id WHERE sp.mgr_role='TEAM_LEAD' ORDER BY p.person_id LIMIT 8`).all().map(map);
  const heads = db.prepare(`SELECT p.person_id id, p.name, o.name dept, o.dept_type grp FROM staff_profile sp JOIN dim_person p ON p.person_id=sp.person_id JOIN dim_org o ON o.org_id=p.org_id WHERE sp.mgr_role='DEPT_HEAD' ORDER BY o.sort_order LIMIT 10`).all().map(map);
  return { staff, leads, heads };
}

export function canViewStaff(s: Session, targetId: number): { ok: boolean; masked: boolean; reason?: string } {
  const db = getDb();
  if (s.role === "HR_TEAM") return { ok: true, masked: false };
  if (s.role === "PRESIDENT") return { ok: true, masked: true };
  if (s.role === "STAFF") return s.viewer === targetId ? { ok: true, masked: false } : { ok: false, masked: false, reason: "직원 본인 권한은 본인 카드만 열람할 수 있습니다." };
  if (s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD") {
    const v = getViewer(s); const t = db.prepare(`SELECT org_id FROM dim_person WHERE person_id=?`).get(targetId) as any;
    return v && t && t.org_id === v.orgId ? { ok: true, masked: false } : { ok: false, masked: false, reason: "부서 권한은 소속 부서 직원만 열람할 수 있습니다." };
  }
  return { ok: false, masked: false, reason: "직원 성과카드 접근 권한이 없습니다." };
}

export function staffHeader(id: number) {
  const db = getDb();
  return db.prepare(
    `SELECT p.person_id id, p.name, p.person_code code, o.org_id orgId, o.name dept, o.dept_type deptType,
            sp.job_grade grade, sp.job_family_top familyTop, sp.tenure_years tenure, sp.is_manager isMgr, sp.mgr_role mgrRole, sp.eval_type evalType
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id JOIN staff_profile sp ON sp.person_id=p.person_id WHERE p.person_id=?`
  ).get(id) as any;
}
export function staffHalves() {
  const db = getDb();
  return (db.prepare(`SELECT cycle_id id, year, half FROM dim_cycle WHERE target_type='STAFF' ORDER BY cycle_id DESC`).all()) as any[];
}
export function staffEval(id: number, half = STAFF_LATEST) {
  const db = getDb();
  return db.prepare(
    `SELECT eval_id evalId, composite_score comp, raw_total rawTotal, score_scale scale, service_score service,
            gain_points gain, penalty_points penalty, adjustment_coef adj, mbo_rate mbo,
            grade_abs abs, grade_rel rel, grade_final final, status, current_step step
     FROM fact_evaluation WHERE person_id=? AND cycle_id=?`
  ).get(id, half) as any;
}
export function staffAreas(id: number, half = STAFF_LATEST) {
  const db = getDb();
  return db.prepare(
    `SELECT a.area, a.raw_score raw, a.weight max, a.std_score norm FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id
     WHERE e.person_id=? AND e.cycle_id=? ORDER BY a.weight DESC`
  ).all(id, half) as any[];
}
export function staffTrend(id: number) {
  const db = getDb();
  return db.prepare(`SELECT cycle_id half, ROUND(composite_score,1) score, grade_rel grade FROM fact_evaluation WHERE person_id=? AND cycle_id>20000 ORDER BY cycle_id`).all(id) as any[];
}
export function staffPercentile(id: number, half = STAFF_LATEST) {
  const db = getDb();
  const me = (db.prepare(`SELECT composite_score c, org_id FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.person_id=? AND e.cycle_id=?`).get(id, half) as any);
  const all = (db.prepare(`SELECT composite_score c FROM fact_evaluation WHERE cycle_id=?`).all(half) as any[]).map((x) => x.c);
  const dept = (db.prepare(`SELECT e.composite_score c FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND p.org_id=?`).all(half, me.org_id) as any[]).map((x) => x.c);
  const pf = (arr: number[]) => Math.round((arr.filter((v) => v <= me.c).length / arr.length) * 100);
  return { all: pf(all), dept: pf(dept), score: +me.c.toFixed(1) };
}
/** 직원 '내 위치': 종합 + 정규평가 영역별 부서·전체 순위/표준화 분포 */
export function staffRanks(id: number, half = STAFF_LATEST): (RankStat & { key: string })[] {
  const db = getDb();
  const me = (db.prepare(`SELECT composite_score c, org_id FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.person_id=? AND e.cycle_id=?`).get(id, half) as any);
  const org = me.org_id;
  const out: (RankStat & { key: string })[] = [];
  const all = (db.prepare(`SELECT composite_score c FROM fact_evaluation WHERE cycle_id=?`).all(half) as any[]).map((x) => x.c);
  const dept = (db.prepare(`SELECT e.composite_score c FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND p.org_id=?`).all(half, org) as any[]).map((x) => x.c);
  out.push({ key: "ALL", ...rankStats(me.c, dept, all) });
  const mine = db.prepare(`SELECT a.area, a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id WHERE e.person_id=? AND e.cycle_id=? ORDER BY a.weight DESC`).all(id, half) as any[];
  for (const r of mine) {
    const dArr = (db.prepare(`SELECT a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=? AND a.area=? AND p.org_id=?`).all(half, r.area, org) as any[]).map((x) => x.s);
    const aArr = (db.prepare(`SELECT a.std_score s FROM fact_evaluation_area a JOIN fact_evaluation e ON e.eval_id=a.eval_id WHERE e.cycle_id=? AND a.area=?`).all(half, r.area) as any[]).map((x) => x.s);
    out.push({ key: r.area, ...rankStats(r.s, dArr, aArr) });
  }
  return out;
}

/** 동료평가 360° (블라인드). rater_hash·rater_org_id는 절대 SELECT하지 않는다 → API 응답에 평가자 식별정보 미포함. */
const FB_REL: [string, string][] = [["MGR_DOWN", "상사"], ["PEER", "동료"], ["SUBORD_UP", "부하"], ["CROSS_DEPT", "타부서"]];
export function staffFeedback(id: number, half = STAFF_LATEST) {
  const db = getDb();
  // 익명 컬럼만 조회 (rater_hash, rater_org_id 제외)
  const rows = db.prepare(`SELECT rel_type rel, score_overall ov, item_scores items, comment, responded FROM fact_feedback WHERE subject_id=? AND cycle_id=?`).all(id, half) as any[];
  const invited = rows.length;
  const resp = rows.filter((r) => r.responded);
  const responded = resp.length;
  const byRel = FB_REL.map(([t, label]) => {
    const rs = resp.filter((r) => r.rel === t);
    return { type: t, label, n: rs.length, avg: rs.length ? +(rs.reduce((s, r) => s + r.ov, 0) / rs.length).toFixed(2) : 0 };
  }).filter((r) => r.n > 0);
  const itemSum = new Map<string, { s: number; n: number }>();
  for (const r of resp) { const it = JSON.parse(r.items || "{}"); for (const [k, v] of Object.entries(it)) { const e = itemSum.get(k) ?? { s: 0, n: 0 }; e.s += v as number; e.n++; itemSum.set(k, e); } }
  const items = [...itemSum].map(([label, e]) => ({ label, avg: +(e.s / e.n).toFixed(2) })).sort((a, b) => b.avg - a.avg);
  const relLabel = (t: string) => FB_REL.find((x) => x[0] === t)?.[1] ?? "";
  const comments = resp.filter((r) => r.comment).map((r) => ({ rel: relLabel(r.rel), text: r.comment as string }));
  const overall = responded ? +(resp.reduce((s, r) => s + r.ov, 0) / responded).toFixed(2) : 0;
  const n40 = (db.prepare(`SELECT raw_value v FROM fact_indicator_score WHERE person_id=? AND period_id=? AND indicator_id='N40' AND grain='PERSON'`).get(id, half) as any)?.v;
  return { enabled: invited > 0, invited, responded, byRel, items, comments, overall, weighted: n40 != null ? +(+n40).toFixed(2) : overall };
}

export function staffMbo(id: number, half = STAFF_LATEST) {
  const db = getDb();
  return (db.prepare(`SELECT activity_id aid, title, attributes attrs FROM fact_activity WHERE person_id=? AND period_id=? AND activity_type='MBO' ORDER BY activity_id`).all(id, half) as any[])
    .map((r) => ({ title: r.title, ...JSON.parse(r.attrs) }));
}
export function staffScoreRows(id: number, half = STAFF_LATEST) {
  const db = getDb();
  return db.prepare(
    `SELECT s.indicator_id ind, di.name, di.area, di.reflect_stage stage, di.formula_params fp, s.raw_value raw, s.converted_score conv,
            (SELECT COUNT(*) FROM fact_activity fa WHERE fa.person_id=s.person_id AND fa.period_id=s.period_id AND fa.indicator_id=s.indicator_id) cnt
     FROM fact_indicator_score s JOIN dim_indicator di ON di.indicator_id=s.indicator_id
     WHERE s.person_id=? AND s.period_id=? AND s.grain='PERSON' AND di.reflect_stage IN ('SCORE','MONITOR') ORDER BY di.sort_order`
  ).all(id, half) as any[];
}
/** 반기 수행 업무 — 자기작성 업무일지(SELF_REPORT) 카드 데이터 */
export function staffWorklog(id: number, half = STAFF_LATEST) {
  const db = getDb();
  const rows = db.prepare(`SELECT title, occurred_on date, attributes attrs FROM fact_activity WHERE person_id=? AND period_id=? AND activity_type='SELF_REPORT' ORDER BY occurred_on DESC, activity_id DESC`).all(id, half) as any[];
  return rows.map((r) => {
    const a = JSON.parse(r.attrs);
    return {
      title: r.title as string,
      start: (a.start ?? a.date) as string,
      end: (a.end ?? a.date) as string,
      durationDays: (a.durationDays ?? 1) as number,
      month: a.month as number,
      summary: a.summary as string,
      category: a.category as string,
      deptSpecific: !!a.deptSpecific,
      evidences: (a.evidences ?? []) as { type: string; doc: string }[],
      owner: { id: a.ownerId as number, name: a.ownerName as string, role: a.ownerRole as string, roleLabel: (a.ownerRoleLabel ?? "책임자") as string },
      performers: (a.performers ?? []) as { id: number; name: string; self: boolean }[],
      kpi: (a.kpi ?? null) as { kind: string; mboGoal: string | null; code: string | null; name: string | null } | null,
    };
  });
}

export function staffActivities(id: number, half = STAFF_LATEST, type?: string) {
  const db = getDb();
  const sql = `SELECT activity_type type, title, attributes attrs FROM fact_activity WHERE person_id=? AND period_id=? ${type ? "AND activity_type=?" : ""} ORDER BY activity_id`;
  const rows = (type ? db.prepare(sql).all(id, half, type) : db.prepare(sql).all(id, half)) as any[];
  return rows.map((r) => ({ type: r.type, title: r.title, attrs: JSON.parse(r.attrs) }));
}

// ── 부서 KPI 대시보드 ──
export function unitRanking(half = STAFF_LATEST, deptType?: string) {
  const db = getDb();
  const sql = `SELECT o.org_id id, o.name dept, o.dept_type type, COUNT(*) n, ROUND(AVG(e.composite_score),1) score,
            SUM(e.grade_rel='S') s, SUM(e.grade_rel='A') a, SUM(e.grade_rel='B') b, SUM(e.grade_rel='C') c, SUM(e.grade_rel='D') d,
            (SELECT ROUND(AVG(k.raw_value),1) FROM fact_indicator_score k JOIN dim_indicator di ON di.indicator_id=k.indicator_id WHERE k.grain='ORG' AND k.org_id=o.org_id AND k.period_id=? AND di.area='KPI') kpi
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE e.cycle_id=? ${deptType ? "AND o.dept_type=?" : ""} GROUP BY o.org_id ORDER BY kpi DESC`;
  return (deptType ? db.prepare(sql).all(half, half, deptType) : db.prepare(sql).all(half, half)) as any[];
}
export function unitKpis(orgId: number, half = STAFF_LATEST) {
  const db = getDb();
  return (db.prepare(
    `SELECT k.indicator_id code, di.name, di.formula_params fp, di.unit, k.raw_value rate
     FROM fact_indicator_score k JOIN dim_indicator di ON di.indicator_id=k.indicator_id
     WHERE k.grain='ORG' AND k.org_id=? AND k.period_id=? AND di.area='KPI' ORDER BY k.indicator_id`
  ).all(orgId, half) as any[]).map((r) => ({ code: r.code, name: r.name, unit: r.unit, rate: r.rate, ...JSON.parse(r.fp) }));
}
export function unitMembers(orgId: number, half = STAFF_LATEST) {
  const db = getDb();
  return db.prepare(
    `SELECT p.person_id id, p.name, sp.job_grade jobGrade, sp.mgr_role mgrRole, e.composite_score comp, e.grade_rel grade, e.mbo_rate mbo
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN staff_profile sp ON sp.person_id=p.person_id
     WHERE e.cycle_id=? AND p.org_id=? ORDER BY e.composite_score DESC`
  ).all(half, orgId) as any[];
}
/** 캐스케이딩: 부서 KPI → 정렬된 개인 MBO 목표 표본 */
export function unitCascade(orgId: number, half = STAFF_LATEST) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT fa.attributes attrs, p.name FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id
     WHERE fa.activity_type='MBO' AND fa.period_id=? AND p.org_id=? ORDER BY fa.activity_id LIMIT 40`
  ).all(half, orgId) as any[];
  const byKpi = new Map<string, { name: string; goals: { person: string; goal: string; rate: number }[] }>();
  for (const r of rows) {
    const a = JSON.parse(r.attrs);
    if (!byKpi.has(a.cascade_parent)) byKpi.set(a.cascade_parent, { name: a.cascade_name, goals: [] });
    const e = byKpi.get(a.cascade_parent)!;
    if (e.goals.length < 4) e.goals.push({ person: r.name, goal: a.goal, rate: a.rate });
  }
  return byKpi;
}

// ── 직원 워크플로 ──
export function staffWorkflowQueue(s: Session, half = STAFF_LATEST) {
  const db = getDb();
  let where = "e.cycle_id=?"; const args: any[] = [half];
  if (s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD") { const v = getViewer(s); if (v) { where += " AND p.org_id=?"; args.push(v.orgId); } }
  else if (s.role === "STAFF") { where += " AND e.person_id=?"; args.push(s.viewer); }
  return db.prepare(
    `SELECT e.eval_id id, p.name, p.person_id pid, o.name dept, e.status, e.current_step step, ROUND(e.composite_score,1) score, e.grade_rel grade, sp.mgr_role mgrRole,
            (SELECT COUNT(*) FROM fact_appeal ap WHERE ap.eval_id=e.eval_id) appeals,
            (SELECT ap.status FROM fact_appeal ap WHERE ap.eval_id=e.eval_id ORDER BY ap.appeal_id DESC LIMIT 1) appealStatus
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id JOIN staff_profile sp ON sp.person_id=p.person_id
     WHERE ${where} ORDER BY e.status, score DESC LIMIT 60`
  ).all(...args) as any[];
}

export function staffIndicatorMaster() {
  const db = getDb();
  return (db.prepare(`SELECT indicator_id id, area, name, reflect_stage stage, is_new isNew, unit, formula_params fp FROM dim_indicator WHERE target_type='STAFF' AND area<>'KPI' ORDER BY sort_order`).all() as any[])
    .map((r) => ({ ...r, layer: JSON.parse(r.fp || "{}").layer ?? "" }));
}
export function staffAreaMaxRows() {
  const db = getDb();
  return db.prepare(`SELECT coef_key k, coef_value v, note FROM param_coefficient WHERE coef_group='staff_area_max' AND param_version_id=2 ORDER BY v DESC`).all() as any[];
}
export function staffCoefRows(group: string) {
  const db = getDb();
  return db.prepare(`SELECT coef_key k, coef_value v, note FROM param_coefficient WHERE coef_group=? AND param_version_id=? ORDER BY v DESC`).all(group, PV) as any[];
}
export function staffGradeCuts() {
  const db = getDb();
  return db.prepare(`SELECT grade, cut_score cut, dist_ratio dist, mode FROM param_grade_policy WHERE param_version_id=? AND target_type='STAFF' ORDER BY mode, grade`).all(PV) as any[];
}

// 기관 통합 대시보드용 직원 요약
export function staffInstituteSummary(half = STAFF_LATEST) {
  const db = getDb();
  const q = (sql: string, ...a: any[]) => db.prepare(sql).get(...a) as any;
  const n = q(`SELECT COUNT(*) n FROM dim_person WHERE person_type='STAFF'`).n;
  const avg = q(`SELECT AVG(composite_score) m, AVG(mbo_rate) mbo FROM fact_evaluation WHERE cycle_id=?`, half);
  const kpi = q(`SELECT AVG(raw_value) m FROM fact_indicator_score WHERE grain='ORG' AND period_id=? AND indicator_id LIKE 'K\\_%' ESCAPE '\\'`, half);
  const gd = db.prepare(`SELECT grade_rel g, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? GROUP BY grade_rel`).all(half) as any[];
  const dist: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }; for (const r of gd) dist[r.g] = r.n;
  return { n, avg: +avg.m.toFixed(1), mbo: +avg.mbo.toFixed(0), kpi: +kpi.m.toFixed(1), dist };
}

// ═══════════════════════════ 인원 선택기 (캐스케이딩) ═══════════════════════════
export interface PickL2 { key: string; label: string; persons: { id: number; name: string }[]; }
export interface PickL1 { key: string; label: string; children: PickL2[]; }

export function pickerFaculty(s: Session): { enabled: boolean; tree: PickL1[] } {
  const db = getDb();
  if (s.role === "FACULTY") return { enabled: false, tree: [] };
  let scope = ""; const args: any[] = [];
  if (s.role === "DEPT_CHAIR") { const v = getViewer(s); if (v) { scope = "AND o.org_id=?"; args.push(v.orgId); } }
  const rows = db.prepare(
    `SELECT col.name college, o.org_id deptId, o.name dept, p.person_id id, p.name
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id JOIN dim_org col ON col.org_id=o.parent_id
     WHERE p.person_type='FACULTY' ${scope} ORDER BY col.sort_order, o.sort_order, p.name`
  ).all(...args) as any[];
  return { enabled: true, tree: buildTree(rows, (r) => r.college, (r) => r.college, (r) => String(r.deptId), (r) => r.dept) };
}

export function pickerStaff(s: Session): { enabled: boolean; tree: PickL1[] } {
  const db = getDb();
  if (s.role === "STAFF") return { enabled: false, tree: [] };
  let scope = ""; const args: any[] = [];
  if (s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD") { const v = getViewer(s); if (v) { scope = "AND o.org_id=?"; args.push(v.orgId); } }
  const rows = db.prepare(
    `SELECT o.dept_type type, o.org_id deptId, o.name dept, p.person_id id, p.name
     FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id
     WHERE p.person_type='STAFF' ${scope} ORDER BY o.sort_order, p.name`
  ).all(...args) as any[];
  return { enabled: true, tree: buildTree(rows, (r) => r.type, (r) => r.type, (r) => String(r.deptId), (r) => r.dept) };
}

function buildTree(rows: any[], l1key: (r: any) => string, l1label: (r: any) => string, l2key: (r: any) => string, l2label: (r: any) => string): PickL1[] {
  const l1m = new Map<string, PickL1>();
  for (const r of rows) {
    const k1 = l1key(r);
    if (!l1m.has(k1)) l1m.set(k1, { key: k1, label: l1label(r), children: [] });
    const g1 = l1m.get(k1)!;
    const k2 = l2key(r);
    let g2 = g1.children.find((c) => c.key === k2);
    if (!g2) { g2 = { key: k2, label: l2label(r), persons: [] }; g1.children.push(g2); }
    g2.persons.push({ id: r.id, name: r.name });
  }
  return [...l1m.values()];
}

// ═══════════════════════════ 상관관계 분석 ═══════════════════════════
export function analysisFacultyData() {
  const db = getDb();
  const metrics = [
    { key: "R", label: "연구(R)" }, { key: "E", label: "교육(E)" }, { key: "I", label: "산학(I)" }, { key: "S", label: "봉사(S)" },
    { key: "comp", label: "종합점수" }, { key: "papers", label: "논문 수" }, { key: "fund", label: "연구비" }, { key: "fwci", label: "FWCI" }, { key: "lecture", label: "강의평가" },
  ];
  const rows = (db.prepare(
    `SELECT p.name label, o.series_group grp,
       (e.composite_score+e.bonus_score) comp,
       (SELECT a.std_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='R') R,
       (SELECT a.std_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='E') E,
       (SELECT a.std_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='I') I,
       (SELECT a.std_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='S') S,
       (SELECT s.raw_value FROM fact_indicator_score s WHERE s.person_id=e.person_id AND s.period_id=2025 AND s.indicator_id='R01' AND s.grain='PERSON') papers,
       (SELECT s.raw_value FROM fact_indicator_score s WHERE s.person_id=e.person_id AND s.period_id=2025 AND s.indicator_id='R04' AND s.grain='PERSON') fund,
       (SELECT s.raw_value FROM fact_indicator_score s WHERE s.person_id=e.person_id AND s.period_id=2025 AND s.indicator_id='R05' AND s.grain='PERSON') fwci,
       (SELECT s.raw_value FROM fact_indicator_score s WHERE s.person_id=e.person_id AND s.period_id=2025 AND s.indicator_id='E01' AND s.grain='PERSON') lecture
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id WHERE e.cycle_id=2025`
  ).all() as any[]).map((r) => ({
    group: r.grp, label: r.label,
    vals: [r.R ?? 0, r.E ?? 0, r.I ?? 0, r.S ?? 0, r.comp ?? 0, r.papers ?? 0, (r.fund ?? 0) / 1e6, r.fwci ?? 1, r.lecture ?? 0],
  }));
  return { metrics, rows };
}

export function analysisStaffData() {
  const db = getDb();
  const metrics = [
    { key: "comp", label: "종합점수" }, { key: "mbo", label: "MBO 달성률" }, { key: "svc", label: "서비스성과" }, { key: "kpi", label: "부서 KPI" },
    { key: "WORK", label: "근무실적" }, { key: "ATTITUDE", label: "근무태도" }, { key: "JOB", label: "직무역량" }, { key: "LEAD", label: "리더십" },
  ];
  const rows = (db.prepare(
    `SELECT p.name label, o.dept_type grp, e.composite_score comp, e.mbo_rate mbo, e.service_score svc,
       (SELECT s.raw_value FROM fact_indicator_score s WHERE s.person_id=e.person_id AND s.period_id=20252 AND s.indicator_id='N21' AND s.grain='PERSON') kpi,
       (SELECT a.raw_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='WORK') WORK,
       (SELECT a.raw_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='ATTITUDE') ATTITUDE,
       (SELECT a.raw_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='JOB_COMP') JOB,
       (SELECT a.raw_score FROM fact_evaluation_area a WHERE a.eval_id=e.eval_id AND a.area='LEADERSHIP') LEAD
     FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id JOIN staff_profile sp ON sp.person_id=p.person_id
     WHERE e.cycle_id=20252 AND sp.job_family_top='GENERAL'`
  ).all() as any[]).map((r) => ({
    group: r.grp, label: r.label,
    vals: [r.comp ?? 0, r.mbo ?? 0, r.svc ?? 0, r.kpi ?? 0, r.WORK ?? 0, r.ATTITUDE ?? 0, r.JOB ?? 0, r.LEAD ?? 0],
  }));
  return { metrics, rows };
}

export const roleCount: Record<string, number> = {};

// ─────────────────────────── 성과 총람 (Overview) ───────────────────────────
export interface OTier { key: string; label: string; order: number; n: number; avg: number; grades: Record<string, number>; }
export interface OPerson {
  id: number; name: string; dept: string; group: string;
  tierKey: string; tierLabel: string; tierOrder: number; x: number; score: number; grade: string;
  tenure: number; delta: number | null; quad: number; areas: { key: string; val: number }[]; trend: number[];
}
export interface OverviewData {
  kind: "faculty" | "staff"; base: string; masked: boolean; scopeLabel: string;
  people: OPerson[]; tiers: OTier[]; meanX: number; meanY: number;
  trendAxis: string[]; kpi: { n: number; avg: number; sRate: number; quad: number[]; noDelta: number };
  yLabel: string; xLabel: string; scoreBasis: string; deltaLabel: string; deltaUnit: string; denied?: boolean; reason?: string;
}

function overviewScope(s: Session): { scope: string; masked: boolean; orgId: number | null; scopeLabel: string; denied: boolean } {
  const r = ROLES[s.role];
  const masked = !r.seeIndividualRaw;
  if (r.scope === "SELF") return { scope: "SELF", masked, orgId: null, scopeLabel: "본인", denied: true };
  if (r.scope === "DEPT") { const v = getViewer(s); return { scope: "DEPT", masked, orgId: v?.orgId ?? -1, scopeLabel: v?.dept ?? "소속 부서", denied: false }; }
  return { scope: r.scope, masked, orgId: null, scopeLabel: masked ? "전사 · 익명 집계" : "전사", denied: false };
}
const GRADES5 = ["S", "A", "B", "C", "D"] as const;
const emptyGrades = () => ({ S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<string, number>);
// 안정적 지터(포인트 겹침 완화) — id 기반 결정적. Δ는 실제값이므로 최소 지터만 적용.
const jitter = (id: number) => ((id * 2654435761) % 997) / 997;

/** 사분면 배정 + Δ(성과 모멘텀) x축·평균선 계산 후 people 완성 */
function finishOverview(kind: "faculty" | "staff", base: string, sc: ReturnType<typeof overviewScope>,
  raw: { id: number; name: string; dept: string; group: string; tierKey: string; tierLabel: string; order: number; score: number; grade: string; tenure: number; delta: number | null; areas: { key: string; val: number }[]; trend: number[] }[],
  tierDefs: { key: string; label: string; order: number }[], trendAxis: string[], yLabel: string, xLabel: string, scoreBasis: string, deltaLabel: string, deltaUnit: string): OverviewData {
  // X = 성과 모멘텀(직전 평가 대비 Δ). Δ 산출 불가 인원은 Δ=0(중앙)으로 배치. 최소 지터만 가산.
  const pts = raw.map((r) => ({ ...r, x: +((r.delta ?? 0) + (jitter(r.id) - 0.5) * 0.24).toFixed(3) }));
  const meanX = +(pts.reduce((s, p) => s + p.x, 0) / (pts.length || 1)).toFixed(2);
  const meanY = +(pts.reduce((s, p) => s + p.score, 0) / (pts.length || 1)).toFixed(2);
  const quadOf = (x: number, y: number) => { const right = x >= meanX, hi = y >= meanY; return right ? (hi ? 1 : 3) : (hi ? 0 : 2); }; // 0 TL,1 TR,2 BL,3 BR
  const quad = [0, 0, 0, 0];
  const people: OPerson[] = pts.map((p, i) => {
    const q = quadOf(p.x, p.score); quad[q]++;
    return { id: p.id, name: sc.masked ? `구성원 ${i + 1}` : p.name, dept: sc.masked ? "—" : p.dept, group: p.group,
      tierKey: p.tierKey, tierLabel: p.tierLabel, tierOrder: p.order, x: p.x, score: +p.score.toFixed(1), grade: p.grade, tenure: p.tenure, delta: p.delta, quad: q, areas: p.areas, trend: p.trend };
  });
  const tiers: OTier[] = tierDefs.map((t) => {
    const mem = raw.filter((r) => r.tierKey === t.key);
    const grades = emptyGrades(); for (const m of mem) if (grades[m.grade] != null) grades[m.grade]++;
    return { key: t.key, label: t.label, order: t.order, n: mem.length, avg: mem.length ? +(mem.reduce((s, m) => s + m.score, 0) / mem.length).toFixed(1) : 0, grades };
  }).filter((t) => t.n > 0).sort((a, b) => b.order - a.order);
  const sN = raw.filter((r) => r.grade === "S").length;
  const noDelta = raw.filter((r) => r.delta == null).length;
  return { kind, base, masked: sc.masked, scopeLabel: sc.scopeLabel, people, tiers, meanX, meanY, trendAxis,
    kpi: { n: raw.length, avg: meanY, sRate: raw.length ? Math.round((sN / raw.length) * 100) : 0, quad, noDelta }, yLabel, xLabel, scoreBasis, deltaLabel, deltaUnit };
}

const FAC_TIER = (rank: string) => rank === "정교수" ? { key: "PROF", label: "정교수", order: 3 } : rank === "부교수" ? { key: "ASSOC", label: "부교수", order: 2 } : { key: "ASST", label: "조교수", order: 1 };
const FAC_TIERS = [{ key: "ASST", label: "조교수", order: 1 }, { key: "ASSOC", label: "부교수", order: 2 }, { key: "PROF", label: "정교수", order: 3 }];
const FAC_AREA_ORDER = ["R", "E", "I", "S"];

export function overviewFaculty(s: Session): OverviewData {
  const sc = overviewScope(s);
  const denied: OverviewData = { kind: "faculty", base: "/faculty", masked: sc.masked, scopeLabel: sc.scopeLabel, people: [], tiers: [], meanX: 0, meanY: 0, trendAxis: [], kpi: { n: 0, avg: 0, sRate: 0, quad: [0, 0, 0, 0], noDelta: 0 }, yLabel: "종합점수 (기준환산 100)", xLabel: "성과 모멘텀 · 전년 대비 종합점수 변화 Δ", scoreBasis: "100 기준", deltaLabel: "전년 대비", deltaUnit: "점", denied: sc.denied, reason: "전체 성과 총람은 전사·부서 열람 권한에서 제공됩니다." };
  if (sc.denied) return denied;
  const db = getDb();
  const where = sc.scope === "DEPT" ? "AND p.org_id=@org" : "";
  const rows = db.prepare(`SELECT p.person_id id, p.name, p.appointed_year appt, o.name dept, o.series_group grp, pr.rank,
      (e.composite_score+e.bonus_score) score, e.grade_rel grade
    FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
    LEFT JOIN prof_profile pr ON pr.person_id=p.person_id WHERE e.cycle_id=@yr ${where}`).all({ yr: YEAR, org: sc.orgId }) as any[];
  if (!rows.length) return { ...denied, denied: false, reason: undefined };
  const areaMap = new Map<number, { key: string; val: number }[]>();
  for (const a of db.prepare(`SELECT e.person_id id, ar.area, ar.std_score v FROM fact_evaluation_area ar JOIN fact_evaluation e ON e.eval_id=ar.eval_id JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=@yr ${where}`).all({ yr: YEAR, org: sc.orgId }) as any[]) {
    if (!areaMap.has(a.id)) areaMap.set(a.id, []); areaMap.get(a.id)!.push({ key: a.area, val: +(+a.v).toFixed(1) });
  }
  const trendMap = new Map<number, Map<number, number>>();
  for (const t of db.prepare(`SELECT e.person_id id, e.cycle_id yr, (e.composite_score+e.bonus_score) score FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id<20000 ${where} ORDER BY e.cycle_id`).all({ org: sc.orgId }) as any[]) {
    if (!trendMap.has(t.id)) trendMap.set(t.id, new Map()); trendMap.get(t.id)!.set(t.yr, +(+t.score).toFixed(1));
  }
  const YEARS = [2021, 2022, 2023, 2024, 2025];
  const raw = rows.map((r) => {
    const tier = FAC_TIER(r.rank);
    const areas = (areaMap.get(r.id) ?? []).sort((a, b) => FAC_AREA_ORDER.indexOf(a.key) - FAC_AREA_ORDER.indexOf(b.key));
    const tm = trendMap.get(r.id) ?? new Map();
    // 성과 모멘텀: 전년(2024) 대비 종합점수 변화. 직전 평가 없으면(신임 등) null → 화면에서 Δ=0·"직전 평가 없음".
    const prev = tm.get(YEAR - 1);
    const delta = prev == null ? null : +((r.score ?? 0) - prev).toFixed(1);
    return { id: r.id, name: r.name, dept: r.dept, group: r.grp, tierKey: tier.key, tierLabel: tier.label, order: tier.order,
      score: r.score ?? 0, grade: r.grade, tenure: Math.max(0, YEAR - (r.appt ?? YEAR)), delta, areas, trend: YEARS.map((y) => tm.get(y) ?? NaN) };
  });
  return finishOverview("faculty", "/faculty", sc, raw, FAC_TIERS, YEARS.map(String), "종합점수 (기준환산 100)", "성과 모멘텀 · 전년 대비 종합점수 변화 Δ", "100 기준", "전년 대비", "점");
}

const staffTierOf = (g: string) => (g === "2급" || g === "3급") ? { key: "MANAGER", label: "관리자군 (2·3급)", order: 3 }
  : (g === "4급" || g === "5급") ? { key: "MIDDLE", label: "중견실무 (4·5급)", order: 2 }
  : { key: "JUNIOR", label: "실무직 (6급↓·기능직)", order: 1 };
const STAFF_TIERS = [{ key: "JUNIOR", label: "실무직 (6급↓·기능직)", order: 1 }, { key: "MIDDLE", label: "중견실무 (4·5급)", order: 2 }, { key: "MANAGER", label: "관리자군 (2·3급)", order: 3 }];
const STAFF_AREA_ORDER = ["WORK", "ATTITUDE", "JOB_COMP", "LEADERSHIP", "DEPT_SVC", "COMMON_COMP", "JOB_BEHAV"];

export function overviewStaff(s: Session): OverviewData {
  const sc = overviewScope(s);
  const denied: OverviewData = { kind: "staff", base: "/staff", masked: sc.masked, scopeLabel: sc.scopeLabel, people: [], tiers: [], meanX: 0, meanY: 0, trendAxis: [], kpi: { n: 0, avg: 0, sRate: 0, quad: [0, 0, 0, 0], noDelta: 0 }, yLabel: "종합점수 (정규화 100)", xLabel: "성과 모멘텀 · 전 반기 대비 종합점수 변화 Δ", scoreBasis: "정규화 100", deltaLabel: "전 반기 대비", deltaUnit: "점", denied: sc.denied, reason: "전체 성과 총람은 전사·부서 열람 권한에서 제공됩니다." };
  if (sc.denied) return denied;
  const db = getDb();
  const half = STAFF_LATEST;
  const where = sc.scope === "DEPT" ? "AND p.org_id=@org" : "";
  const rows = db.prepare(`SELECT p.person_id id, p.name, o.name dept, o.dept_type deptType,
      sp.job_grade grade, sp.job_family_top fam, sp.tenure_years tenure,
      e.composite_score score, e.grade_rel graderel
    FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
    JOIN staff_profile sp ON sp.person_id=p.person_id WHERE e.cycle_id=@half ${where}`).all({ half, org: sc.orgId }) as any[];
  if (!rows.length) return { ...denied, denied: false, reason: undefined };
  const areaMap = new Map<number, { key: string; val: number }[]>();
  for (const a of db.prepare(`SELECT e.person_id id, ar.area, ar.std_score v FROM fact_evaluation_area ar JOIN fact_evaluation e ON e.eval_id=ar.eval_id JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id=@half ${where}`).all({ half, org: sc.orgId }) as any[]) {
    if (!areaMap.has(a.id)) areaMap.set(a.id, []); areaMap.get(a.id)!.push({ key: a.area, val: +(+a.v).toFixed(1) });
  }
  const cyclesSet = new Set<number>();
  const trendMap = new Map<number, Map<number, number>>();
  for (const t of db.prepare(`SELECT e.person_id id, e.cycle_id cyc, e.composite_score score FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id WHERE e.cycle_id>20000 ${where} ORDER BY e.cycle_id`).all({ org: sc.orgId }) as any[]) {
    cyclesSet.add(t.cyc); if (!trendMap.has(t.id)) trendMap.set(t.id, new Map()); trendMap.get(t.id)!.set(t.cyc, +(+t.score).toFixed(1));
  }
  const cycles = [...cyclesSet].sort((a, b) => a - b);
  const prevCycle = (() => { const i = cycles.indexOf(half); return i > 0 ? cycles[i - 1] : null; })();
  const raw = rows.map((r) => {
    const tier = staffTierOf(r.grade);
    const areas = (areaMap.get(r.id) ?? []).sort((a, b) => STAFF_AREA_ORDER.indexOf(a.key) - STAFF_AREA_ORDER.indexOf(b.key));
    const tm = trendMap.get(r.id) ?? new Map();
    // 성과 모멘텀: 직전 반기 대비 종합점수 변화. 직전 반기 데이터 없으면 null.
    const prev = prevCycle == null ? undefined : tm.get(prevCycle);
    const delta = prev == null ? null : +((r.score ?? 0) - prev).toFixed(1);
    return { id: r.id, name: r.name, dept: r.dept, group: r.deptType, tierKey: tier.key, tierLabel: tier.label, order: tier.order,
      score: r.score ?? 0, grade: r.graderel, tenure: r.tenure ?? 0, delta, areas, trend: cycles.map((c) => tm.get(c) ?? NaN) };
  });
  const axis = cycles.map((c) => `${String(Math.floor(c / 10)).slice(2)}-${c % 10}`);
  return finishOverview("staff", "/staff", sc, raw, STAFF_TIERS, axis, "종합점수 (정규화 100)", "성과 모멘텀 · 전 반기 대비 종합점수 변화 Δ", "정규화 100", "전 반기 대비", "점");
}
