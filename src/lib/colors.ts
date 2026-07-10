/** 차트용 컬러 상수 (globals.css 토큰과 동기화). recharts는 CSS var를 못 읽어 JS 상수 병행. */
export const AREA = {
  R: { light: "#3b82c4", dark: "#4a93d6", label: "연구", full: "연구(R)" },
  E: { light: "#2ea88a", dark: "#26997f", label: "교육", full: "교육(E)" },
  I: { light: "#d9922e", dark: "#b07d20", label: "산학", full: "산학(I)" },
  S: { light: "#9d7bf0", dark: "#9d7bf0", label: "봉사", full: "봉사(S)" },
} as const;
export type AreaKey = keyof typeof AREA;
export const AREA_ORDER: AreaKey[] = ["R", "E", "I", "S"];

export const GRADE = {
  S: { light: "#12a578", dark: "#2fb08a" },
  A: { light: "#3b82c4", dark: "#5b8def" },
  B: { light: "#7f8aa0", dark: "#8a93a6" },
  C: { light: "#d9922e", dark: "#d9a24a" },
  D: { light: "#d95757", dark: "#e0625f" },
} as const;
export const GRADE_ORDER = ["S", "A", "B", "C", "D"] as const;

// 직원 정기평가 영역 (색은 4영역 팔레트 재사용)
export const STAFF_AREA: Record<string, { label: string; light: string; dark: string }> = {
  WORK: { label: "근무실적", light: "#3b82c4", dark: "#4a93d6" },
  ATTITUDE: { label: "근무태도", light: "#2ea88a", dark: "#26997f" },
  JOB_COMP: { label: "직무역량", light: "#9d7bf0", dark: "#9d7bf0" },
  LEADERSHIP: { label: "리더십", light: "#d9922e", dark: "#b07d20" },
  DEPT_SVC: { label: "부서서비스", light: "#12a578", dark: "#2fb08a" },
  COMMON_COMP: { label: "공통역량", light: "#3b82c4", dark: "#4a93d6" },
  JOB_BEHAV: { label: "직무행동역량", light: "#9d7bf0", dark: "#9d7bf0" },
};
export const STAFF_AREA_G = ["WORK", "ATTITUDE", "JOB_COMP", "LEADERSHIP", "DEPT_SVC"];
export const STAFF_AREA_F = ["COMMON_COMP", "JOB_BEHAV"];

// BSC 4관점
export const BSC: Record<string, { label: string; light: string; dark: string }> = {
  F: { label: "재무", light: "#d9922e", dark: "#b07d20" },
  C: { label: "고객", light: "#3b82c4", dark: "#4a93d6" },
  P: { label: "프로세스", light: "#2ea88a", dark: "#26997f" },
  L: { label: "학습성장", light: "#9d7bf0", dark: "#9d7bf0" },
};

export const DEPT_TYPE_LABEL: Record<string, string> = {
  ACAD_AFF: "교무·학사", ADMISSION: "입학·홍보", RESEARCH_SUP: "연구지원", CAREER: "취업·경력",
  GENERAL_FIN: "총무·재정", FACILITY: "시설·안전", STUDENT_SUP: "학생지원", IT: "정보전산", INTL: "국제교류", PLANNING: "기획·평가",
};

export const GROUP_LABEL: Record<string, string> = {
  G_HSSP: "인문·사회·경상·체육",
  G_ENA: "공학·자연 A",
  G_ENB: "공학·자연 B",
  G_ENC: "공학·자연 C",
  G_ART: "예능",
};
