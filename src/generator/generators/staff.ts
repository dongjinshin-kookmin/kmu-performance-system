/**
 * 직원(행정직) 반기 평가 생성 (02·07 문서).
 * 정기평가 5영역/기능직 200점 · 부서 서비스성과 · 가감점 · 조정계수 · MBO ·
 * 부서 KPI 캐스케이딩(BSC) · 강제배분 등급 · 반기 워크플로 · 드릴다운 상세.
 * 기존 스키마 흡수(04 §9): dim_cycle.half · fact_indicator_score ORG→PERSON · param_grade_policy(STAFF).
 */
import type BetterSqlite3 from "better-sqlite3";
import { Rng, sampleDist } from "../rng";
import { Params, coefVal } from "../loadParams";
import { deptTypeOf, PV } from "../staffData";
import { StaffRec, OrgRec } from "./types";

const YEARS = [2021, 2022, 2023, 2024, 2025];
const AREAS_G = ["WORK", "ATTITUDE", "JOB_COMP", "LEADERSHIP", "DEPT_SVC"];
const AREAS_F = ["COMMON_COMP", "JOB_BEHAV"];

export interface StaffReport {
  nStaff: number; nEval: number; nAct: number;
  gradeDist: Record<string, number>; // latest half
  avgComposite: number;
}

