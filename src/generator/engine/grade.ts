/**
 * 등급 판정 — 절대컷 1차 + 상대배분 상한 2차 병기 (01 §1.4).
 * S는 코호트 상위 10%까지만, S+A 상위 35%까지, D 하위 5% 상한.
 */
import { GradeCut, RelDist } from "../loadParams";

/** 절대컷 등급: cut 내림차순으로 최초 충족 등급 */
export function absGradeOf(score: number, cuts: GradeCut[]): string {
  const ordered = [...cuts]
    .filter((c) => c.cut_score !== null)
    .sort((a, b) => (b.cut_score ?? 0) - (a.cut_score ?? 0));
  for (const c of ordered) {
    if (score >= (c.cut_score ?? 0)) return c.grade;
  }
  return "D";
}

export interface Cand {
  id: number;
  score: number; // composite + bonus
}

/**
 * 코호트(학과/계열)에 절대컷+상대상한을 적용해 최종 등급 산출.
 * 반환: id -> { grade_abs, grade_rel(=최종), }
 */
export function assignGrades(
  cohort: Cand[],
  cuts: GradeCut[],
  rel: RelDist[]
): Map<number, { abs: string; rel: string }> {
  const n = cohort.length;
  const ratio = (g: string) => rel.find((r) => r.grade === g)?.dist_ratio ?? 0;
  const capS = Math.max(1, Math.floor(n * ratio("S")));
  const capSA = Math.max(1, Math.floor(n * (ratio("S") + ratio("A"))));
  const capB = Math.floor(n * (ratio("S") + ratio("A") + ratio("B")));
  const dBottom = Math.floor(n * ratio("D"));

  // 점수 내림차순 랭킹
  const ranked = [...cohort].sort((a, b) => b.score - a.score);
  const result = new Map<number, { abs: string; rel: string }>();

  ranked.forEach((c, idx) => {
    const abs = absGradeOf(c.score, cuts);
    // 상대 상한: 순위 기반 최고 허용 등급
    let relGrade: string;
    if (idx < capS) relGrade = "S";
    else if (idx < capSA) relGrade = "A";
    else if (idx < capB || capB === 0) relGrade = "B";
    else relGrade = "C";

    // 병기 최종: 절대컷과 상대상한 중 "더 낮은" 등급(상대상한이 절대컷을 눌러 상위 인플레 억제)
    const order = ["D", "C", "B", "A", "S"];
    let finalG = order[Math.min(order.indexOf(abs), order.indexOf(relGrade))];

    // D 하위 5% 상한 강제(프로토타입): 절대 미달(abs=D)이라도 하위 dBottom 순위 밖이면 C로 승급.
    // → 등급 분포가 상대상한(D 하위 5%)을 준수하도록 통제. (원 정책상 D는 권고 상한이나 시연 현실성 위해 강제)
    if (finalG === "D" && idx < n - dBottom) {
      finalG = "C";
    }
    result.set(c.id, { abs, rel: finalG });
  });
  return result;
}
