/**
 * ORG 집계 → 공시 스냅샷 → 영역기준상수 캘리브레이션(종합 평균 80~90 수렴)
 * → 종합점수·등급(제안) + Quality Gate·Moving Target(현행, V_2024) → 워크플로·이의·감사 (v1.2).
 */
import type BetterSqlite3 from "better-sqlite3";
import { Rng } from "../rng";
import { Params } from "../loadParams";
import { computeComposite, computeBonus, AREAS, Area } from "../engine/composite";
import { assignGrades, Cand } from "../engine/grade";
import { countBands, qualityGatePass, mtPass } from "../engine/gate";
import { PARAM_VERSION_ID } from "../seedData";
import { FacultyRec, YEARS, EVAL_YEAR, OrgRec } from "./types";
import { PYMap } from "./activity";

const TARGET = 85; // 캘리브레이션 목표 평균 (v1.2 §7-4: 80~90)

export interface EvalReport {
  compositeMean: number;
  gradeDist: Record<string, number>;
  gatePass: number;
  gateTotal: number;
  mtMean: number;
}

export function generateEvaluation(
  db: BetterSqlite3.Database, rng: Rng, faculty: FacultyRec[], pymap: PYMap, p: Params, depts: OrgRec[]
): EvalReport {
  // ── 1. ORG 집계 ──
  const orgRows = db.prepare(
    `SELECT indicator_id, org_id, period_id, SUM(raw_value) raw, SUM(converted_score) conv
     FROM fact_indicator_score WHERE grain='PERSON' GROUP BY indicator_id, org_id, period_id`
  ).all() as { indicator_id: string; org_id: number; period_id: number; raw: number; conv: number }[];
  const insOrgScore = db.prepare(
    `INSERT INTO fact_indicator_score (indicator_id,person_id,org_id,period_id,param_version_id,raw_value,converted_score,grain)
     VALUES (?,?,?,?,?,?,?, 'ORG')`
  );
  for (const r of orgRows) insOrgScore.run(r.indicator_id, null, r.org_id, r.period_id, PARAM_VERSION_ID, r.raw, r.conv);

  // ── 2. 공시 ──
  generateDisclosure(db, faculty.length);

  // ── 3. 영역기준상수 캘리브레이션 (field × area) ──
  const fields = [...new Set(faculty.map((f) => f.field))];
  const sumA: Record<string, Record<Area, number>> = {};
  const cntA: Record<string, number> = {};
  for (const s of fields) { sumA[s] = { R: 0, E: 0, I: 0, S: 0 }; cntA[s] = 0; }
  for (const f of faculty) {
    const py = pymap.get(f.person_id)!.get(EVAL_YEAR)!;
    for (const a of AREAS) sumA[f.field][a] += py[a];
    cntA[f.field]++;
  }
  const bench: Record<string, Record<Area, number>> = {};
  for (const s of fields) {
    bench[s] = { R: 0, E: 0, I: 0, S: 0 };
    for (const a of AREAS) bench[s][a] = Math.max(1, sumA[s][a] / cntA[s] / (TARGET / 100));
  }
  const meanOf = (bm: Record<string, Record<Area, number>>): number => {
    let tot = 0;
    for (const f of faculty) {
      const py = pymap.get(f.person_id)!.get(EVAL_YEAR)!;
      const w = p.track.get(f.track)!;
      tot += computeComposite({ R: py.R, E: py.E, I: py.I, S: py.S }, bm[f.field],
        { R: w.w_R, E: w.w_E, I: w.w_I, S: w.w_S }).composite;
    }
    return tot / faculty.length;
  };
  const scale = meanOf(bench) / TARGET;
  for (const s of fields) for (const a of AREAS) bench[s][a] *= scale;

  const insBench = db.prepare(
    `INSERT INTO param_benchmark (param_version_id,track_code,series,area,benchmark_score,cap,floor) VALUES (?,?,?,?,?,200,0)`
  );
  for (const track of ["TR", "TB", "TE", "TI"])
    for (const s of fields) for (const a of AREAS)
      insBench.run(PARAM_VERSION_ID, track, s, a, +bench[s][a].toFixed(2));

  // ── 4. Quality Gate / Moving Target (V_2024 신임) ──
  const paperStmt = db.prepare(
    `SELECT ap.if_band, ap.author_role FROM act_paper ap JOIN fact_activity fa ON fa.activity_id=ap.activity_id WHERE fa.person_id=?`
  );
  const mtByDept = new Map<number, number>();
  for (const r of db.prepare(`SELECT major_id, target_value FROM dim_moving_target WHERE appointed_version='V_2024'`).all() as { major_id: number; target_value: number }[])
    mtByDept.set(r.major_id, r.target_value);
  const rGate = rng.derive("gate");
  const gateInfo = new Map<number, { pass: number; basis: string | null; rate: number }>();
  let gatePassN = 0, gateTotal = 0, mtSum = 0;
  for (const f of faculty) {
    if (f.appointed_version !== "V_2024") continue;
    gateTotal++;
    const papers = paperStmt.all(f.person_id) as { if_band: string; author_role: string }[];
    const counts = countBands(papers);
    const ifOk = qualityGatePass(f.field, counts, p);
    // Moving Target 성취값 배수 (평균 1.3, 일부 ≥1.5)
    const mult = 0.7 + rGate.beta(2, 2) * 1.2;
    const rate = +(mult * 100).toFixed(1);
    mtSum += rate;
    const mtOk = mtPass(rate, p);
    const pass = ifOk || mtOk ? 1 : 0;
    if (pass) gatePassN++;
    gateInfo.set(f.person_id, { pass, basis: ifOk ? "IF" : mtOk ? "MT" : null, rate });
  }

  // ── 5. 사이클별 평가 ──
  const insEval = db.prepare(
    `INSERT INTO fact_evaluation
      (eval_id,cycle_id,person_id,track_code,composite_score,bonus_score,research_total,achievement_total,
       grade_abs,grade_rel,grade_final,quality_gate_pass,quality_gate_basis,moving_target_rate,status,current_step,calibrated_flag,chair_comment,committee_comment)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insArea = db.prepare(
    `INSERT INTO fact_evaluation_area (eval_id,area,raw_score,benchmark,std_score,weight,weighted_score) VALUES (?,?,?,?,?,?,?)`
  );
  const insStep = db.prepare(`INSERT INTO eval_step_log (eval_id,step_no,from_status,to_status,actor_role,action,comment) VALUES (?,?,?,?,?,?,?)`);
  const insAppeal = db.prepare(`INSERT INTO fact_appeal (eval_id,reason,filed_at,status,resolution,resolved_at) VALUES (?,?,?,?,?,?)`);
  const insAudit = db.prepare(`INSERT INTO audit_log (user_id,action,target_table,target_id,detail,ip) VALUES (?,?,?,?,?,?)`);

  let evalId = 1;
  const gradeDist: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  let evalYearSum = 0;
  const rW = rng.derive("workflow");
  const groupOf = new Map(faculty.map((f) => [f.person_id, f.group]));
  const groups = [...new Set(faculty.map((f) => f.group))];

  for (const year of YEARS) {
    const cands: (Cand & { f: FacultyRec; comp: number; bonus: number; areas: ReturnType<typeof computeComposite>["areas"]; py: { R: number; E: number; I: number; S: number } })[] = [];
    for (const f of faculty) {
      const py = pymap.get(f.person_id)!.get(year)!;
      const w = p.track.get(f.track)!;
      const { areas, composite } = computeComposite({ R: py.R, E: py.E, I: py.I, S: py.S }, bench[f.field], { R: w.w_R, E: w.w_E, I: w.w_I, S: w.w_S });
      const bonus = computeBonus({ fwci: py.fwci, intlRatio: py.intl, oaRatio: py.oa, e06Count: py.e06, startupCount: py.startup }, p);
      cands.push({ id: f.person_id, score: composite + bonus.total, f, comp: composite, bonus: bonus.total, areas, py: { R: py.R, E: py.E, I: py.I, S: py.S } });
    }

    // 등급: 계열그룹 코호트
    const gradeMap = new Map<number, { abs: string; rel: string }>();
    for (const g of groups) {
      const cohort: Cand[] = cands.filter((c) => groupOf.get(c.id) === g).map((c) => ({ id: c.id, score: c.score }));
      assignGrades(cohort, p.absCut, p.relDist).forEach((v, k) => gradeMap.set(k, v));
    }

    for (const c of cands) {
      const g = gradeMap.get(c.id)!;
      let status = "FINALIZED", step = 7, gradeFinal: string | null = g.rel;
      if (year === EVAL_YEAR) {
        const roll = rW.next();
        if (roll < 0.15) { status = "COMMITTEE"; step = 5; gradeFinal = null; }
        else if (roll < 0.3) { status = "NOTIFIED"; step = 6; }
      }
      const gi = gateInfo.get(c.id);
      const research = +c.py.R.toFixed(1);
      const achievement = +(c.py.R + c.py.E + c.py.I + c.py.S).toFixed(1);
      insEval.run(evalId, year, c.id, c.f.track, +c.comp.toFixed(2), +c.bonus.toFixed(2), research, achievement,
        g.abs, g.rel, gradeFinal, gi ? gi.pass : null, gi ? gi.basis : null, gi ? gi.rate : null,
        status, step, 1, status === "FINALIZED" ? "실적 사실확인 완료" : null,
        status === "COMMITTEE" ? "평가위 심의 중" : "정성평가 반영");
      for (const ar of c.areas)
        insArea.run(evalId, ar.area, +ar.raw.toFixed(2), +ar.benchmark.toFixed(2), +ar.std.toFixed(2), ar.weight, +ar.weighted.toFixed(2));

      if (year === EVAL_YEAR) {
        insStep.run(evalId, 1, null, "GOAL_SET", "교수", "SUBMIT", "트랙 선택");
        insStep.run(evalId, 4, "SELF_CONFIRM", "CHAIR_REVIEW", "학과장", "APPROVE", "실적 확인");
        insStep.run(evalId, 5, "CHAIR_REVIEW", status, "평가위원", "APPROVE", "정량 확정");
        insAudit.run(null, "STATUS_CHANGE", "fact_evaluation", String(evalId), JSON.stringify({ to: status }), "10.0.0.1");
        if (status === "NOTIFIED" && rW.bool(0.08))
          insAppeal.run(evalId, "가점 산정 이의", `${year + 1}-02-20`, rW.bool(0.5) ? "ACCEPTED" : "REJECTED", rW.bool(0.5) ? "가점 +0.5 반영" : "원심 유지", `${year + 1}-02-27`);
        evalYearSum += c.score;
        gradeDist[g.rel] = (gradeDist[g.rel] ?? 0) + 1;
      }
      evalId++;
    }
  }

  void depts;
  return {
    compositeMean: +(evalYearSum / faculty.length).toFixed(2),
    gradeDist, gatePass: gatePassN, gateTotal, mtMean: gateTotal ? +(mtSum / gateTotal).toFixed(1) : 0,
  };
}

function generateDisclosure(db: BetterSqlite3.Database, ftCount: number): void {
  const ins = db.prepare(
    `INSERT INTO ext_disclosure (year,metric_code,metric_name,org_scope,our_value,peer_avg,unit,snapshot_at) VALUES (?,?,?,?,?,?,?,?)`
  );
  for (const year of YEARS) {
    const sci = (db.prepare(`SELECT COUNT(*) n FROM act_paper ap JOIN fact_activity fa ON fa.activity_id=ap.activity_id WHERE ap.grade IN ('SCI','SSCI_AHCI') AND fa.period_id=?`).get(year) as { n: number }).n;
    const kci = (db.prepare(`SELECT COUNT(*) n FROM act_paper ap JOIN fact_activity fa ON fa.activity_id=ap.activity_id WHERE ap.grade IN ('KCI','KCI_CAND') AND fa.period_id=?`).get(year) as { n: number }).n;
    const fund = (db.prepare(`SELECT COALESCE(SUM(amount_won),0) s FROM act_grant ag JOIN fact_activity fa ON fa.activity_id=ag.activity_id WHERE fa.period_id=?`).get(year) as { s: number }).s;
    const patents = (db.prepare(`SELECT COUNT(*) n FROM act_ip ai JOIN fact_activity fa ON fa.activity_id=ai.activity_id WHERE ai.ip_kind LIKE '%_REG' AND fa.period_id=?`).get(year) as { n: number }).n;
    const ts = new Date().toISOString();
    const sciPerFt = +(sci / ftCount).toFixed(3), kciPerFt = +(kci / ftCount).toFixed(3);
    ins.run(year, "RES_PAPER_SCI_PER_FT", "전임교원 1인당 SCI급 논문", "대학전체", sciPerFt, +(sciPerFt * 0.9).toFixed(3), "건", ts);
    ins.run(year, "RES_PAPER_KCI_PER_FT", "전임교원 1인당 KCI 논문", "대학전체", kciPerFt, +(kciPerFt * 0.95).toFixed(3), "건", ts);
    ins.run(year, "RES_FUND_PER_FT", "전임교원 1인당 연구비", "대학전체", Math.round(fund / ftCount), Math.round(fund / ftCount * 0.85), "원", ts);
    ins.run(year, "RES_FUND_TOTAL", "연구비 총 수혜실적", "대학전체", fund, Math.round(fund * 0.85), "원", ts);
    ins.run(year, "IP_PATENT_CNT", "특허 등록 건수", "대학전체", patents, Math.round(patents * 0.8), "건", ts);
    ins.run(year, "EMPLOY_RATE", "졸업생 취업률", "대학전체", +(72 + (year - 2021) * 0.5).toFixed(1), 70.0, "%", ts);
  }
}
