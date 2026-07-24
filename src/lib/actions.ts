"use server";
/**
 * 직원 성과관리 MVP 쓰기 경로 (Server Actions).
 *  ① createWorklog  — 직원 본인이 반기 수행 업무(자기작성 업무일지)를 INSERT.
 *                     attributes JSON 계약은 generator/generators/worklog.ts 와 동일하게 맞춰
 *                     staffWorklog(queries.ts) ↔ WorkCalendar 가 그대로 렌더한다.
 *  ② saveEvaluation — 같은 부서 평가자(팀장/부서장)·인사팀이 5영역 raw_score UPSERT +
 *                     코멘트·상태 전이 + eval_step_log 감사추적.
 * 모든 쓰기는 getDb().transaction(fn)() 로 원자적으로 처리한다(better-sqlite3 동기).
 */
import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { getSession } from "./rbac";
import { canViewStaff } from "./queries";

// 정기평가 5영역(일반·기술직 90점 체계) — staff.ts:AREAS_G 와 동일 순서.
const AREAS = ["WORK", "ATTITUDE", "JOB_COMP", "LEADERSHIP", "DEPT_SVC"] as const;
// worklog.ts:ROLE_LABEL 과 동일.
const ROLE_LABEL: Record<string, string> = { DEPT_HEAD: "부서장", TEAM_LEAD: "팀장", SENIOR: "선임(직무대리)" };
// 상태 전이 → current_step (seed 관례: FINALIZED=9). 프로토타입 3단계 예시.
const STATUS_STEP: Record<string, number> = { COMMITTEE: 5, NOTIFIED: 7, FINALIZED: 9 };
const PV = 2; // param_version_id (staffData.PV)

// ─────────────────────────── ① 업무기록 작성 ───────────────────────────
interface WorklogInput {
  title: string;
  category: string;
  deptSpecific: boolean;
  start: string;            // yyyy-mm-dd
  end: string;              // yyyy-mm-dd (>= start)
  summary: string;
  evidenceType: string;
  evidenceDoc: string;
  kpiCode: string | null;   // 부서 KPI 코드(K_*) 또는 null
  mboGoal: string | null;   // 직접 입력한 MBO 목표(선택)
  collaboratorIds: number[];// 같은 부서 협업자 person_id
}

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

export async function createWorklog(personId: number, half: number, form: WorklogInput) {
  const s = await getSession();
  // 권한: 본인(STAFF)만.
  if (s.role !== "STAFF" || s.viewer !== personId) throw new Error("본인만 업무기록을 작성할 수 있습니다.");

  const db = getDb();
  const title = (form.title ?? "").trim();
  const start = form.start;
  if (!title || !start || Number.isNaN(dayMs(start))) throw new Error("제목과 시작일은 필수입니다.");
  const end = form.end && dayMs(form.end) >= dayMs(start) ? form.end : start;
  const month = Number(start.slice(5, 7));
  const durationDays = Math.max(1, Math.round((dayMs(end) - dayMs(start)) / 86400000) + 1);

  // 대상 직원 부서.
  const org = db.prepare(`SELECT org_id FROM dim_person WHERE person_id=?`).get(personId) as any;
  if (!org) throw new Error("직원을 찾을 수 없습니다.");
  const orgId = org.org_id as number;

  // 본인 정보.
  const selfRow = db.prepare(
    `SELECT p.name, sp.mgr_role role FROM dim_person p JOIN staff_profile sp ON sp.person_id=p.person_id WHERE p.person_id=?`
  ).get(personId) as any;
  const selfName = selfRow?.name ?? "본인";

  // 업무책임자: 같은 부서 부서장 > 팀장, 없으면 본인.
  const mgr = db.prepare(
    `SELECT p.person_id id, p.name, sp.mgr_role role
     FROM staff_profile sp JOIN dim_person p ON p.person_id=sp.person_id
     WHERE p.org_id=? AND sp.mgr_role IN ('DEPT_HEAD','TEAM_LEAD') AND p.person_id<>?
     ORDER BY CASE sp.mgr_role WHEN 'DEPT_HEAD' THEN 0 ELSE 1 END, p.person_id LIMIT 1`
  ).get(orgId, personId) as any;
  const owner = mgr
    ? { id: mgr.id as number, name: mgr.name as string, role: (mgr.role as string) ?? "SENIOR" }
    : { id: personId, name: selfName, role: (selfRow?.role as string) ?? "SENIOR" };

  // 업무수행자: 본인(self) + 같은 부서 협업자.
  const performers: { id: number; name: string; self: boolean }[] = [{ id: personId, name: selfName, self: true }];
  for (const cid of form.collaboratorIds ?? []) {
    if (cid === personId) continue;
    const c = db.prepare(`SELECT person_id id, name FROM dim_person WHERE person_id=? AND org_id=?`).get(cid, orgId) as any;
    if (c) performers.push({ id: c.id as number, name: c.name as string, self: false });
  }

  // 증빙 1건(유형 + 문서명).
  const evType = (form.evidenceType ?? "").trim();
  const evDoc = (form.evidenceDoc ?? "").trim();
  const evidences = evType || evDoc ? [{ type: evType || "증빙", doc: evDoc || title }] : [];

  // 연결 KPI(부서 KPI) 또는 직접 입력 MBO.
  let kpi: { kind: string; mboGoal: string | null; code: string | null; name: string | null } | null = null;
  const mboText = (form.mboGoal ?? "").trim();
  if (form.kpiCode) {
    const k = db.prepare(`SELECT name FROM dim_indicator WHERE indicator_id=? AND area='KPI'`).get(form.kpiCode) as any;
    if (k) kpi = mboText
      ? { kind: "MBO", mboGoal: mboText, code: form.kpiCode, name: k.name as string }
      : { kind: "KPI", mboGoal: null, code: form.kpiCode, name: k.name as string };
  } else if (mboText) {
    kpi = { kind: "MBO", mboGoal: mboText, code: null, name: null };
  }

  const category = (form.category ?? "").trim() || title;
  // worklog.ts:145-152 계약과 동일 스키마.
  const attrs = {
    date: start, month, summary: (form.summary ?? "").trim(), category, deptSpecific: !!form.deptSpecific,
    start, end, durationDays,
    evidences,
    ownerId: owner.id, ownerName: owner.name, ownerRole: owner.role, ownerRoleLabel: ROLE_LABEL[owner.role] ?? "책임자",
    performers,
    kpi,
  };

  db.transaction(() => {
    const aid = ((db.prepare(`SELECT COALESCE(MAX(activity_id),0) m FROM fact_activity`).get() as any).m as number) + 1;
    db.prepare(
      `INSERT INTO fact_activity (activity_id,person_id,indicator_id,period_id,activity_type,title,occurred_on,attributes,claim_status,evidence_url,source)
       VALUES (?,?,?,?, 'SELF_REPORT', ?, ?, ?, 'CLAIMED', NULL, '자기작성 업무일지')`
    ).run(aid, personId, "N01", half, title, start, JSON.stringify(attrs));
  })();

  revalidatePath(`/staff/${personId}`);
  return { ok: true as const };
}

