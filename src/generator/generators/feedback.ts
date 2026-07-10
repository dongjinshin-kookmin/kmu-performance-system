/**
 * 동료평가·360도 다면평가 생성 (전향적 제안 · fact_feedback).
 * 관계유형(상사→부하/동료→동료/부하→상사/타부서 협업)별 평가자 3~7인 배정.
 * 블라인드 원칙: 평가자 식별자는 비가역 해시(rater_hash)로만 저장.
 * N40(동료평가 360°) = 관계유형 가중평균 → fact_indicator_score(BONUS·제안).
 */
import type BetterSqlite3 from "better-sqlite3";
import { createHash } from "node:crypto";
import { Rng } from "../rng";
import { Params, coefVal } from "../loadParams";
import { deptTypeOf, PV } from "../staffData";
import { StaffRec } from "./types";

const LATEST = 20252;
const SALT = "kmu-360-blind-2026";

const REL_ITEMS: Record<string, string[]> = {
  MGR_DOWN: ["직무 전문성", "책임·신뢰", "성과 기여"],
  PEER: ["협업·팀워크", "소통·공유", "직무 전문성"],
  SUBORD_UP: ["리더십", "코칭·지원", "소통·공유"],
  CROSS_DEPT: ["협업·팀워크", "대응 신속성", "책임·신뢰"],
};

// 감정 톤별 코멘트 풀 (부서업무 맥락 삽입). 평가자 식별 정보 일절 없음.
const COMMENTS: Record<string, { hi: string[]; mid: string[] }> = {
  MGR_DOWN: {
    hi: ["{dept} 핵심 과제를 안정적으로 이끌었고 어려운 이슈에도 책임감 있게 대응함.", "담당 업무 완결성이 높고, 마감·품질 모두 신뢰할 수 있는 수준.", "부서 목표를 정확히 이해하고 자발적으로 개선안을 제시함."],
    mid: ["기본 업무는 성실하나 우선순위 조정과 선제 보고가 더 필요함.", "역량은 충분하므로 난도 높은 과제에 더 도전해볼 것을 권함.", "결과물은 무난하나 진행 상황 공유 빈도를 높이면 좋겠음."],
  },
  PEER: {
    hi: ["{dept} 협업 과정에서 자료 공유가 빠르고 요청에 늘 열려 있음.", "팀 분위기를 긍정적으로 만들고, 막힌 부분을 함께 풀어줌.", "전문성이 높아 어려운 문의에도 명확한 답을 줘 큰 도움이 됨."],
    mid: ["협조적이나 바쁠 때 회신이 늦어 일정 공유가 더 필요함.", "성실하지만 의견을 조금 더 적극적으로 내주면 좋겠음.", "무난히 협업하나 문서화·인수인계를 보강하면 좋을 듯."],
  },
  SUBORD_UP: {
    hi: ["방향을 명확히 제시하고 실무 애로를 잘 들어주는 리더.", "권한을 적절히 위임하고 성장 기회를 챙겨줌.", "의사결정이 빠르고 공정해 신뢰가 감."],
    mid: ["업무 지시는 명확하나 피드백 주기가 더 잦으면 좋겠음.", "방향 제시는 좋으나 실무 부하 분배의 균형이 필요함.", "소통은 원활하나 우선순위 변경 시 배경 설명이 더 필요함."],
  },
  CROSS_DEPT: {
    hi: ["타부서 요청에도 신속·정확하게 대응해 협업이 원활했음.", "{dept} 창구로서 책임 있게 조율해 줘 신뢰가 감.", "필요 자료를 선제적으로 공유해 업무 효율이 높았음."],
    mid: ["협조적이나 부서 간 일정 조율에서 회신이 지연된 적이 있음.", "대응은 무난하나 진행 경과 공유가 더 있으면 좋겠음.", "협업 태도는 좋으나 담당 범위 안내가 더 명확하면 좋겠음."],
  },
};

export interface FeedbackReport { nRows: number; nSubjects: number; responded: number; invited: number; meanOverall: number; relDist: Record<string, number>; }

