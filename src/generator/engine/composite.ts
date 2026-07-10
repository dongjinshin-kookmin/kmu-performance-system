/**
 * 영역 표준화 → 트랙 가중 → 종합점수 + 가점.
 * 절대 합산형 기본(01 §1.3): std = 영역원점수 / 영역기준상수 × 100 (하드실링 200).
 */
import { Params, coefVal } from "../loadParams";

export const HARD_CEILING = 200;
export type Area = "R" | "E" | "I" | "S";
export const AREAS: Area[] = ["R", "E", "I", "S"];

export function standardize(raw: number, benchmark: number): number {
  if (benchmark <= 0) return 0;
  return Math.min((raw / benchmark) * 100, HARD_CEILING);
}

export interface AreaResult {
  area: Area;
  raw: number;
  benchmark: number;
  std: number;
  weight: number;
  weighted: number;
}

export function computeComposite(
  areaRaw: Record<Area, number>,
  benchmarks: Record<Area, number>,
  weights: Record<Area, number>
): { areas: AreaResult[]; composite: number } {
  const areas: AreaResult[] = AREAS.map((a) => {
    const std = standardize(areaRaw[a], benchmarks[a]);
    const weighted = (std * weights[a]) / 100;
    return { area: a, raw: areaRaw[a], benchmark: benchmarks[a], std, weight: weights[a], weighted };
  });
  const composite = areas.reduce((s, x) => s + x.weighted, 0);
  return { areas, composite };
}

/** 신설 2단계 가점 5종 (v1.2 §13: R05·R07·R08·E06·I04). 개별·합 상한 param bonus_cap. */
export interface BonusInputs {
  fwci: number;      // R05
  intlRatio: number; // R07
  oaRatio: number;   // R08 (v1.2 신규 승격)
  e06Count: number;  // E06
  startupCount: number; // I04(창업 신설분)
}
export function computeBonus(b: BonusInputs, p: Params): { total: number; parts: Record<string, number> } {
  const cap = (k: string) => coefVal(p, "bonus_cap", k, 0);
  const parts: Record<string, number> = {
    R05: clamp(Math.max(0, b.fwci - 1.0) * 1.5, 0, cap("R05")),
    R07: clamp(b.intlRatio * 3.0, 0, cap("R07")),
    R08: clamp(b.oaRatio * 2.0, 0, cap("R08")),
    E06: clamp(b.e06Count * 0.25, 0, cap("E06")),
    I04: clamp(b.startupCount * 0.5, 0, cap("I04")),
  };
  const raw = Object.values(parts).reduce((s, x) => s + x, 0);
  const total = Math.min(raw, cap("total"));
  return { total, parts };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