// ─────────────────────────── ② 평가 입력·저장 ───────────────────────────
interface EvalPayload {
  personId: number;
  areas: Record<string, number>; // { WORK:.., ATTITUDE:.., JOB_COMP:.., LEADERSHIP:.., DEPT_SVC:.. }
  comment: string;
  status: string;                // COMMITTEE | NOTIFIED | FINALIZED
}

export async function saveEvaluation(evalId: number, payload: EvalPayload) {
  const s = await getSession();
  // 권한: 팀장/부서장/인사팀 + 대상 열람권한(canViewStaff) 재확인.
  if (s.role !== "TEAM_LEAD" && s.role !== "DEPT_HEAD" && s.role !== "HR_TEAM")
    throw new Error("평가 입력 권한이 없습니다.");
  const perm = canViewStaff(s, payload.personId);
  if (!perm.ok) throw new Error(perm.reason ?? "해당 직원을 평가할 권한이 없습니다.");

  const db = getDb();
  const status = STATUS_STEP[payload.status] != null ? payload.status : "COMMITTEE";
  const step = STATUS_STEP[status] ?? 5;
  const comment = (payload.comment ?? "").trim();

  const evRow = db.prepare(`SELECT status FROM fact_evaluation WHERE eval_id=?`).get(evalId) as any;
  if (!evRow) throw new Error("평가 건을 찾을 수 없습니다.");
  const fromStatus = evRow.status as string;

  const actorRole = s.role === "DEPT_HEAD" ? "부서장" : s.role === "TEAM_LEAD" ? "팀장" : "인사팀";
  const action = status === "FINALIZED" ? "FINALIZE" : status === "NOTIFIED" ? "NOTIFY" : "REVIEW";

  const areaMaxOf = (area: string): number => {
    const r = db.prepare(
      `SELECT coef_value v FROM param_coefficient WHERE coef_group='staff_area_max' AND coef_key=? AND param_version_id=?`
    ).get(area, PV) as any;
    return (r?.v as number) ?? 15;
  };

  db.transaction(() => {
    for (const area of AREAS) {
      const raw0 = Number(payload.areas?.[area]);
      if (!Number.isFinite(raw0)) continue;
      const existing = db.prepare(`SELECT benchmark, weight FROM fact_evaluation_area WHERE eval_id=? AND area=?`).get(evalId, area) as any;
      // benchmark·weight 재사용(=영역 만점). std_score·weighted_score 는 staff.ts:150,189 와 동일 방식 재계산.
      const benchmark = (existing?.benchmark as number) ?? areaMaxOf(area);
      const weight = (existing?.weight as number) ?? benchmark;
      const raw = Math.max(0, Math.min(benchmark, +raw0.toFixed(1)));
      const std = +((raw / benchmark) * 100).toFixed(1);
      const weighted = +(std * (weight / 90)).toFixed(1);
      if (existing) {
        db.prepare(`UPDATE fact_evaluation_area SET raw_score=?, std_score=?, weighted_score=? WHERE eval_id=? AND area=?`)
          .run(raw, std, weighted, evalId, area);
      } else {
        db.prepare(`INSERT INTO fact_evaluation_area (eval_id,area,raw_score,benchmark,std_score,weight,weighted_score) VALUES (?,?,?,?,?,?,?)`)
          .run(evalId, area, raw, benchmark, std, weight, weighted);
      }
    }
    db.prepare(`UPDATE fact_evaluation SET chair_comment=?, status=?, current_step=? WHERE eval_id=?`).run(comment, status, step, evalId);
    const nextStep = ((db.prepare(`SELECT COALESCE(MAX(step_no),0)+1 n FROM eval_step_log WHERE eval_id=?`).get(evalId) as any).n as number);
    db.prepare(`INSERT INTO eval_step_log (eval_id,step_no,from_status,to_status,actor_role,action,comment) VALUES (?,?,?,?,?,?,?)`)
      .run(evalId, nextStep, fromStatus, status, actorRole, action, comment || `${actorRole} 평가 입력`);
  })();

  revalidatePath(`/staff/${payload.personId}`);
  return { ok: true as const };
}
