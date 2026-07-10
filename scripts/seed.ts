/**
 * 가상 데이터 생성 오케스트레이터.
 * 순서: 파라미터 → 조직/인물/계정 → 실적+상세+환산 → 집계/공시/캘리브레이션/평가.
 * 사용: npm run db:seed [-- --seed=kmu-perf-2026]
 */
import Database from "better-sqlite3";
import path from "node:path";
import { Rng } from "../src/generator/rng";
import { seedParams, PARAM_VERSION_ID } from "../src/generator/seedData";
import { seedStaffParams } from "../src/generator/staffData";
import { loadParams } from "../src/generator/loadParams";
import { generateCore } from "../src/generator/generators/core";
import { generateActivities } from "../src/generator/generators/activity";
import { generateEvaluation } from "../src/generator/generators/evaluation";
import { generateStaff } from "../src/generator/generators/staff";
import { generateFeedback } from "../src/generator/generators/feedback";
import { generateWorklog } from "../src/generator/generators/worklog";

const DB_PATH = path.join(process.cwd(), "data", "kmu.db");

function argSeed(): string {
  const a = process.argv.find((x) => x.startsWith("--seed="));
  return a ? a.split("=")[1] : "kmu-perf-2026";
}

function main() {
  const t0 = Date.now();
  const seed = argSeed();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const existing = db.prepare("SELECT COUNT(*) n FROM dim_person").get() as { n: number };
  if (existing.n > 0) {
    console.error("[seed] 이미 데이터가 있습니다. 먼저 npm run db:init 을 실행하세요.");
    process.exit(1);
  }

  const rng = new Rng(seed);
  console.log(`[seed] 시드='${seed}' 로 생성 시작`);

  db.exec("BEGIN");
  seedParams(db);
  seedStaffParams(db);
  const params = loadParams(db, PARAM_VERSION_ID);
  const { faculty, depts, staff, adminDepts } = generateCore(db, rng.derive("core"));
  console.log(`[seed] 조직·인물 완료 — 교수 ${faculty.length}명, 학과 ${depts.length}개, 직원 ${staff.length}명, 부서 ${adminDepts.length}개`);

  const pymap = generateActivities(db, rng.derive("activity"), faculty, params);
  const nAct = (db.prepare("SELECT COUNT(*) n FROM fact_activity").get() as { n: number }).n;
  console.log(`[seed] 교수 실적 완료 — fact_activity ${nAct}건`);

  const report = generateEvaluation(db, rng.derive("eval"), faculty, pymap, params, depts);

  const staffRep = generateStaff(db, rng.derive("staff"), staff, adminDepts, params);
  console.log(`[seed] 직원 완료 — 평가 ${staffRep.nEval}건, 활동 ${staffRep.nAct}건, 2025-2 평균 ${staffRep.avgComposite}, 등급`, staffRep.gradeDist);

  const fbRep = generateFeedback(db, rng.derive("feedback"), staff, params);
  console.log(`[seed] 동료평가 360° — ${fbRep.nRows}행(대상 ${fbRep.nSubjects}명), 응답 ${fbRep.responded}/${fbRep.invited}, 평균 ${fbRep.meanOverall}/5, 관계분포`, fbRep.relDist);

  const wlRep = generateWorklog(db, rng.derive("worklog"), staff);
  console.log(`[seed] 업무일지(SELF_REPORT) — ${wlRep.nRows}행(직원 ${wlRep.nStaff}명, 반기당 평균 ${wlRep.perHalfAvg}건, 부서특화 ${wlRep.deptSpecific})`);
  db.exec("COMMIT");

  const nScore = (db.prepare("SELECT COUNT(*) n FROM fact_indicator_score").get() as { n: number }).n;
  const nEval = (db.prepare("SELECT COUNT(*) n FROM fact_evaluation").get() as { n: number }).n;
  db.close();

  console.log(`[seed] 환산점수 ${nScore}건, 평가 ${nEval}건`);
  console.log(`[seed] 2025 종합점수 평균 = ${report.compositeMean} (목표 80~90)`);
  console.log(`[seed] 2025 등급 분포 =`, report.gradeDist);
  console.log(`[seed] Quality Gate(V_2024) 충족 ${report.gatePass}/${report.gateTotal}명, MT 달성률 평균 ${report.mtMean}%`);
  console.log(`[seed] 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