export function generateFeedback(db: BetterSqlite3.Database, rng: Rng, staff: StaffRec[], p: Params): FeedbackReport {
  const byOrg = new Map<number, StaffRec[]>();
  for (const s of staff) { if (!byOrg.has(s.org_id)) byOrg.set(s.org_id, []); byOrg.get(s.org_id)!.push(s); }
  const respondRate = coefVal(p, "staff_feedback", "respond_rate", 0.88);
  const relW: Record<string, number> = {
    MGR_DOWN: coefVal(p, "staff_feedback_w", "MGR_DOWN", 35), PEER: coefVal(p, "staff_feedback_w", "PEER", 35),
    SUBORD_UP: coefVal(p, "staff_feedback_w", "SUBORD_UP", 15), CROSS_DEPT: coefVal(p, "staff_feedback_w", "CROSS_DEPT", 15),
  };

  const insFb = db.prepare(`INSERT INTO fact_feedback (feedback_id,cycle_id,subject_id,rel_type,rater_hash,rater_org_id,score_overall,item_scores,comment,responded) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const insScore = db.prepare(`INSERT INTO fact_indicator_score (indicator_id,person_id,org_id,period_id,param_version_id,raw_value,converted_score,grain) VALUES (?,?,?,?,?,?,?,?)`);

  const hash = (rater: number, subject: number) => createHash("sha256").update(`${rater}|${subject}|${SALT}`).digest("hex").slice(0, 16);
  const rComment = rng.derive("fbcomment");

  let fid = 1, respondedTot = 0, invitedTot = 0, sumOv = 0, cntOv = 0, nSubjects = 0;
  const relDist: Record<string, number> = { MGR_DOWN: 0, PEER: 0, SUBORD_UP: 0, CROSS_DEPT: 0 };

  for (const s of staff) {
    const dept = byOrg.get(s.org_id) ?? [];
    const deptLabel = deptTypeOf(s.deptType).label;
    const peers = dept.filter((x) => x.person_id !== s.person_id);
    const managers = peers.filter((x) => x.mgrRole);
    const nonMgrPeers = peers.filter((x) => !x.mgrRole);
    const crossPool = staff.filter((x) => x.org_id !== s.org_id);

    const raters: { rater: StaffRec; type: string }[] = [];
    if (managers.length) raters.push({ rater: rng.pick(managers), type: "MGR_DOWN" });
    for (const pr of rng.sample(nonMgrPeers, Math.min(nonMgrPeers.length, rng.int(2, 4)))) raters.push({ rater: pr, type: "PEER" });
    if (s.mgrRole) for (const sub of rng.sample(nonMgrPeers, Math.min(nonMgrPeers.length, rng.int(1, 3)))) raters.push({ rater: sub, type: "SUBORD_UP" });
    for (const c of rng.sample(crossPool, rng.int(1, 2))) raters.push({ rater: c, type: "CROSS_DEPT" });
    if (raters.length === 0) continue;
    nSubjects++;

    // 피평가자 일반 수준(관계 전반 안정) — 현실적 분포
    const base = rng.normalTrunc(3.95, 0.38, 2.9, 4.9);
    const relMeans: Record<string, number[]> = {};

    for (const { rater, type } of raters) {
      invitedTot++;
      const responded = rng.bool(respondRate);
      if (!responded) {
        insFb.run(fid++, LATEST, s.person_id, type, hash(rater.person_id, s.person_id), rater.org_id, null, "{}", null, 0);
        continue;
      }
      respondedTot++; relDist[type]++;
      const items: Record<string, number> = {};
      let isum = 0;
      for (const it of REL_ITEMS[type]) { const v = +rng.normalTrunc(base, 0.42, 1, 5).toFixed(1); items[it] = Math.min(5, Math.max(1, v)); isum += items[it]; }
      const overall = +(isum / REL_ITEMS[type].length + rng.float(-0.15, 0.15)).toFixed(2);
      const ov = Math.min(5, Math.max(1, overall));
      (relMeans[type] ??= []).push(ov);
      sumOv += ov; cntOv++;
      // 코멘트: 40% 확률 서술 (상위 톤은 점수 연동)
      let comment: string | null = null;
      if (rComment.bool(0.42)) {
        const tone = ov >= base ? "hi" : "mid";
        comment = rComment.pick(COMMENTS[type][tone]).replace("{dept}", deptLabel);
      }
      insFb.run(fid++, LATEST, s.person_id, type, hash(rater.person_id, s.person_id), rater.org_id, ov, JSON.stringify(items), comment, 1);
    }

    // N40 관계유형 가중평균 (존재하는 유형만 정규화)
    let wsum = 0, acc = 0;
    for (const [type, arr] of Object.entries(relMeans)) {
      if (!arr.length) continue;
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      acc += m * relW[type]; wsum += relW[type];
    }
    if (wsum > 0) {
      const weighted = +(acc / wsum).toFixed(2);            // 1~5 척도
      const converted = +((weighted / 5) * 100).toFixed(1); // 100 환산(집계 편의)
      insScore.run("N40", s.person_id, s.org_id, LATEST, PV, weighted, converted, "PERSON");
    }
  }

  return { nRows: fid - 1, nSubjects, responded: respondedTot, invited: invitedTot, meanOverall: +(sumOv / (cntOv || 1)).toFixed(2), relDist };
}
