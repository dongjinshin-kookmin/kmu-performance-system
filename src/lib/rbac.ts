import { cookies } from "next/headers";

export type RoleCode = "FACULTY" | "DEPT_CHAIR" | "EVAL_COMMITTEE" | "HR_TEAM" | "PRESIDENT" | "STAFF" | "TEAM_LEAD" | "DEPT_HEAD";

export interface RoleDef {
  code: RoleCode;
  name: string;
  scope: "SELF" | "DEPT" | "ASSIGNED" | "ORG_ALL";
  desc: string;
  /** 개인 원점수(raw)·실명 열람 가능 여부 */
  seeIndividualRaw: boolean;
  landing: (viewer: number | null) => string;
  needsViewer: boolean; // 특정 인물/학과 선택 필요
}

export const ROLES: Record<RoleCode, RoleDef> = {
  FACULTY: {
    code: "FACULTY", name: "교수 (본인)", scope: "SELF",
    desc: "본인 성과카드·워크플로만 열람", seeIndividualRaw: true, needsViewer: true,
    landing: (v) => (v ? `/faculty/${v}` : "/dashboard"),
  },
  DEPT_CHAIR: {
    code: "DEPT_CHAIR", name: "학과장", scope: "DEPT",
    desc: "소속 학과 교원·비교뷰 열람", seeIndividualRaw: true, needsViewer: true,
    landing: () => "/departments",
  },
  EVAL_COMMITTEE: {
    code: "EVAL_COMMITTEE", name: "평가위원", scope: "ASSIGNED",
    desc: "배정된 평가 건 심의(정량 확정·정성)", seeIndividualRaw: true, needsViewer: false,
    landing: () => "/workflow",
  },
  HR_TEAM: {
    code: "HR_TEAM", name: "인사팀", scope: "ORG_ALL",
    desc: "전사 개인·집계·캘리브레이션", seeIndividualRaw: true, needsViewer: false,
    landing: () => "/dashboard",
  },
  PRESIDENT: {
    code: "PRESIDENT", name: "총장 / 기획처", scope: "ORG_ALL",
    desc: "집계·백분위만 (개인 raw 비노출, n<5 마스킹)", seeIndividualRaw: false, needsViewer: false,
    landing: () => "/dashboard",
  },
  STAFF: {
    code: "STAFF", name: "직원 (본인)", scope: "SELF",
    desc: "본인 반기 성과카드만 열람", seeIndividualRaw: true, needsViewer: true,
    landing: (v) => (v ? `/staff/${v}` : "/units"),
  },
  TEAM_LEAD: {
    code: "TEAM_LEAD", name: "팀장", scope: "DEPT",
    desc: "소속 부서 직원·부서 KPI 열람", seeIndividualRaw: true, needsViewer: true,
    landing: () => "/units",
  },
  DEPT_HEAD: {
    code: "DEPT_HEAD", name: "부서장", scope: "DEPT",
    desc: "소속 부서 성과·KPI 캐스케이딩", seeIndividualRaw: true, needsViewer: true,
    landing: () => "/units",
  },
};

export interface Session {
  role: RoleCode;
  viewer: number | null; // FACULTY/DEPT_CHAIR/EVAL_COMMITTEE 대표 인물 person_id
}

export const DEFAULT_SESSION: Session = { role: "HR_TEAM", viewer: null };

export async function getSession(): Promise<Session> {
  const c = (await cookies()).get("rbac")?.value;
  if (!c) return DEFAULT_SESSION;
  try {
    const s = JSON.parse(c) as Session;
    if (ROLES[s.role]) return { role: s.role, viewer: s.viewer ?? null };
  } catch { /* ignore */ }
  return DEFAULT_SESSION;
}

export const MASK_MIN = 5; // n<5 마스킹 기준
