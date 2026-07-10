/**
 * 지표 환산 엔진 (v1.2) — formula_type별 계산. 계수는 Params에서(하드코딩 금지).
 * 생성기(가상)와 런타임(앱) 공용(원칙 P6).
 */
import { Params, coefVal } from "../loadParams";

// ── 저자환산 f = 2/(N+k) (주저자·교신) / 1/(N+k) (공동), N≤max_n ──
export function authorFactor(role: string, n: number, k: number, p: Params): number {
  const maxN = coefVal(p, "author", "max_n", 15);
  const nn = Math.min(n, maxN);
  if (role === "SOLE") return 1.0;
  if (role === "FIRST" || role === "CORRESP") return 2 / (nn + k);
  return 1 / (nn + k);
}

export interface PaperInput {
  if_band: string;   // SNC/SCIE_P5.../KCI/DOM_GEN...
  author_role: string;
  author_n: number;
  author_k: number;
  is_fusion: boolean;
}

/** R01 단일 논문 = IF 계단배점 × 저자환산 × 융복합가산(×1.3) */
export function paperScore(pp: PaperInput, p: Params): number {
  const base = coefVal(p, "paper_band", pp.if_band, 0);
  const f = authorFactor(pp.author_role, pp.author_n, pp.author_k, p);
  const mult = pp.is_fusion ? coefVal(p, "fusion", "mult", 1) : 1;
  return base * f * mult;
}

// ── R04 연구비 (종류별 정액, 계열계수 없음) ──
export interface GrantInput {
  amount_won: number;
  kind: string;      // TECH_TRANSFER/REGIONAL/EXTERNAL/INDUSTRY/EQUIP_REVENUE
  role: string;      // PI/CO
  researcher_n: number;
}
export function grantScore(g: GrantInput, p: Params): number {
  const unit = coefVal(p, "grant_kind", g.kind, 2);
  const r = Math.max(1, g.researcher_n);
  const f = g.role === "PI" ? 2 / (r + 1) : 1 / (r + 1);
  return (g.amount_won / 1_000_000) * unit * f;
}

// ── I01/I02 특허·기술이전 ──
export interface IpInput {
  ip_kind: string;
  inventor_share: number;
  income_won: number | null;
}
export function ipScore(ip: IpInput, p: Params): number {
  if (ip.ip_kind === "TECH_TRANSFER") {
    return ((ip.income_won ?? 0) / 1_000_000) * coefVal(p, "ip_unit", "TECH_PER_1M", 12);
  }
  return coefVal(p, "ip_unit", ip.ip_kind, 0) * ip.inventor_share;
}

// ── R11 예체능 실기 (배점 × 인원 환산율%) ──
export function artScore(base: number, participants: number, p: Params): number {
  const key = String(Math.min(Math.max(participants, 1), 6));
  const sharePct = coefVal(p, "art_share", key, 100);
  return base * (sharePct / 100);
}

// ── COUNT_WEIGHT: attributes 항목 × 단가, 상한 ──
export function countWeightScore(attrs: Record<string, number>, coefGroup: string, p: Params): number {
  const group = p.coef.get(coefGroup);
  if (!group) return 0;
  let sum = 0;
  for (const [key, qty] of Object.entries(attrs)) {
    const unit = group.get(key);
    if (unit !== undefined) sum += unit * qty;
  }
  const cap = group.get("cap");
  return cap !== undefined ? Math.min(sum, cap) : sum;
}

// ── E01 강의평가 수강규모 가중평균 ──
export function weightedAvg(items: { value: number; weight: number }[]): number {
  const wsum = items.reduce((s, it) => s + it.weight, 0);
  if (wsum === 0) return 0;
  return items.reduce((s, it) => s + it.value * it.weight, 0) / wsum;
}

export function applyCap(value: number, capKey: string, group: string, p: Params): number {
  const cap = coefVal(p, group, capKey, Infinity);
  return Math.min(value, cap);
}
