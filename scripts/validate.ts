/**
 * 정합성 검증 (v1.2). 실패 시 exit 1. 리포트 → data/validation-report.txt.
 * (a) 개인합계=학과집계  (b) 등급 상대상한(계열그룹)  (c) 종합평균 80~90
 * (d) field별 논문 분포 sanity + 1인당 SCI급 0.3~0.8  (e) 학과-주제 정합
 * (f) 도메인·버전 라우팅 정합  (g) Quality Gate 분포  (h) Moving Target 달성률 분포
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DEPARTMENTS } from "../src/generator/content/departments";
import { DEPT_TYPES, deptTypeOf } from "../src/generator/staffData";

const DB_PATH = path.join(process.cwd(), "data", "kmu.db");
const REPORT = path.join(process.cwd(), "data", "validation-report.txt");
const EVAL_YEAR = 2025;
const LAMBDA: Record<string, number> = { 인문: 1.0, 사회: 1.4, 경상: 1.6, 체육: 0.8, 예능: 0.8, ENA: 2.8, ENB: 2.3, ENC: 1.8 };

type Check = { name: string; pass: boolean; detail: string };

function main() {
  const db = new Database(DB_PATH, { readonly: true });
  const checks: Check[] = [];
  const push = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // ── (a) 개인 합계 = ORG 집계 ──
  // 교수 지표만: ORG = SUM(PERSON) (직원 부서KPI는 ORG≠합계이므로 제외)
  const mism = db.prepare(
    `SELECT COUNT(*) n FROM (
       SELECT s.indicator_id, s.org_id, s.period_id,
              ABS(SUM(CASE WHEN s.grain='PERSON' THEN s.converted_score ELSE 0 END)
                - MAX(CASE WHEN s.grain='ORG' THEN s.converted_score ELSE 0 END)) diff,
              SUM(CASE WHEN s.grain='ORG' THEN 1 ELSE 0 END) has_org
       FROM fact_indicator_score s JOIN dim_indicator di ON di.indicator_id=s.indicator_id
       WHERE di.target_type='FACULTY'
       GROUP BY s.indicator_id, s.org_id, s.period_id
       HAVING has_org > 0 AND diff > 0.01)`
  ).get() as { n: number };
  push("(a) 개인합계=학과집계(교수)", mism.n === 0, `불일치 그룹 ${mism.n}개`);

  // ── (b) 등급 상대상한 (계열그룹, grade_rel 2025) ──
  const groups = [...new Set(DEPARTMENTS.map((d) => d.group))];
  const relRows: string[] = [];
  let relPass = true;
  for (const g of groups) {
    const r = db.prepare(
      `SELECT e.grade_rel gr, COUNT(*) n FROM fact_evaluation e
       JOIN dim_person p ON p.person_id=e.person_id JOIN dim_org o ON o.org_id=p.org_id
       WHERE e.cycle_id=? AND o.series_group=? GROUP BY e.grade_rel`
    ).all(EVAL_YEAR, g) as { gr: string; n: number }[];
    const cnt: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    let tot = 0;
    for (const x of r) { cnt[x.gr] = x.n; tot += x.n; }
    const sR = cnt.S / tot, saR = (cnt.S + cnt.A) / tot, dR = cnt.D / tot;
    const ok = sR <= 0.101 && saR <= 0.351 && dR <= 0.0501;
    if (!ok) relPass = false;
    relRows.push(`  ${g}(n=${tot}): S=${(sR * 100).toFixed(1)}% S+A=${(saR * 100).toFixed(1)}% D=${(dR * 100).toFixed(1)}%`);
  }
  push("(b) 등급 상대상한(S≤10%,S+A≤35%,D≤5%)", relPass, "\n" + relRows.join("\n"));

  // ── (c) 종합평균 80~90 ──
  const avg = (db.prepare(`SELECT AVG(composite_score + bonus_score) m FROM fact_evaluation WHERE cycle_id=?`).get(EVAL_YEAR) as { m: number }).m;
  push("(c) 2025 종합평균 80~90", avg >= 80 && avg <= 90, `평균=${avg.toFixed(2)}`);

  // ── (d) field별 논문 분포 + 1인당 SCI급 ──
  const facByField = db.prepare(
    `SELECT o.series f, COUNT(*) n FROM dim_person p JOIN dim_org o ON o.org_id=p.org_id WHERE p.person_type='FACULTY' GROUP BY o.series`
  ).all() as { f: string; n: number }[];
  const facMap = new Map(facByField.map((x) => [x.f, x.n]));
  const distRows: string[] = [];
  let distPass = true;
  for (const f of Object.keys(LAMBDA)) {
    const papers = (db.prepare(
      `SELECT COUNT(*) n FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id JOIN dim_org o ON o.org_id=p.org_id
       WHERE fa.indicator_id='R01' AND fa.period_id=? AND o.series=?`
    ).get(EVAL_YEAR, f) as { n: number }).n;
    const perFac = papers / (facMap.get(f) ?? 1);
    const ok = perFac >= LAMBDA[f] * 0.4 && perFac <= LAMBDA[f] * 1.9;
    if (!ok) distPass = false;
    distRows.push(`  ${f}: ${perFac.toFixed(2)}편/인 (λ=${LAMBDA[f]})`);
  }
  const sciPerFt = (db.prepare(`SELECT our_value v FROM ext_disclosure WHERE year=? AND metric_code='RES_PAPER_SCI_PER_FT'`).get(EVAL_YEAR) as { v: number }).v;
  const sciOk = sciPerFt >= 0.3 && sciPerFt <= 0.8;
  if (!sciOk) distPass = false;
  distRows.push(`  1인당 SCI급 논문 = ${sciPerFt} (앵커 0.3~0.8)`);
  push("(d) 논문 분포 sanity + SCI 앵커", distPass, "\n" + distRows.join("\n"));

  // ── (e) 학과-주제 정합 ──
  const topicMap = new Map<string, Set<string>>();
  for (const d of DEPARTMENTS) topicMap.set(d.name, new Set([...d.topics, ...d.enTopics]));
  const sample = db.prepare(
    `SELECT o.name dept, fa.attributes attrs FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE fa.indicator_id='R01' ORDER BY fa.activity_id LIMIT 2000`
  ).all() as { dept: string; attrs: string }[];
  let bad = 0; const badEx: string[] = [];
  for (const row of sample) {
    const topic = JSON.parse(row.attrs).topic as string;
    const pool = topicMap.get(row.dept);
    if (!pool || !pool.has(topic)) { bad++; if (badEx.length < 3) badEx.push(`${row.dept}←"${topic}"`); }
  }
  push("(e) 학과-주제 정합(논문 2000건)", bad === 0, bad === 0 ? "전부 소속 학과 풀에 속함" : `불일치 ${bad}건: ${badEx.join(", ")}`);

  // ── (f) 도메인 + 버전 라우팅 정합 ──
  const career = (db.prepare(`SELECT COUNT(*) n FROM prof_profile pr JOIN dim_person p ON p.person_id=pr.person_id WHERE pr.promoted_year < p.appointed_year OR pr.promoted_year > 2025`).get() as { n: number }).n;
  const chairAdmin = (db.prepare(`SELECT COUNT(*) n FROM prof_profile WHERE rank='조교수' AND is_admin_post=1`).get() as { n: number }).n;
  const vBad = (db.prepare(
    `SELECT COUNT(*) n FROM dim_person WHERE person_type='FACULTY' AND (
       (appointed_version='V_LEGACY' AND appointed_year>2019) OR
       (appointed_version='V_2019' AND (appointed_year<2020 OR appointed_year>2023)) OR
       (appointed_version='V_2024' AND appointed_year<2024))`
  ).get() as { n: number }).n;
  const vDist = db.prepare(`SELECT appointed_version v, COUNT(*) n FROM dim_person WHERE person_type='FACULTY' GROUP BY appointed_version`).all() as { v: string; n: number }[];
  push("(f) 도메인·버전 라우팅 정합", career === 0 && chairAdmin === 0 && vBad === 0,
    `경력위반 ${career}, 조교수보직 ${chairAdmin}, 버전-연도 불일치 ${vBad} | 분포 ${vDist.map((x) => `${x.v}:${x.n}`).join(" ")}`);

  // ── (g) Quality Gate 분포 (V_2024만) ──
  const gate = db.prepare(`SELECT quality_gate_pass pass, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? AND quality_gate_pass IS NOT NULL GROUP BY quality_gate_pass`).all(EVAL_YEAR) as { pass: number; n: number }[];
  const gPass = gate.find((x) => x.pass === 1)?.n ?? 0;
  const gTot = gate.reduce((s, x) => s + x.n, 0);
  const basis = db.prepare(`SELECT quality_gate_basis b, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? AND quality_gate_basis IS NOT NULL GROUP BY quality_gate_basis`).all(EVAL_YEAR) as { b: string; n: number }[];
  const gateLeak = (db.prepare(
    `SELECT COUNT(*) n FROM fact_evaluation e JOIN dim_person p ON p.person_id=e.person_id
     WHERE e.cycle_id=? AND e.quality_gate_pass IS NOT NULL AND p.appointed_version<>'V_2024'`
  ).get(EVAL_YEAR) as { n: number }).n;
  const gateOk = gTot > 0 && gPass > 0 && gPass < gTot && gateLeak === 0;
  push("(g) Quality Gate 분포(V_2024만)", gateOk, `충족 ${gPass}/${gTot} (근거 ${basis.map((x) => `${x.b}:${x.n}`).join(" ")}), 오적용 ${gateLeak}`);

  // ── (h) Moving Target 달성률 분포 ──
  const mt = db.prepare(`SELECT AVG(moving_target_rate) m, MIN(moving_target_rate) lo, MAX(moving_target_rate) hi, SUM(moving_target_rate>=150) pass, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? AND moving_target_rate IS NOT NULL`).get(EVAL_YEAR) as { m: number; lo: number; hi: number; pass: number; n: number };
  const mtOk = mt.n > 0 && mt.m >= 110 && mt.m <= 150 && mt.pass > 0 && mt.pass < mt.n;
  push("(h) Moving Target 달성률 분포", mtOk, `평균 ${mt.m?.toFixed(1)}% (범위 ${mt.lo?.toFixed(0)}~${mt.hi?.toFixed(0)}), ≥150% 통과 ${mt.pass}/${mt.n}`);

  // ══════════════════ 직원(STAFF) 검증 ══════════════════
  const SHALF = 20252;
  // (i) 직원 등급 강제배분 상한 (S≤20%, S+A≤50%, D≤10%)
  const sg = db.prepare(`SELECT grade_rel g, COUNT(*) n FROM fact_evaluation WHERE cycle_id=? GROUP BY grade_rel`).all(SHALF) as any[];
  const sc: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  let stot = 0; for (const x of sg) { sc[x.g] = x.n; stot += x.n; }
  const sS = sc.S / stot, sSA = (sc.S + sc.A) / stot, sD = sc.D / stot;
  push("(i) 직원 등급 상한(S≤20%,S+A≤50%,D≤10%)", sS <= 0.201 && sSA <= 0.501 && sD <= 0.101,
    `S=${(sS * 100).toFixed(0)}% S+A=${(sSA * 100).toFixed(0)}% D=${(sD * 100).toFixed(0)}% (n=${stot})`);

  // (j) 부서 KPI–개인 MBO 캐스케이딩 정렬 (MBO cascade_parent ∈ 소속 부서유형 KPI)
  const mboSample = db.prepare(
    `SELECT o.dept_type dt, fa.attributes attrs FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE fa.activity_type='MBO' ORDER BY fa.activity_id LIMIT 1500`
  ).all() as any[];
  let mboBad = 0;
  for (const r of mboSample) {
    const parent = JSON.parse(r.attrs).cascade_parent as string;
    const kpis = deptTypeOf(r.dt).kpis.map((k) => k.code);
    if (!kpis.includes(parent)) mboBad++;
  }
  push("(j) 부서KPI-개인MBO 캐스케이딩 정렬", mboBad === 0, mboBad === 0 ? `표본 ${mboSample.length}건 전부 소속 부서 KPI로 정렬` : `불일치 ${mboBad}건`);

  // (k) 개인 N21 = 소속 부서 KPI(ORG) 평균 정합 + 부서KPI 완전성
  const kpiOrgN = (db.prepare(`SELECT COUNT(*) n FROM fact_indicator_score WHERE grain='ORG' AND indicator_id LIKE 'K\\_%' ESCAPE '\\'`).get() as any).n;
  const expectKpi = DEPT_TYPES.reduce((s, dt) => s + dt.kpis.length * dt.count, 0) * 10; // ×10 반기
  const mism2 = (db.prepare(
    `SELECT COUNT(*) n FROM (
       SELECT s.person_id, s.period_id, s.raw_value me,
         (SELECT ROUND(AVG(o2.raw_value),1) FROM fact_indicator_score o2 JOIN dim_indicator di ON di.indicator_id=o2.indicator_id
          WHERE o2.grain='ORG' AND o2.org_id=s.org_id AND o2.period_id=s.period_id AND di.area='KPI') deptavg
       FROM fact_indicator_score s WHERE s.indicator_id='N21' AND s.grain='PERSON'
     ) WHERE ABS(me-deptavg)>0.11`
  ).get() as any).n;
  push("(k) 개인 MBO/KPI = 부서 집계 정합", mism2 === 0 && kpiOrgN === expectKpi,
    `N21≠부서평균 ${mism2}건, 부서KPI ORG ${kpiOrgN}/${expectKpi}`);

  // (l) 부서유형-업무 정합 (MBO 목표 ∈ 부서유형 mbo 풀)
  const typeMap = new Map<string, Set<string>>();
  for (const dt of DEPT_TYPES) typeMap.set(dt.code, new Set(dt.mbo));
  let typeBad = 0;
  for (const r of mboSample) {
    const goal = JSON.parse(r.attrs).goal as string;
    if (!typeMap.get(r.dt)?.has(goal)) typeBad++;
  }
  push("(l) 부서유형-업무 정합(MBO 표본)", typeBad === 0, typeBad === 0 ? "전부 소속 부서유형 과제풀에 속함" : `불일치 ${typeBad}건`);

  // ══════════════════ 동료평가 360° 검증 ══════════════════
  // (m) 익명성: rater_hash는 16진수 해시여야 하며 어떤 평가자 person_id와도 매칭되지 않아야 함
  const totalFb = (db.prepare(`SELECT COUNT(*) n FROM fact_feedback`).get() as any).n;
  const hashesOk = (db.prepare(`SELECT COUNT(*) n FROM fact_feedback WHERE rater_hash IS NULL OR rater_hash NOT GLOB '[0-9a-f]*'`).get() as any).n;
  // rater_hash 가 person_id(숫자)로 저장돼 유출되는 일이 없는지 (해시는 순수 16진수·길이 16)
  const leak = (db.prepare(`SELECT COUNT(*) n FROM fact_feedback WHERE rater_hash IN (SELECT CAST(person_id AS TEXT) FROM dim_person) OR LENGTH(rater_hash)<>16`).get() as any).n;
  push("(m) 동료평가 익명성(rater_hash 비식별)", totalFb > 0 && hashesOk === 0 && leak === 0,
    `총 ${totalFb}행, 비16진수 해시 ${hashesOk}건, 식별자 유출 ${leak}건`);

  // (n) 분포·응답률·관계유형 커버리지
  const fbAgg = db.prepare(`SELECT COUNT(DISTINCT subject_id) subj, SUM(responded) resp, COUNT(*) inv, AVG(CASE WHEN responded=1 THEN score_overall END) m, MIN(CASE WHEN responded=1 THEN score_overall END) lo, MAX(CASE WHEN responded=1 THEN score_overall END) hi FROM fact_feedback`).get() as any;
  const relN = (db.prepare(`SELECT COUNT(DISTINCT rel_type) n FROM fact_feedback WHERE responded=1`).get() as any).n;
  const respRate = fbAgg.resp / (fbAgg.inv || 1);
  const n40 = (db.prepare(`SELECT COUNT(*) n, ROUND(AVG(raw_value),2) m FROM fact_indicator_score WHERE indicator_id='N40' AND grain='PERSON'`).get() as any);
  const fbOk = fbAgg.subj >= 90 && respRate >= 0.75 && respRate <= 0.98 && fbAgg.m >= 3.0 && fbAgg.m <= 4.8 && relN === 4 && n40.n >= 90;
  push("(n) 동료평가 분포·응답률·N40 산출", fbOk,
    `대상 ${fbAgg.subj}명, 응답 ${fbAgg.resp}/${fbAgg.inv}(${(respRate * 100).toFixed(0)}%), 평균 ${fbAgg.m?.toFixed(2)}/5(범위 ${fbAgg.lo?.toFixed(1)}~${fbAgg.hi?.toFixed(1)}), 관계유형 ${relN}/4, N40 ${n40.n}명 평균 ${n40.m}`);

  // ══════════════════ 업무실적 캘린더(SELF_REPORT) 검증 ══════════════════
  const staffN = (db.prepare(`SELECT COUNT(*) n FROM dim_person WHERE person_type='STAFF'`).get() as any).n;
  // (o-1) 반기당 인원별 8~18건 (직원 규모 100 반영)
  const wlBounds = (db.prepare(
    `SELECT COUNT(*) bad FROM (
       SELECT person_id, period_id, COUNT(*) c FROM fact_activity WHERE activity_type='SELF_REPORT' GROUP BY person_id, period_id
     ) WHERE c < 8 OR c > 18`
  ).get() as any).bad;
  const wlTot = (db.prepare(`SELECT COUNT(*) n FROM fact_activity WHERE activity_type='SELF_REPORT'`).get() as any).n;
  const wlSubj = (db.prepare(`SELECT COUNT(DISTINCT person_id) n FROM fact_activity WHERE activity_type='SELF_REPORT'`).get() as any).n;
  // (o-2) 부서특화 업무 정합: deptSpecific=1 항목의 category ∈ 소속 부서유형 (mbo∪innov∪edu) 풀
  const dtPool = new Map<string, Set<string>>();
  for (const dt of DEPT_TYPES) dtPool.set(dt.code, new Set([...dt.mbo, ...dt.innov, ...dt.edu]));
  const wlSample = db.prepare(
    `SELECT o.dept_type dt, fa.attributes attrs FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE fa.activity_type='SELF_REPORT' ORDER BY fa.activity_id LIMIT 3000`
  ).all() as any[];
  let wlBad = 0, wlSpecific = 0;
  for (const r of wlSample) { const a = JSON.parse(r.attrs); if (a.deptSpecific) { wlSpecific++; if (!dtPool.get(r.dt)?.has(a.category)) wlBad++; } }
  const wlOk = staffN === 100 && wlBounds === 0 && wlSubj === staffN && wlBad === 0 && wlTot > 0;
  push("(o) 업무일지 분포·부서유형-업무 정합", wlOk,
    `직원 ${staffN}명, SELF_REPORT ${wlTot}행(대상 ${wlSubj}명), 반기당 8~18 위반 ${wlBounds}건, 부서특화 표본 ${wlSpecific}건 중 불일치 ${wlBad}건`);

  // (p) 업무책임자·수행자-부서 정합: owner·performers 모두 본인과 같은 부서 소속, 본인 포함
  const orgOf = new Map<number, number>();
  for (const r of db.prepare(`SELECT person_id id, org_id org FROM dim_person WHERE person_type='STAFF'`).all() as any[]) orgOf.set(r.id, r.org);
  const wlRows = db.prepare(
    `SELECT fa.person_id pid, p.org_id porg, o.dept_type dt, fa.attributes attrs
     FROM fact_activity fa JOIN dim_person p ON p.person_id=fa.person_id JOIN dim_org o ON o.org_id=p.org_id
     WHERE fa.activity_type='SELF_REPORT'`
  ).all() as any[];
  let ownerBad = 0, perfBad = 0, kpiChecked = 0, kpiBad = 0, kpiLinked = 0, ownerMgr = 0;
  const kpiSet = new Map<string, Set<string>>(), mboSet = new Map<string, Set<string>>();
  for (const dt of DEPT_TYPES) { kpiSet.set(dt.code, new Set(dt.kpis.map((k) => k.code))); mboSet.set(dt.code, new Set(dt.mbo)); }
  for (const r of wlRows) {
    const a = JSON.parse(r.attrs);
    // ④ 업무책임자: 같은 부서 소속
    if (orgOf.get(a.ownerId) !== r.porg) ownerBad++;
    if (a.ownerRole === "DEPT_HEAD" || a.ownerRole === "TEAM_LEAD") ownerMgr++;
    // ⑤ 업무수행자: 본인 포함 + 전원 같은 부서
    const perf: any[] = a.performers ?? [];
    if (!perf.some((x) => x.self && x.id === r.pid) || perf.some((x) => orgOf.get(x.id) !== r.porg)) perfBad++;
    // ⑥ 연결 KPI 정합
    if (a.kpi) {
      kpiLinked++; kpiChecked++;
      if (a.kpi.kind === "KPI") { if (!kpiSet.get(r.dt)?.has(a.kpi.code)) kpiBad++; }
      else if (a.kpi.kind === "MBO") { if (!mboSet.get(r.dt)?.has(a.kpi.mboGoal) || !kpiSet.get(r.dt)?.has(a.kpi.code)) kpiBad++; }
      else kpiBad++;
    }
  }
  push("(p) 업무책임자·수행자 부서 정합", ownerBad === 0 && perfBad === 0,
    `표본 ${wlRows.length}행 · 책임자 타부서 ${ownerBad}건(관리자배정 ${ownerMgr}) · 수행자(본인포함·동부서) 위반 ${perfBad}건`);
  push("(q) 연결 KPI·MBO 정합", kpiBad === 0 && kpiLinked > 0,
    `연결 ${kpiLinked}건(${((kpiLinked / wlTot) * 100).toFixed(0)}%) · 부서유형 풀 불일치 ${kpiBad}건`);

  db.close();

  const lines: string[] = [];
  lines.push("=".repeat(62));
  lines.push("국민대 성과관리통합시스템 — 데이터 정합성 검증 리포트 (v1.2)");
  lines.push(`생성: ${new Date().toISOString()}`);
  lines.push("=".repeat(62));
  let allPass = true;
  for (const c of checks) {
    if (!c.pass) allPass = false;
    lines.push(`[${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    if (c.detail) lines.push(`       ${c.detail}`);
  }
  lines.push("-".repeat(62));
  lines.push(allPass ? "결과: 전체 통과 ✅" : "결과: 실패 항목 있음 ❌");
  const out = lines.join("\n");
  fs.writeFileSync(REPORT, out + "\n");
  console.log(out);
  console.log(`\n[validate] 리포트 저장 → ${REPORT}`);
  process.exit(allPass ? 0 : 1);
}

main();
