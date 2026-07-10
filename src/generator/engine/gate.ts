/**
 * 질적 필수요건(Quality Gate) + Moving Target 판정 (v1.2 §8·§9, 별표1-1-7-1).
 * 점수와 별개의 pass/fail 축. V_2024 신임에만 적용.
 * 게이트 편수 기준은 param_coefficient의 gate_<field> 그룹에서 로드(하드코딩 금지).
 */
import { Params } from "../loadParams";

export interface BandCounts {
  p10: number; // SNC+상위5%+상위10% (누적)
  p25: number; // +상위25%
  p50: number; // +상위50%
  sci: number; // SCI급(SNC+SCIE_*+SSCI_AHCI + SCOPUS 최대1)
  ahci: number; // A&HCI(=SSCI_AHCI)
  kci: number; // KCI+KCI_CAND
}

/** 주·교신저자 이상 논문의 IF 밴드 편수 집계 */
export function countBands(papers: { if_band: string; author_role: string }[]): BandCounts {
  const c: BandCounts = { p10: 0, p25: 0, p50: 0, sci: 0, ahci: 0, kci: 0 };
  let scopusUsed = 0;
  for (const pp of papers) {
    if (!(pp.author_role === "FIRST" || pp.author_role === "CORRESP" || pp.author_role === "SOLE")) continue;
    const b = pp.if_band;
    if (b === "SNC" || b === "SCIE_P5" || b === "SCIE_P10") { c.p10++; c.p25++; c.p50++; c.sci++; }
    else if (b === "SCIE_P25") { c.p25++; c.p50++; c.sci++; }
    else if (b === "SCIE_P50") { c.p50++; c.sci++; }
    else if (b === "SCIE_GEN") { c.sci++; }
    else if (b === "SSCI_AHCI") { c.ahci++; c.sci++; }
    else if (b === "SCOPUS") { if (scopusUsed < 1) { c.sci++; scopusUsed++; } }
    else if (b === "KCI" || b === "KCI_CAND") { c.kci++; }
  }
  return c;
}

/** field별 편수 기준(OR) 충족 여부 */
export function qualityGatePass(field: string, c: BandCounts, p: Params): boolean {
  const g = p.coef.get(`gate_${field}`);
  if (!g) return false;
  const meets = (key: keyof BandCounts) => {
    const th = g.get(key);
    return th !== undefined && c[key] >= th;
  };
  return meets("p10") || meets("p25") || meets("p50") || meets("ahci") || meets("sci") || meets("kci");
}

/** Moving Target 통과 (달성률 ≥ 기준) */
export function mtPass(rate: number, p: Params): boolean {
  return rate >= (p.coef.get("mt")?.get("pass_rate") ?? 150);
}