export function generateStaff(db: BetterSqlite3.Database, rng: Rng, staff: StaffRec[], adminDepts: OrgRec[], p: Params): StaffReport {
  // 이름 채우기
  for (const s of staff) {
    const nm = db.prepare(`SELECT name FROM dim_person WHERE person_id=?`).get(s.person_id) as any;
    s.name = nm.name;
  }

  // ── 반기 기간·사이클 ──
  const insPeriod = db.prepare(`INSERT INTO dim_period (period_id,year,half,semester,label) VALUES (?,?,?,?,?)`);
  const insCycle = db.prepare(
    `INSERT INTO dim_cycle (cycle_id,target_type,year,half,param_version_id,score_model,grade_mode,open_at,close_at,status) VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  const halves: number[] = [];
  for (const y of YEARS) for (const h of [1, 2]) {
    const id = y * 10 + h;
    halves.push(id);
    insPeriod.run(id, y, h, h, `${y}-${h}학기`);
    insCycle.run(id, "STAFF", y, h, PV, "TARGET", "REL_DIST", `${y}-${h === 1 ? "03" : "09"}-01`, `${y}-${h === 1 ? "08" : "12"}-31`, id === 20252 ? "OPEN" : "CLOSED");
  }
  const LATEST = 20252;

  // ── 조정계수(부서별 상수) ──
  const rAdj = rng.derive("adj");
  const adjByDept = new Map<number, number>();
  for (const d of adminDepts) adjByDept.set(d.org_id, +rAdj.float(0.95, 1.05).toFixed(3));

  const insScore = db.prepare(
    `INSERT INTO fact_indicator_score (indicator_id,person_id,org_id,period_id,param_version_id,raw_value,converted_score,grain) VALUES (?,?,?,?,?,?,?,?)`
  );
  const insAct = db.prepare(
    `INSERT INTO fact_activity (activity_id,person_id,indicator_id,period_id,activity_type,title,occurred_on,attributes,claim_status,evidence_url,source) VALUES (?,?,?,?,?,?,?,?,?,?, '인사·업무(가상)')`
  );
  const insEval = db.prepare(
    `INSERT INTO fact_evaluation
      (eval_id,cycle_id,person_id,track_code,composite_score,bonus_score,raw_total,score_scale,service_score,gain_points,penalty_points,adjustment_coef,mbo_rate,
       grade_abs,grade_rel,grade_final,status,current_step,calibrated_flag,chair_comment,committee_comment)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`
  );
  const insArea = db.prepare(
    `INSERT INTO fact_evaluation_area (eval_id,area,raw_score,benchmark,std_score,weight,weighted_score) VALUES (?,?,?,?,?,?,?)`
  );
  const insStep = db.prepare(`INSERT INTO eval_step_log (eval_id,step_no,from_status,to_status,actor_role,action,comment) VALUES (?,?,?,?,?,?,?)`);

  // ID 카운터 — 교수 파이프라인 이후 이어감
  let aid = (db.prepare(`SELECT COALESCE(MAX(activity_id),0) m FROM fact_activity`).get() as any).m + 1;
  let eid = (db.prepare(`SELECT COALESCE(MAX(eval_id),0) m FROM fact_evaluation`).get() as any).m + 1;

  // 부서 서비스성과(부서×반기) — 5단계 문항 접촉가중, 극단 5% 절사
  const rSvc = rng.derive("svc");
  const svcByDeptHalf = new Map<string, { score: number; items: number[] }>();
  for (const d of adminDepts) for (const half of halves) {
    // 타부서 평가 15표본, 문항 정규 × 접촉가중, 최상·최하 5% 절사
    const samples: number[] = [];
    for (let i = 0; i < 15; i++) {
      const w = rSvc.weighted([{ value: 3, w: 3 }, { value: 2, w: 4 }, { value: 1, w: 2 }, { value: 0, w: 1 }]);
      if (w === 0) continue;
      const item = sampleDist(rSvc, "normal_trunc", { mean: 4.0, sd: 0.5, lo: 1, hi: 5 });
      for (let j = 0; j < w; j++) samples.push(item);
    }
    samples.sort((a, b) => a - b);
    const cut = Math.floor(samples.length * 0.05);
    const trimmed = samples.slice(cut, samples.length - cut);
    const score = trimmed.length ? trimmed.reduce((s, x) => s + x, 0) / trimmed.length : 4.0;
    svcByDeptHalf.set(`${d.org_id}|${half}`, { score: +score.toFixed(2), items: [+samples[0].toFixed(1), +score.toFixed(1), +samples[samples.length - 1].toFixed(1)] });
  }

  // 부서 KPI(ORG) 달성률 (부서×반기×KPI) — 캐스케이딩 소스
  const rKpi = rng.derive("kpi");
  const deptKpiRate = new Map<string, number>(); // dept|half|Kcode -> rate
  for (const d of adminDepts) {
    const dt = deptTypeOf(d.deptType!);
    for (const half of halves) {
      for (const k of dt.kpis) {
        const rate = +sampleDist(rKpi, "normal_trunc", { mean: 88, sd: 10, lo: 55, hi: 130 }).toFixed(1);
        deptKpiRate.set(`${d.org_id}|${half}|${k.code}`, rate);
        insScore.run(k.code, null, d.org_id, half, PV, rate, rate, "ORG");
      }
    }
  }

  // ── 개인 반기 평가 ──
  const rGen = rng.derive("staffgen");
  const areaMax: Record<string, number> = {};
  for (const a of AREAS_G) areaMax[a] = coefVal(p, "staff_area_max", a, 15);
  const perHalfCands: Record<number, { id: number; composite: number }[]> = {};
  for (const h of halves) perHalfCands[h] = [];
  // 인물별 기본 역량(반기 무관 안정) + 반기 변동
  const baseQ = new Map<number, number>();
  for (const s of staff) baseQ.set(s.person_id, rGen.normalTrunc(0.86, 0.06, 0.62, 1.0));

  const evalRows: { eid: number; half: number; s: StaffRec; comp: number }[] = [];
  const rAct = rng.derive("staffact");

  for (const s of staff) {
    const adj = adjByDept.get(s.org_id)!;
    const tenureScore = tenureBand(s.tenure, p); // 60~100
    const w = { biz: coefVal(p, `staff_w_${s.gradeGroup}`, "biz", 60), comp: coefVal(p, `staff_w_${s.gradeGroup}`, "comp", 30), svc: coefVal(p, `staff_w_${s.gradeGroup}`, "svc", 10) };

    halves.forEach((half, hi) => {
      const trend = 1 + 0.012 * hi;
      const q = Math.min(1.02, baseQ.get(s.person_id)! * adj * trend + rGen.normal() * 0.03);
      const svc = svcByDeptHalf.get(`${s.org_id}|${half}`)!;
      const detailFull = half >= 20251; // 최근 2반기만 상세 활동 생성

      // MBO (제안): 3~5 목표
      const dt = deptTypeOf(s.deptType);
      const nGoals = rGen.int(3, 5);
      let mboSum = 0;
      const mboGoals: any[] = [];
      for (let g = 0; g < nGoals; g++) {
        const rate = +sampleDist(rGen, "normal_trunc", { mean: 90 * q / 0.86, sd: 12, lo: 40, hi: 150 }).toFixed(0);
        mboSum += rate;
        const kpi = rGen.pick(dt.kpis);
        mboGoals.push({ goal: dt.mbo[g % dt.mbo.length], bsc: kpi.bsc, target: "100%", achieved: `${rate}%`, rate, cascade_parent: kpi.code, cascade_name: kpi.name });
      }
      const mboRate = Math.round(mboSum / nGoals);

      let scale: number, rawTotal: number, areaRows: { area: string; raw: number; norm: number; max: number }[], compScore: number;
      if (s.familyTop === "GENERAL") {
        scale = 90;
        // 영역 점수: max × q × jitter
        const rows = AREAS_G.map((a) => {
          const mx = areaMax[a];
          let f = q;
          if (a === "LEADERSHIP" && !s.isManager) f = q * 0.55; // 비관리자 리더십↓
          if (a === "DEPT_SVC") f = svc.score / 5;
          const raw = Math.min(mx, +(mx * f * (0.95 + rGen.next() * 0.1)).toFixed(1));
          return { area: a, raw, norm: +(raw / mx * 100).toFixed(1), max: mx };
        });
        rawTotal = +rows.reduce((x, r) => x + r.raw, 0).toFixed(1);
        areaRows = rows;
        const WORK_n = rows[0].norm, ATT_n = rows[1].norm, JOB_n = rows[2].norm, LEAD_n = rows[3].norm, SVC_n = rows[4].norm;
        const MBO_n = Math.min(100, mboRate / 1.2);
        const biz = (WORK_n + MBO_n) / 2, cmp = (ATT_n + JOB_n + LEAD_n) / 3;
        compScore = biz * w.biz / 100 + cmp * w.comp / 100 + SVC_n * w.svc / 100;
      } else {
        scale = 200;
        const total = sampleDist(rGen, "normal_trunc", { mean: 165 * q / 0.86, sd: 12, lo: 120, hi: 200 });
        const c1 = +(100 * q * (0.95 + rGen.next() * 0.1)).toFixed(1), c2 = +(Math.min(200, total) - Math.min(100, 100 * q)).toFixed(1);
        areaRows = [{ area: "COMMON_COMP", raw: Math.min(100, c1), norm: +(Math.min(100, c1)).toFixed(1), max: 100 }, { area: "JOB_BEHAV", raw: Math.max(0, Math.min(100, c2)), norm: +Math.max(0, Math.min(100, c2)).toFixed(1), max: 100 }];
        rawTotal = +(areaRows[0].raw + areaRows[1].raw).toFixed(1);
        compScore = (areaRows[0].norm + areaRows[1].norm) / 2;
      }

      // 가·감점
      let gain = 0;
      const isProm = s.tenure >= 3;
      if (rGen.bool(0.15)) gain += +rGen.float(1, coefVal(p, "staff_gain", "dept_cap", 3)).toFixed(1); // 부서평가
      if (isProm && rGen.bool(0.1)) gain += +rGen.float(1, coefVal(p, "staff_gain", "personal_cap", 5)).toFixed(1); // 개인
      if (rGen.bool(0.08)) gain += coefVal(p, "staff_gain", "award", 2); // 포상
      gain = +gain.toFixed(1);
      let penalty = 0;
      const pr = rGen.next();
      if (pr > 0.985) penalty = coefVal(p, "staff_penalty", "정직", 2);
      else if (pr > 0.96) penalty = coefVal(p, "staff_penalty", "견책", 1);

      const composite = +Math.max(0, Math.min(108, compScore + gain - penalty)).toFixed(2);
      perHalfCands[half].push({ id: s.person_id, composite });
      const thisEid = eid++;
      evalRows.push({ eid: thisEid, half, s, comp: composite });

      // fact_evaluation (등급은 아래에서 UPDATE)
      insEval.run(thisEid, half, s.person_id, null, composite, gain, rawTotal, scale, svc.score, gain, penalty, adj, mboRate,
        null, null, null, half === LATEST ? staffStatus(rGen) : "FINALIZED", half === LATEST ? 0 : 9,
        s.familyTop === "GENERAL" ? "1·2차 평가 반영" : "기능직 역량평정", "조정계수·극단값 절사 적용");
      // areas
      for (const r of areaRows) insArea.run(thisEid, r.area, r.raw, r.max, r.norm, r.max, +(r.norm * (r.max / 90)).toFixed(1));

      // indicator scores (PERSON)
      if (s.familyTop === "GENERAL") {
        insScore.run("N01", s.person_id, s.org_id, half, PV, areaRows[0].raw, areaRows[0].raw, "PERSON");
        insScore.run("N02", s.person_id, s.org_id, half, PV, areaRows[1].raw, areaRows[1].raw, "PERSON");
        insScore.run("N03", s.person_id, s.org_id, half, PV, areaRows[2].raw, areaRows[2].raw, "PERSON");
        insScore.run("N04", s.person_id, s.org_id, half, PV, areaRows[3].raw, areaRows[3].raw, "PERSON");
        insScore.run("N05", s.person_id, s.org_id, half, PV, svc.score, areaRows[4].raw, "PERSON");
      } else {
        insScore.run("N06", s.person_id, s.org_id, half, PV, areaRows[0].raw, areaRows[0].raw, "PERSON");
        insScore.run("N07", s.person_id, s.org_id, half, PV, areaRows[1].raw, areaRows[1].raw, "PERSON");
      }
      insScore.run("N20", s.person_id, s.org_id, half, PV, mboRate, mboRate, "PERSON");
      const deptKpiAvg = +(dt.kpis.reduce((x, k) => x + deptKpiRate.get(`${s.org_id}|${half}|${k.code}`)!, 0) / dt.kpis.length).toFixed(1);
      insScore.run("N21", s.person_id, s.org_id, half, PV, deptKpiAvg, deptKpiAvg, "PERSON");
      insScore.run("N10", s.person_id, s.org_id, half, PV, tenureScore, +(tenureScore / 10).toFixed(1), "PERSON");

      // ── 드릴다운 상세 활동 (최근 2반기) ──
      if (detailFull) {
        // MBO 목표별 추진실적
        for (const mg of mboGoals) {
          insAct.run(aid++, s.person_id, "N20", half, "MBO", mg.goal, `${Math.floor(half / 10)}-0${half % 10 === 1 ? 6 : 12}-30`,
            JSON.stringify({ ...mg, actions: mboActions(rAct, dt, mg.goal), evidence: `${mg.goal} 추진결과 보고서` }), "CLAIMED", null);
        }
        // 교육 이수
        const nEdu = rAct.int(1, 2);
        for (let e = 0; e < nEdu; e++) {
          const course = rAct.pick(dt.edu);
          insAct.run(aid++, s.person_id, "N30", half, "EDU", course, null,
            JSON.stringify({ course, org: rAct.pick(["교육부", "한국대학교육협의회", "사내 인재개발원", "한국생산성본부"]), hours: rAct.int(8, 40) }), "CLAIMED", null);
        }
        // 혁신제안 (N27)
        if (rAct.bool(0.28)) insAct.run(aid++, s.person_id, "N27", half, "INNOV", rAct.pick(dt.innov), null,
          JSON.stringify({ status: rAct.bool(0.6) ? "채택" : "검토", effect: rAct.pick(["처리시간 20% 단축", "연 500만원 절감", "만족도 0.3점↑", "오류율 절반 감소"]) }), "CLAIMED", null);
        // 포상 (~8%)
        if (rAct.bool(0.08)) insAct.run(aid++, s.person_id, "N09", half, "AWARD", rAct.pick(dt.awards), null,
          JSON.stringify({ giver: rAct.pick(["총장", "행정처장", "교육부장관"]), points: 2 }), "CLAIMED", null);
        // 서비스평가 의견
        insAct.run(aid++, s.person_id, "N05", half, "SERVICE_FB", "타부서 서비스 평가 의견", null,
          JSON.stringify({ score: svc.score, items: svc.items, opinion: serviceOpinion(rAct, svc.score) }), "AUTO", null);
      }

      // 워크플로 로그 (최신 반기)
      if (half === LATEST) {
        insStep.run(thisEid, 1, null, "GOAL_SET", "직원", "SUBMIT", "반기 MBO 목표 설정");
        insStep.run(thisEid, 3, "COLLECTING", "SELF_CONFIRM", "직원", "SUBMIT", "자기평가서 제출");
        insStep.run(thisEid, 4, "SELF_CONFIRM", "CHAIR_REVIEW", "팀장", "APPROVE", "1차 평가 완료");
      }
    });
  }

  // ── 등급 강제배분 (반기별 전체 코호트, S20/A30/B30/C10/D10) ──
  const upd = db.prepare(`UPDATE fact_evaluation SET grade_abs=?, grade_rel=?, grade_final=? WHERE eval_id=?`);
  const gradeDist: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const abs = (c: number) => (c >= 90 ? "S" : c >= 80 ? "A" : c >= 70 ? "B" : c >= 60 ? "C" : "D");
  for (const half of halves) {
    const cohort = perHalfCands[half].slice().sort((a, b) => b.composite - a.composite);
    const n = cohort.length;
    const gradeById = new Map<number, string>();
    cohort.forEach((c, idx) => {
      const q = idx / n;
      const g = q < 0.2 ? "S" : q < 0.5 ? "A" : q < 0.8 ? "B" : q < 0.9 ? "C" : "D";
      gradeById.set(c.id, g);
    });
    for (const er of evalRows.filter((e) => e.half === half)) {
      const rel = gradeById.get(er.s.person_id)!;
      const a = abs(er.comp);
      const notFinal = half === LATEST; // 최신 일부 미확정
      upd.run(a, rel, notFinal ? null : rel, er.eid);
      if (half === LATEST) gradeDist[rel]++;
    }
  }

  const nAct = (db.prepare(`SELECT COUNT(*) n FROM fact_activity WHERE source='인사·업무(가상)'`).get() as any).n;
  const avgC = (db.prepare(`SELECT AVG(composite_score) m FROM fact_evaluation WHERE cycle_id=?`).get(LATEST) as any).m;
  return { nStaff: staff.length, nEval: evalRows.length, nAct, gradeDist, avgComposite: +avgC.toFixed(1) };
}

// ── helpers ──
function tenureBand(t: number, p: Params): number {
  const bands = [[3, 60], [6, 70], [10, 80], [15, 90], [99, 100]];
  for (const [lim, sc] of bands) if (t <= lim) return coefVal(p, "staff_tenure", String(lim), sc);
  return 100;
}
function staffStatus(rng: Rng): string {
  const r = rng.next();
  return r < 0.15 ? "COMMITTEE" : r < 0.32 ? "NOTIFIED" : "FINALIZED";
}
function mboActions(rng: Rng, dt: any, goal: string): string[] {
  const verbs = ["현황 분석", "실행계획 수립", "시범 운영", "전사 확산", "성과 점검"];
  return rng.sample(verbs, rng.int(2, 3)).map((v: string) => `${goal.slice(0, 12)} ${v}`);
}
function serviceOpinion(rng: Rng, score: number): string {
  if (score >= 4.3) return rng.pick(["협조가 신속하고 친절함", "정보 공유가 원활하고 책임감 있음", "요청 처리가 정확하고 빠름"]);
  if (score >= 3.7) return rng.pick(["대체로 협조적이나 응답이 다소 지연됨", "친절하나 정보공유 개선 여지 있음", "업무처리는 정확하나 소통 보완 필요"]);
  return rng.pick(["응답 지연이 잦아 개선 필요", "부서간 정보공유가 부족함", "협조 요청 처리가 느린 편"]);
}
