/**
 * 조직 트리 · 기간 · 사이클 · 인물(교수600/직원300) · 계정·역할 · Moving Target 기준값 생성 (v1.2).
 * 계열=신형 그룹(G_*) + 세분 field, 임용시기 버전 라우팅(V_LEGACY/V_2019/V_2024).
 */
import type BetterSqlite3 from "better-sqlite3";
import { Rng } from "../rng";
import { DEPARTMENTS } from "../content/departments";
import { DEPT_TYPES } from "../staffData";
import { koName } from "../content/lexicon";
import { PARAM_VERSION_ID } from "../seedData";
import { FacultyRec, OrgRec, StaffRec, YEARS } from "./types";

const RANK_SCALE: Record<string, number> = { 정교수: 1.2, 부교수: 1.0, 조교수: 0.8 };
// Moving Target 기준값 중앙값(전공 field별, 이공↑)
const MT_MEDIAN: Record<string, number> = { ENA: 650, ENB: 550, ENC: 450, 경상: 350, 인문: 280, 사회: 300, 체육: 260, 예능: 240 };

export interface CoreResult {
  faculty: FacultyRec[];
  depts: OrgRec[];
  staff: StaffRec[];
  adminDepts: OrgRec[];
}

export function generateCore(db: BetterSqlite3.Database, rng: Rng): CoreResult {
  // ── 기간 ──
  const insPeriod = db.prepare(`INSERT INTO dim_period (period_id,year,half,semester,label) VALUES (?,?,?,?,?)`);
  for (const y of YEARS) insPeriod.run(y, y, null, null, String(y));

  // ── 사이클 ──
  const insCycle = db.prepare(
    `INSERT INTO dim_cycle (cycle_id,target_type,year,half,param_version_id,score_model,grade_mode,open_at,close_at,status) VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  for (const y of YEARS)
    insCycle.run(y, "FACULTY", y, null, PARAM_VERSION_ID, "ABSOLUTE", "BOTH", `${y}-02-01`, `${y + 1}-03-31`, y === 2025 ? "OPEN" : "CLOSED");

  // ── 조직 트리 ──
  const insOrg = db.prepare(
    `INSERT INTO dim_org (org_id,org_code,name,org_kind,level,parent_id,series,series_group,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?,?,1)`
  );
  let oid = 1;
  const uniId = oid++;
  insOrg.run(uniId, "KMU", "국민대학교", "ACAD", "대학", null, null, null, 0);

  const collegeNames = [...new Set(DEPARTMENTS.map((d) => d.college))];
  const collegeId = new Map<string, number>();
  collegeNames.forEach((c, i) => {
    const id = oid++;
    collegeId.set(c, id);
    insOrg.run(id, `COL-${i + 1}`, c, "ACAD", "단과대", uniId, null, null, i + 1);
  });

  const depts: OrgRec[] = [];
  DEPARTMENTS.forEach((d, i) => {
    const id = oid++;
    insOrg.run(id, d.code, d.name, "ACAD", "학과", collegeId.get(d.college)!, d.field, d.group, i + 1);
    depts.push({ org_id: id, code: d.code, name: d.name, field: d.field, group: d.group, level: "학과", def: d });
  });

  // 행정 본부 + 부서 40 (부서유형 §2)
  const hqId = oid++;
  insOrg.run(hqId, "HQ", "대학본부", "ADMIN", "본부", uniId, null, null, 100);
  const insOrgT = db.prepare(
    `INSERT INTO dim_org (org_id,org_code,name,org_kind,level,parent_id,series,series_group,dept_type,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,1)`
  );
  const adminDepts: OrgRec[] = [];
  let ai = 0;
  for (const dt of DEPT_TYPES) {
    for (const name of dt.depts.slice(0, dt.count)) {
      const id = oid++;
      insOrgT.run(id, `ADM-${ai + 1}`, name, "ADMIN", "부서", hqId, null, null, dt.code, 200 + ai);
      adminDepts.push({ org_id: id, code: `ADM-${ai + 1}`, name, field: null, group: null, level: "부서", deptType: dt.code });
      ai++;
    }
  }

  // ── 교수 600명 ──
  const insPerson = db.prepare(
    `INSERT INTO dim_person (person_id,person_code,name,person_type,org_id,gender,appointed_year,appointed_version,birth_year,status)
     VALUES (?,?,?,?,?,?,?,?,?, 'ACTIVE')`
  );
  const insProf = db.prepare(
    `INSERT INTO prof_profile (person_id,rank,promoted_year,track_code,is_admin_post,admin_post_name,tenure) VALUES (?,?,?,?,?,?,?)`
  );
  const faculty: FacultyRec[] = [];
  let pid = 1;
  const N_FAC = 600;
  const perDept = Math.floor(N_FAC / depts.length);
  const remainder = N_FAC - perDept * depts.length;

  const r = rng.derive("person");

  depts.forEach((dept, di) => {
    const count = perDept + (di < remainder ? 1 : 0);
    for (let k = 0; k < count; k++) {
      // 임용시기 버전 라우팅 (40/45/15) → 임용연도·직급 결정
      const version = r.weighted([
        { value: "V_LEGACY", w: 40 }, { value: "V_2019", w: 45 }, { value: "V_2024", w: 15 },
      ]);
      let appointed: number, rank: string;
      if (version === "V_LEGACY") {
        appointed = r.int(1996, 2019);
        rank = r.weighted([{ value: "정교수", w: 60 }, { value: "부교수", w: 30 }, { value: "조교수", w: 10 }]);
      } else if (version === "V_2019") {
        appointed = r.int(2020, 2023);
        rank = r.weighted([{ value: "정교수", w: 20 }, { value: "부교수", w: 40 }, { value: "조교수", w: 40 }]);
      } else {
        appointed = r.int(2024, 2025);
        rank = r.weighted([{ value: "부교수", w: 30 }, { value: "조교수", w: 70 }]);
      }
      const track = r.weighted([
        { value: "TR", w: dept.def!.group.startsWith("G_EN") ? 34 : 26 },
        { value: "TB", w: 45 },
        { value: "TE", w: dept.def!.group.startsWith("G_EN") ? 15 : 24 },
        { value: "TI", w: dept.def!.group.startsWith("G_EN") ? 6 : 5 },
      ]);
      const birth = appointed - r.int(28, 38);
      let promoted = appointed;
      if (rank !== "조교수") promoted = Math.min(2025, appointed + r.int(2, 10));
      let adminPost = 0;
      if (rank !== "조교수" && r.bool(rank === "정교수" ? 0.22 : 0.08)) adminPost = 1;
      const tenure = rank === "정교수" ? 1 : rank === "부교수" && r.bool(0.5) ? 1 : 0;
      const name = koName(r);
      insPerson.run(pid, `F${appointed}-${String(pid).padStart(4, "0")}`, name, "FACULTY", dept.org_id,
        r.bool(0.35) ? "F" : "M", appointed, version, birth);
      insProf.run(pid, rank, promoted, track, adminPost, null, tenure);
      faculty.push({
        person_id: pid, org_id: dept.org_id, dept: dept.def!, group: dept.def!.group, field: dept.def!.field,
        name, rank, rankScale: RANK_SCALE[rank], track, appointed_year: appointed, appointed_version: version, is_admin_post: adminPost,
      });
      pid++;
    }
  });

  // ── Moving Target 기준값 (전공×V_2024) ──
  const insMt = db.prepare(
    `INSERT INTO dim_moving_target (major_id,appointed_version,target_value,param_version_id) VALUES (?,?,?,?)`
  );
  const rmt = rng.derive("mt");
  for (const dept of depts) {
    const median = MT_MEDIAN[dept.field ?? "인문"] ?? 300;
    insMt.run(dept.org_id, "V_2024", +rmt.lognormal(median, 0.3).toFixed(1), PARAM_VERSION_ID);
  }

  // ── 직원 300명 (07 §1 분포) ──
  const insStaff = db.prepare(
    `INSERT INTO staff_profile (person_id,job_grade,job_family,job_family_top,tenure_years,is_manager,mgr_role,eval_type) VALUES (?,?,?,?,?,?,?,?)`
  );
  const rs = rng.derive("staff");
  const staff: StaffRec[] = [];
  const N_STAFF = 100; // 사용자 지시(2026-07-10): 직원 규모 300→100, 부서 40→25 축소(§13)
  const staffPerDept = Math.floor(N_STAFF / adminDepts.length);
  const staffRem = N_STAFF - staffPerDept * adminDepts.length;
  const families = ["일반행정", "학사", "회계", "시설", "연구지원", "전산", "홍보", "국제"];
  const gradeGroupOf = (g: string): string => {
    if (g === "2급" || g === "3급") return "MANAGER";
    if (g === "4급" || g === "5급") return "MIDDLE";
    return "JUNIOR";
  };
  adminDepts.forEach((dep, di) => {
    const count = staffPerDept + (di < staffRem ? 1 : 0);
    // 기능직 비율: 시설·안전 부서유형 70%, 그 외 20%
    const funcP = dep.deptType === "FACILITY" ? 0.7 : 0.2;
    for (let k = 0; k < count; k++) {
      const isFunc = rs.bool(funcP);
      const familyTop = isFunc ? "FUNCTIONAL" : "GENERAL";
      const grade = isFunc
        ? rs.weighted([{ value: "6등급", w: 15 }, { value: "7등급", w: 35 }, { value: "8등급", w: 35 }, { value: "9등급", w: 15 }])
        : rs.weighted([{ value: "2급", w: 3 }, { value: "3급", w: 7 }, { value: "4급", w: 12 }, { value: "5급", w: 20 }, { value: "6급", w: 25 }, { value: "7급", w: 18 }, { value: "8급", w: 10 }, { value: "9급", w: 5 }]);
      const tenure = Math.max(1, Math.round(rs.lognormal(9, 0.6)));
      // 부서장: 부서 첫 인원 중 최고위 후보를 1명 지정(아래에서 보정), 팀장: 4~5급 일부
      let mgrRole: string | null = null;
      let isMgr = 0;
      if (k === 0 && !isFunc) { mgrRole = "DEPT_HEAD"; isMgr = 1; }
      else if ((grade === "4급" || grade === "5급") && rs.bool(0.3)) { mgrRole = "TEAM_LEAD"; isMgr = 1; }
      const gg = gradeGroupOf(grade);
      const evalType = gg === "MANAGER" || grade === "4급" ? "CONTRACT" : "PERF";
      insPerson.run(pid, `S-${String(pid).padStart(4, "0")}`, koName(rs), "STAFF", dep.org_id,
        rs.bool(0.5) ? "F" : "M", 2025 - tenure, null, null);
      insStaff.run(pid, grade, rs.pick(families), familyTop, tenure, isMgr, mgrRole, evalType);
      staff.push({ person_id: pid, org_id: dep.org_id, deptType: dep.deptType!, name: "", familyTop, grade, gradeGroup: gg, tenure, isManager: isMgr, mgrRole });
      pid++;
    }
  });

  // ── 계정·역할 ──
  generateUsers(db, rng.derive("users"), faculty, depts, staff, adminDepts);

  return { faculty, depts, staff, adminDepts };
}

function generateUsers(db: BetterSqlite3.Database, rng: Rng, faculty: FacultyRec[], depts: OrgRec[], staff: StaffRec[], adminDepts: OrgRec[]): void {
  const insUser = db.prepare(`INSERT INTO app_user (user_id,person_id,login_id,display_name,is_active) VALUES (?,?,?,?,1)`);
  const insUR = db.prepare(`INSERT INTO user_role (user_id,role_id,scope_org_id,assigned_period) VALUES (?,?,?,?)`);
  let uid = 1;
  const personUser = new Map<number, number>();
  for (const f of faculty) {
    const u = uid++;
    personUser.set(f.person_id, u);
    insUser.run(u, f.person_id, `fac${f.person_id}`, f.name);
    insUR.run(u, 1, null, "2025");
  }
  for (const d of depts) {
    const chair = faculty.find((f) => f.org_id === d.org_id && f.rank === "정교수");
    if (chair) insUR.run(personUser.get(chair.person_id)!, 2, d.org_id, "2025");
  }
  // 직원 계정 + STAFF(4)/부서장(5)/팀장(8) 역할
  for (const s of staff) {
    const u = uid++;
    personUser.set(s.person_id, u);
    insUser.run(u, s.person_id, `stf${s.person_id}`, s.name || `직원${s.person_id}`);
    insUR.run(u, 4, null, "2025");
    if (s.mgrRole === "DEPT_HEAD") insUR.run(u, 5, s.org_id, "2025");
    else if (s.mgrRole === "TEAM_LEAD") insUR.run(u, 8, s.org_id, "2025");
  }
  const hr = uid++;
  insUser.run(hr, null, "hr_team", "인사팀");
  insUR.run(hr, 6, null, "2025");
  const pres = uid++;
  insUser.run(pres, null, "president", "총장");
  insUR.run(pres, 7, null, "2025");
  for (const c of rng.sample(faculty.filter((f) => f.rank === "정교수"), 5))
    insUR.run(personUser.get(c.person_id)!, 3, null, "2025");
  void adminDepts;
}
