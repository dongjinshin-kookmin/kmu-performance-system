import type { DeptDef, Group, Field } from "../content/departments";

export interface OrgRec {
  org_id: number;
  code: string;
  name: string;
  field: Field | null;
  group: Group | null;
  level: string;
  deptType?: string; // 행정부서 유형(ACAD_AFF 등)
  def?: DeptDef; // 학과일 때 주제 풀
}

export interface StaffRec {
  person_id: number;
  org_id: number;
  deptType: string;
  name: string;
  familyTop: string; // GENERAL / FUNCTIONAL
  grade: string;     // 5급 / 8등급 등
  gradeGroup: string; // JUNIOR / MIDDLE / MANAGER
  tenure: number;
  isManager: number;
  mgrRole: string | null; // DEPT_HEAD / TEAM_LEAD / null
}

export interface FacultyRec {
  person_id: number;
  org_id: number;
  dept: DeptDef;
  group: Group;
  field: Field;
  name: string;
  rank: string; // 정교수/부교수/조교수
  rankScale: number; // 실적 승수
  track: string; // TR/TB/TE/TI
  appointed_year: number;
  appointed_version: string; // V_LEGACY/V_2019/V_2024
  is_admin_post: number;
}

export const YEARS = [2021, 2022, 2023, 2024, 2025];
export const EVAL_YEAR = 2025;
