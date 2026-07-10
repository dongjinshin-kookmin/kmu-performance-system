/**
 * 실적 이벤트 + 상세(논문/연구비/특허/예체능 실기/오픈소스) + 지표 환산 (v1.2).
 * 논문 질=IF 백분위 계단배점, 저자환산=2/(N+k), 연구비=종류별 정액, 특허=국민대 실값.
 * 드릴다운용 현실 상세필드(제목·저널·IF밴드·공저자·과제명·전시명·장소)를 학과 풀로 조합.
 */
import type BetterSqlite3 from "better-sqlite3";
import { Rng, sampleDist } from "../rng";
import { Params, resolveDist, coefVal } from "../loadParams";
import {
  paperScore, grantScore, ipScore, artScore, countWeightScore, weightedAvg, applyCap,
} from "../engine/score";
import { isSciGroup, isArtGroup } from "../content/departments";
import * as Lex from "../content/lexicon";
import { FacultyRec, YEARS } from "./types";
import { PARAM_VERSION_ID } from "../seedData";

export interface PersonYear {
  R: number; E: number; I: number; S: number;
  fwci: number; intl: number; oa: number; fusion: number; e06: number; startup: number;
}
export type PYMap = Map<number, Map<number, PersonYear>>;

const TRACK_MULT: Record<string, { paper: number; grant: number; teach: number; ip: number }> = {
  TR: { paper: 1.4, grant: 1.3, teach: 0.85, ip: 0.9 },
  TB: { paper: 1.0, grant: 1.0, teach: 1.0, ip: 1.0 },
  TE: { paper: 0.6, grant: 0.7, teach: 1.4, ip: 0.7 },
  TI: { paper: 0.7, grant: 0.9, teach: 0.9, ip: 2.2 },
};

// IF 밴드 → 참고용 분위 (R06 등)
function bandQuartile(band: string): string {
  if (band === "SNC" || band === "SCIE_P5" || band === "SCIE_P10") return "TOP10";
  if (band === "SCIE_P25") return "Q1";
  if (band === "SCIE_P50") return "Q2";
  if (band === "SCIE_GEN" || band === "SSCI_AHCI") return "Q3";
  return "NA";
}

