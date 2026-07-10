export const fmt = new Intl.NumberFormat("ko-KR");
export const num = (n: number, d = 0) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** 원 → 억/만원 축약 */
export function won(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(v >= 1e9 ? 0 : 1)}억`;
  if (v >= 1e4) return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}

export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

export const RANK_LABEL: Record<string, string> = { 정교수: "정교수", 부교수: "부교수", 조교수: "조교수" };
export const TRACK_LABEL: Record<string, string> = { TR: "연구중점", TB: "균형", TE: "교육우선", TI: "산학중점" };
export const VERSION_LABEL: Record<string, string> = { V_LEGACY: "구제도(~2019)", V_2019: "2019 신제도", V_2024: "2024 신임(게이트)" };
export const STATUS_LABEL: Record<string, string> = {
  GOAL_SET: "목표설정", COLLECTING: "실적수집", SELF_CONFIRM: "본인확인", CHAIR_REVIEW: "학과장검토",
  COMMITTEE: "평가위원회", CALIBRATED: "캘리브레이션", NOTIFIED: "결과통지", APPEAL: "이의신청", FINALIZED: "확정",
};

/** IF 밴드 → 사람이 읽는 라벨 */
export const BAND_LABEL: Record<string, string> = {
  SNC: "S/N/Cell", SSCI_AHCI: "SSCI·A&HCI", SCIE_P5: "SCI 상위5%", SCIE_P10: "SCI 상위10%",
  SCIE_P25: "SCI 상위25%", SCIE_P50: "SCI 상위50%", SCIE_GEN: "SCI 일반", SCOPUS: "SCOPUS",
  INTL_GEN: "국제일반", KCI: "KCI 등재", KCI_CAND: "KCI 후보", DOM_GEN: "국내일반",
};
export const ROLE_KO: Record<string, string> = { SOLE: "단독", FIRST: "제1저자", CORRESP: "교신저자", CO: "공동저자" };