export function generateActivities(db: BetterSqlite3.Database, rng: Rng, faculty: FacultyRec[], p: Params): PYMap {
  const insAct = db.prepare(
    `INSERT INTO fact_activity (activity_id,person_id,indicator_id,period_id,activity_type,title,occurred_on,attributes,claim_status,evidence_url,source)
     VALUES (?,?,?,?,?,?,?,?,?,?, '교내가상')`
  );
  const insPaper = db.prepare(
    `INSERT INTO act_paper (activity_id,grade,if_band,author_role,author_n,author_k,jcr_quartile,is_intl_coauth,is_oa,asjc_field,is_fusion,citations_3y,fwci)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insGrant = db.prepare(`INSERT INTO act_grant (activity_id,amount_won,role,researcher_n,fund_source) VALUES (?,?,?,?,?)`);
  const insIp = db.prepare(`INSERT INTO act_ip (activity_id,ip_kind,inventor_share,income_won) VALUES (?,?,?,?)`);
  const insScore = db.prepare(
    `INSERT INTO fact_indicator_score (indicator_id,person_id,org_id,period_id,param_version_id,raw_value,converted_score,grain)
     VALUES (?,?,?,?,?,?,?, 'PERSON')`
  );

  const pymap: PYMap = new Map();
  let aid = 1;
  const rP = rng.derive("paper");
  const rG = rng.derive("grant");
  const rI = rng.derive("ip");
  const rT = rng.derive("teach");
  const rS = rng.derive("service");
  const rA = rng.derive("art");

  for (const f of faculty) {
    const yearMap = new Map<number, PersonYear>();
    pymap.set(f.person_id, yearMap);
    const sci = isSciGroup(f.group);
    const art = isArtGroup(f.group);
    const mult = TRACK_MULT[f.track];
    const score = (ind: string, year: number, raw: number, conv: number) =>
      insScore.run(ind, f.person_id, f.org_id, year, PARAM_VERSION_ID, raw, conv);

    for (const year of YEARS) {
      const trend = 1 + 0.03 * (year - 2021);
      const scale = f.rankScale * trend;
      const py: PersonYear = { R: 0, E: 0, I: 0, S: 0, fwci: 1.0, intl: 0, oa: 0, fusion: 0, e06: 0, startup: 0 };

      // ===== R01 논문 (IF 계단배점) =====
      const lamDist = resolveDist(p, "annual_papers", f.field);
      const nPapers = Math.round(sampleDist(rP, lamDist.dist_type, lamDist.dist_params) * scale * mult.paper);
      const typeMix = resolveDist(p, "paper_type_mix", f.field).dist_params;
      const ifMix = resolveDist(p, "scie_if_mix", "ALL").dist_params;
      const mainP = resolveDist(p, "main_author", f.field).dist_params.p;
      const authorDist = resolveDist(p, "author_n", f.field);
      const kDist = resolveDist(p, "author_k", "ALL").dist_params;
      let r01 = 0, intlCnt = 0, oaCnt = 0, fusionCnt = 0, fwciSum = 0, citeSum = 0;
      for (let i = 0; i < nPapers; i++) {
        const type = rP.weighted(Object.entries(typeMix).map(([k, w]) => ({ value: k, w: w as number })));
        let band: string, grade: string;
        if (type === "SCIE") {
          if (rP.bool(ifMix.snc)) band = "SNC";
          else band = "SCIE_" + rP.weighted([
            { value: "P5", w: ifMix.P5 }, { value: "P10", w: ifMix.P10 }, { value: "P25", w: ifMix.P25 },
            { value: "P50", w: ifMix.P50 }, { value: "GEN", w: ifMix.GEN },
          ]);
          grade = "SCI";
        } else if (type === "SSCI_AHCI") { band = "SSCI_AHCI"; grade = "SSCI_AHCI"; }
        else if (type === "SCOPUS") { band = "SCOPUS"; grade = "SCOPUS"; }
        else if (type === "KCI") { band = "KCI"; grade = "KCI"; }
        else if (type === "KCI_CAND") { band = "KCI_CAND"; grade = "KCI_CAND"; }
        else { band = "DOM_GEN"; grade = "DOM"; }

        const international = type === "SCIE" || type === "SSCI_AHCI" || type === "SCOPUS";
        const authorN = Math.max(1, Math.round(sampleDist(rP, authorDist.dist_type, authorDist.dist_params)));
        const k = authorN === 1 ? 1 : Number(rP.weighted(Object.entries(kDist).map(([kk, w]) => ({ value: kk, w: w as number }))));
        let role: string;
        if (authorN === 1) role = "SOLE";
        else if (rP.bool(mainP)) role = rP.bool(0.5) ? "FIRST" : "CORRESP";
        else role = "CO";

        const isFusion = rP.bool(sampleBeta(rP, p, "fusion", "ALL"));
        const isIntl = rP.bool(sampleBeta(rP, p, "intl_coauth", f.field)) ? 1 : 0;
        const isOa = rP.bool(sampleBeta(rP, p, "oa", "ALL")) ? 1 : 0;
        const fwci = rP.lognormal(1.0, 0.6);
        const cites = rP.poisson(band === "SNC" ? 80 : band === "SCIE_P5" ? 45 : band === "SCIE_P10" ? 22 : band === "SCIE_P25" ? 12 : 5);

        const { title, topic } = Lex.paperTitle(rP, f.dept, international);
        const { volume, issue, pages } = Lex.volumeIssuePages(rP);
        const attrs = {
          journal: Lex.journalName(rP, f.dept, band), if_band: band, doi: Lex.makeDoi(rP, year),
          volume, issue, pages, topic, pub_month: rP.int(1, 12),
          co_authors: Lex.coAuthors(rP, authorN, international), author_role_label: Lex.ROLE_LABEL[role],
          author_k: k, is_fusion: isFusion,
        };
        insAct.run(aid, f.person_id, "R01", year, "PAPER", title,
          `${year}-${String(attrs.pub_month).padStart(2, "0")}-15`, JSON.stringify(attrs),
          rP.bool(0.7) ? "CLAIMED" : "AUTO", `https://doi.org/${attrs.doi}`);
        insPaper.run(aid, grade, band, role, authorN, k, bandQuartile(band), isIntl, isOa,
          international ? "ASJC" : null, isFusion ? 1 : 0, cites, +fwci.toFixed(3));
        aid++;

        r01 += paperScore({ if_band: band, author_role: role, author_n: authorN, author_k: k, is_fusion: isFusion }, p);
        if (isIntl) intlCnt++;
        if (isOa) oaCnt++;
        if (isFusion) fusionCnt++;
        fwciSum += fwci; citeSum += cites;
      }
      py.R += r01;
      py.fwci = nPapers > 0 ? fwciSum / nPapers : 1.0;
      py.intl = nPapers > 0 ? intlCnt / nPapers : 0;
      py.oa = nPapers > 0 ? oaCnt / nPapers : 0;
      py.fusion = nPapers > 0 ? fusionCnt / nPapers : 0;
      if (nPapers > 0) score("R01", year, nPapers, r01);
      score("R05", year, +py.fwci.toFixed(3), +py.fwci.toFixed(3));
      score("R06", year, citeSum, citeSum);
      score("R07", year, +py.intl.toFixed(3), +py.intl.toFixed(3));
      score("R08", year, +py.oa.toFixed(3), +py.oa.toFixed(3));
      score("R09", year, +py.fusion.toFixed(3), +py.fusion.toFixed(3));

      // ===== R02 저·역서 =====
      const nBooks = rP.zeroInflated(0.8, () => rP.poisson(0.6 * scale));
      let r02 = 0;
      for (let i = 0; i < nBooks; i++) {
        const m = rP.int(1, 4);
        const { title } = Lex.bookTitle(rP, f.dept);
        const kind = rP.weighted([{ value: "DOM_PRO", w: 5 }, { value: "TEXTBOOK", w: 3 }, { value: "TRANS_KR", w: 2 }]);
        const base = coefVal(p, "book", kind, 100);
        insAct.run(aid, f.person_id, "R02", year, "BOOK", title, `${year}-06-01`,
          JSON.stringify({ kind, authors_m: m, publisher: "국민대출판부" }), "CLAIMED", null);
        aid++;
        r02 += base * (m === 1 ? 1 : 1 / Math.min(m, 10));
      }
      py.R += r02;
      if (nBooks > 0) score("R02", year, nBooks, r02);

      // ===== R03 학술대회 =====
      const nConf = rP.poisson(1.2 * scale);
      let r03 = 0;
      for (let i = 0; i < nConf; i++) {
        const { title, intl } = Lex.conferenceTitle(rP, f.dept);
        insAct.run(aid, f.person_id, "R03", year, "CONFERENCE", title, `${year}-09-20`,
          JSON.stringify({ INTL: intl ? 1 : 0, DOM: intl ? 0 : 1, venue: intl ? "International Symposium" : "한국학술대회" }), "CLAIMED", null);
        aid++;
        r03 += intl ? coefVal(p, "cw_R03", "INTL") : coefVal(p, "cw_R03", "DOM");
      }
      py.R += r03;
      if (nConf > 0) score("R03", year, nConf, r03);

      // ===== R04 연구비 (종류별 정액) =====
      const gDist = resolveDist(p, "grant_amount", art ? "ART" : sci ? "SCI" : "HSSP");
      const nGrants = rG.int(0, 2);
      let r04raw = 0, r04conv = 0;
      for (let i = 0; i < nGrants; i++) {
        const amount = Math.round(sampleDist(rG, gDist.dist_type, gDist.dist_params) * mult.grant);
        if (amount < 1_000_000) continue;
        const gc = Lex.grantContent(rG, f.dept);
        const role = rG.bool(0.6) ? "PI" : "CO";
        const rn = rG.int(2, 6);
        insAct.run(aid, f.person_id, "R04", year, "GRANT", `${gc.title} (${gc.program})`, `${year}-03-01`,
          JSON.stringify({ funder: gc.funder, program: gc.program, kind: gc.kind, role, researcher_n: rn,
            period: `${year}.03~${year + 1}.02`, total_amount: amount }), "CLAIMED", null);
        insGrant.run(aid, amount, role, rn, gc.funder);
        aid++;
        r04raw += amount;
        r04conv += grantScore({ amount_won: amount, kind: gc.kind, role, researcher_n: rn }, p);
      }
      py.R += r04conv;
      if (nGrants > 0) score("R04", year, r04raw, r04conv);

      // ===== R10 오픈소스 SW (SW계열 소수) =====
      if (f.group === "G_ENC" && rP.bool(resolveDist(p, "oss", "ALL").dist_params.p)) {
        const oss = Lex.ossItem(rP, f.dept);
        insAct.run(aid, f.person_id, "R10", year, "OSS", `오픈소스 기여: ${oss.repo}`, `${year}-10-01`,
          JSON.stringify(oss), "CLAIMED", null);
        aid++;
        py.R += oss.base;
        score("R10", year, oss.stars, oss.base);
      }

      // ===== R11 예체능 실기 (G_ART) =====
      if (art) {
        let r11 = 0;
        const kinds: [Lex.ArtKind, string][] = [["EXHIBITION", "art_exhibition"], ["PERFORMANCE", "art_performance"], ["AWARD", "art_award"]];
        for (const [kind, metric] of kinds) {
          const n = Math.round(sampleDist(rA, "poisson", { lambda: resolveDist(p, metric, "ALL").dist_params.lambda * scale }));
          for (let i = 0; i < n; i++) {
            const ev = Lex.artEvent(rA, f.dept, kind);
            const participants = rA.int(1, 4);
            const pts = artScore(ev.base, participants, p);
            insAct.run(aid, f.person_id, "R11", year, "ART", ev.title, `${year}-${String(rA.int(3, 11)).padStart(2, "0")}-10`,
              JSON.stringify({ kind, label: ev.label, venue: ev.venue, scale: ev.scale, participants, base: ev.base }), "CLAIMED", null);
            aid++;
            r11 += pts;
          }
        }
        py.R += r11;
        if (r11 > 0) score("R11", year, 0, r11);
      }

      // ===== I01 특허 =====
      const patDist = resolveDist(p, "patent", f.field);
      const nPat = Math.round(sampleDist(rI, patDist.dist_type, patDist.dist_params) * mult.ip);
      let i01 = 0;
      for (let i = 0; i < nPat; i++) {
        const registered = rI.bool(0.55);
        const kind = rI.weighted([
          { value: "INTL_REG", w: rI.bool(0.2) ? 15 : 0 }, { value: "DOM_REG", w: 45 },
          { value: "SW", w: 20 }, { value: "UTILITY_DESIGN", w: 15 }, { value: "COPYRIGHT", w: 5 },
        ]);
        const share = +rI.float(0.3, 1.0).toFixed(2);
        const { title } = Lex.patentTitle(rI, f.dept);
        insAct.run(aid, f.person_id, "I01", year, "IP", title, `${year}-07-01`,
          JSON.stringify({ ip_kind: kind, number: Lex.patentNumber(rI, year, registered), inventor_share: share, registered }), "CLAIMED", null);
        insIp.run(aid, kind, share, null);
        aid++;
        i01 += ipScore({ ip_kind: kind, inventor_share: share, income_won: null }, p);
      }
      py.I += i01;
      if (nPat > 0) score("I01", year, nPat, i01);

      // ===== I02 기술이전 (5%) =====
      let i02 = 0;
      if (rI.bool(0.05 * mult.ip)) {
        const income = Math.round(rI.lognormal(5_000_000, 1.0));
        const partner = Lex.techTransferPartner(rI);
        insAct.run(aid, f.person_id, "I02", year, "TECH_TRANSFER", `${f.dept.name} 기술이전: ${partner}`, `${year}-11-01`,
          JSON.stringify({ partner, income_won: income, contract_no: `TLO-${year}-${rI.int(100, 999)}` }), "CLAIMED", null);
        insIp.run(aid, "TECH_TRANSFER", 1.0, income);
        aid++;
        i02 = ipScore({ ip_kind: "TECH_TRANSFER", inventor_share: 1, income_won: income }, p);
      }
      py.I += i02;
      if (i02 > 0) score("I02", year, i02 / coefVal(p, "ip_unit", "TECH_PER_1M", 12) * 1e6, i02);

      // ===== I03 산학 교육 지도 =====
      const field3 = rI.zeroInflated(0.6, () => rI.poisson(1.2 * mult.ip));
      const capstone = rI.zeroInflated(0.7, () => rI.poisson(1.0 * mult.ip));
      const coop = rI.zeroInflated(0.7, () => rI.poisson(1.0));
      let i03 = 0;
      if (field3 + capstone + coop > 0) {
        const attrs = { field: field3, capstone, coop_course: coop };
        insAct.run(aid, f.person_id, "I03", year, "COOP_EDU", `산학 교육지도 실적(${year})`, `${year}-12-01`, JSON.stringify(attrs), "AUTO", null);
        aid++;
        i03 = countWeightScore(attrs, "cw_I03", p);
      }
      py.I += i03;
      if (i03 > 0) score("I03", year, field3 + capstone + coop, i03);

      // ===== I04 취·창업 지도 (+창업 신설분 가점) =====
      const employ = rI.poisson(2.0);
      const stDist = resolveDist(p, "startup", "ALL");
      const startupGuide = Math.round(sampleDist(rI, stDist.dist_type, stDist.dist_params) * mult.ip);
      let i04 = 0;
      if (employ + startupGuide > 0) {
        insAct.run(aid, f.person_id, "I04", year, "CAREER_GUIDE", `취·창업 지도 실적(${year})`, `${year}-12-15`,
          JSON.stringify({ employ, startup_guide: startupGuide,
            startups: startupGuide > 0 ? Array.from({ length: startupGuide }, () =>
              ({ name: `${f.dept.name} 창업팀 ${rI.int(1, 99)}`, survived: rI.bool(0.6), funded: rI.bool(0.2) })) : [] }), "CLAIMED", null);
        aid++;
        i04 = countWeightScore({ employ, startup_guide: startupGuide }, "cw_I04", p);
      }
      py.I += i04;
      py.startup = startupGuide;
      if (i04 > 0) score("I04", year, employ + startupGuide, i04);

      // ===== E01 강의평가 / E02 시수 =====
      const nCourses = Math.max(1, Math.round(rT.int(2, 4) * mult.teach));
      const evalItems: { value: number; weight: number }[] = [];
      let totalCredits = 0, foreignCourses = 0, topEval = 0;
      for (let i = 0; i < nCourses; i++) {
        const rating = +sampleDist(rT, "normal_trunc", { mean: 4.2, sd: 0.3, lo: 3.0, hi: 5.0 }).toFixed(2);
        const enroll = rT.int(15, 80);
        const foreign = rT.bool(0.15) ? 1 : 0;
        if (rating >= 4.6) topEval++;
        totalCredits += 3; foreignCourses += foreign;
        const cn = Lex.courseName(rT, f.dept);
        insAct.run(aid, f.person_id, "E01", year, "TEACHING", `${cn.name} (${cn.section})`, `${year}-03-02`,
          JSON.stringify({ course: cn.name, section: cn.section, rating, enroll, credits: 3, foreign }), "AUTO", null);
        aid++;
        evalItems.push({ value: rating, weight: enroll });
      }
      const e01avg = weightedAvg(evalItems);
      const e01 = e01avg * 14; // 5점 → 약 60점 상한 환산
      py.E += e01;
      score("E01", year, +e01avg.toFixed(2), +e01.toFixed(1));

      const e02attrs = { base: 1, over_credit: Math.max(0, totalCredits - 6), foreign_course: foreignCourses, eval_top: topEval };
      const e02 = countWeightScore(e02attrs, "cw_E02", p);
      py.E += e02;
      score("E02", year, totalCredits, e02);

      // ===== E03 학생지도 =====
      const advDist = resolveDist(p, "advising", f.field);
      const masters = Math.round(sampleDist(rT, advDist.dist_type, advDist.dist_params) * mult.teach);
      const phd = sci ? rT.poisson(0.4) : 0;
      const e03attrs = { masters, phd, counseling: rT.int(2, 8), extracurricular: rT.poisson(2) };
      const e03 = countWeightScore(e03attrs, "cw_E03", p);
      py.E += e03;
      score("E03", year, masters + phd, e03);

      // E06 AI·디지털 (가점 카운트, 상승추세)
      const e06Dist = resolveDist(p, "e06", "ALL");
      const e06cnt = sampleDist(rT, e06Dist.dist_type, { ...e06Dist.dist_params, lambda: e06Dist.dist_params.lambda * (1 + 0.3 * (year - 2021)) });
      py.e06 = e06cnt;
      if (e06cnt > 0) {
        insAct.run(aid, f.person_id, "E06", year, "AI_EDU", `AI·디지털 교육 실적(${year})`, `${year}-08-01`,
          JSON.stringify({ count: e06cnt, items: ["생성형AI 교과 개편", "디지털 교수법 연수"].slice(0, Math.min(2, e06cnt)) }), "AUTO", null);
        aid++;
        score("E06", year, e06cnt, countWeightScore({ unit: e06cnt }, "cw_E06", p));
      }

      // ===== S01 보직·위원회 / S02 학회 =====
      const nComm = rS.poisson(1.5);
      const hasPost = f.is_admin_post && year >= 2023 ? 1 : 0;
      const s01attrs: Record<string, number> = { committee: nComm };
      if (hasPost) s01attrs.post_mid = 1;
      const s01 = countWeightScore(s01attrs, "cw_S01", p);
      py.S += s01;
      insAct.run(aid, f.person_id, "S01", year, "SERVICE", `교내 봉사 실적(${year})`, `${year}-03-01`,
        JSON.stringify({ committees: Array.from({ length: nComm }, () => rS.pick(Lex.COMMITTEES)), admin_post: hasPost ? rS.pick(Lex.ADMIN_POSTS) : null }), "AUTO", null);
      aid++;
      score("S01", year, nComm + hasPost, s01);

      const reviews = rS.poisson(3);
      const officer = rS.bool(0.2) ? 1 : 0;
      const s02attrs: Record<string, number> = { review: reviews };
      if (officer) s02attrs.officer = 1;
      const s02 = countWeightScore(s02attrs, "cw_S02", p);
      py.S += s02;
      insAct.run(aid, f.person_id, "S02", year, "SERVICE", `학회·심사 활동(${year})`, `${year}-05-01`,
        JSON.stringify({ society: rS.pick(Lex.SOCIETY_NAMES), role: officer ? rS.pick(Lex.SOCIETY_ROLES) : "논문심사위원", reviews }), "CLAIMED", null);
      aid++;
      score("S02", year, reviews + officer, s02);

      // S03 SDG·시민참여 (모니터링)
      score("S03", year, +sampleBeta(rS, p, "sdg", "ALL").toFixed(3), +sampleBeta(rS, p, "sdg", "ALL").toFixed(3));

      yearMap.set(year, py);
    }
  }

  void applyCap;
  return pymap;
}

function sampleBeta(rng: Rng, p: Params, metric: string, key: string): number {
  const d = resolveDist(p, metric, key);
  return sampleDist(rng, d.dist_type, d.dist_params);
}
