/**
 * 상세 실적 필드 생성기 (v1.2): 인명·저널명·논문/과제/특허 제목·강의명·예체능 실기·오픈소스.
 * 학과 주제 풀(departments.ts)과 조합해 드릴다운 시 전공 정합적인 현실적 상세를 만든다.
 * 모든 무작위는 주입된 Rng로만 수행(시드 고정).
 */
import { Rng } from "../rng";
import { DeptDef, Field, isSciGroup } from "./departments";

// ── 한국 인명 ──────────────────────────────────────────────
const SURNAMES = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","전","홍","유","고","문","양","손","배","백","허","남","심"];
const GIVEN = ["서연","민준","지우","도윤","예은","하준","지호","수아","시우","은우","지안","유진","건우","서준","하은","지민","현우","다은","준서","윤아","태윤","소율","시윤","채원","민서","주원","가은","연우","해든","라온","도현","세훈","가람","한결","보람","수빈","예린","재원","동하","우진"];
export function koName(rng: Rng): string {
  return rng.pick(SURNAMES) + rng.pick(GIVEN);
}
const EN_GIVEN = ["Minjun","Seoyeon","Jiwoo","Doyun","Hajun","Jiho","Sua","Eunwoo","Jian","Yujin","Seojun","Haeun","Jimin","Hyunwoo","Junseo"];
const EN_SUR = ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon"];
export function enName(rng: Rng): string {
  return `${rng.pick(EN_GIVEN)} ${rng.pick(EN_SUR)}`;
}

export const ROLE_LABEL: Record<string, string> = {
  SOLE: "단독", FIRST: "제1저자", CORRESP: "교신저자", CO: "공동저자",
};

// ── 저널명 풀 (IF 밴드 기준) ───────────────────────────────
const INTL_TOP = ["Science", "Nature", "Cell"];
const SCIE_BY_GROUP: Record<string, string[]> = {
  ENA: ["Advanced Materials","Journal of the American Chemical Society","ACS Nano","Nature Communications","Biomaterials","Journal of Materials Chemistry A"],
  ENB: ["IEEE Transactions on Industrial Electronics","Composite Structures","Applied Energy","Mechanical Systems and Signal Processing","Journal of Cleaner Production","IEEE Access"],
  ENC: ["IEEE Transactions on Neural Networks and Learning Systems","Pattern Recognition","IEEE Transactions on Software Engineering","Automation in Construction","Expert Systems with Applications"],
};
const SSCI_AHCI_BY_FIELD: Record<string, string[]> = {
  사회: ["Social Science & Medicine","Journal of Business Research","American Journal of Political Science"],
  경상: ["Journal of Business Research","Journal of Economic Behavior & Organization","Marketing Science"],
  인문: ["Journal of Pragmatics","Applied Linguistics","Poetics"],
  체육: ["Journal of Sports Sciences","Psychology of Sport and Exercise"],
  예능: ["Leonardo","International Journal of Art & Design Education"],
};
const SCOPUS_BY_KIND: Record<string, string[]> = {
  sci: ["Journal of the Korean Physical Society","Journal of Mechanical Science and Technology","Bulletin of the Korean Chemical Society","Journal of Microbiology"],
  hum: ["Asian Journal of Communication","Korea Observer","Global Economic Review","Acta Koreana"],
  art: ["Archives of Design Research","International Journal of Design"],
};
const INTL_GEN = ["International Journal of Advanced Research (Proc.)","Global Science Frontiers","World Academy Proceedings"];

// KCI(국내등재)는 학과 전공지로 매칭 (드릴다운 정합성)
const KCI_BY_DEPT: Record<string, string[]> = {
  KOR:["국어국문학","국어학"], ENG:["영어영문학","현대영미어문학"], CHN:["중국학연구","중국어문학지"],
  HIS:["한국사연구","역사학보"], PHI:["철학연구","철학"], JPN:["일본학보","일어일문학연구"],
  EDU:["교육학연구","교육과정연구"], LIS:["한국문헌정보학회지","정보관리학회지"],
  PAD:["한국행정학보","한국정책학회보"], POL:["한국정치학회보","국제정치논총"], SOC:["한국사회학","한국인구학"],
  MED2:["한국언론학보","광고학연구"], LAW:["법조","저스티스"], PSY:["한국심리학회지","인지과학"],
  ECO:["경제학연구","국제경제연구"], BIZ:["경영학연구","마케팅연구"], ITR:["국제통상연구","무역학회지"],
  BDM:["한국경영과학회지","응용통계연구"], PHE:["한국체육학회지","운동과학"], SPT:["한국운동재활학회지","한국사회체육학회지"],
  PHY:["새물리(New Physics)","한국물리학회지"], CHE:["대한화학회지"], BIO:["한국생명과학회지","분자세포생물학"],
  FDN:["한국식품영양과학회지"], NEP:["한국진공학회지","반도체디스플레이기술학회지"], BFC:["한국미생물·생명공학회지"],
  MSE:["대한금속·재료학회지"], BPH:["생물공학과 바이오","KSBB Journal"],
  MAT:["대한수학회지","응용수학"], STA:["응용통계연구","한국통계학회논문집"], EAR:["한국지구과학회지","대기"],
  MEC:["대한기계학회논문집"], EEE:["전자공학회논문지"], AUT:["한국자동차공학회논문집"], CHEG:["한국화학공학회지"],
  FORS:["한국목재공학","한국산림과학회지"], MOB:["한국ITS학회논문지","한국자동차공학회논문집"],
  CSE:["정보과학회논문지"], SWE:["정보처리학회논문지(소프트웨어 및 응용)"], CIV:["대한토목학회논문집"], AII:["정보과학회논문지(인공지능)"],
  VCD:["디자인학연구","기초조형학연구"], IDE:["디자인학연구","감성과학"], MET:["한국공예논총"], CER:["한국도자학연구"],
  FAS:["복식문화연구","한국의류학회지"], PFA:["한국무용연구","연극교육연구"], MUS:["음악교육연구","서양음악학"],
  ARC:["대한건축학회논문집"], CRA:["디자인학연구","한국디자인문화학회지"],
};

function scopusKind(dept: DeptDef): string {
  if (isSciGroup(dept.group)) return "sci";
  if (dept.group === "G_ART") return "art";
  return "hum";
}

/** IF 밴드 + 학과에 맞는 저널명 */
export function journalName(rng: Rng, dept: DeptDef, band: string): string {
  if (band === "SNC") return rng.pick(INTL_TOP);
  if (band === "SSCI_AHCI") return rng.pick(SSCI_AHCI_BY_FIELD[dept.field] ?? SSCI_AHCI_BY_FIELD["인문"]);
  if (band.startsWith("SCIE")) {
    const pool = isSciGroup(dept.group) ? SCIE_BY_GROUP[dept.field] ?? SCIE_BY_GROUP.ENB : SCIE_BY_GROUP.ENB;
    return rng.pick(pool);
  }
  if (band === "SCOPUS") return rng.pick(SCOPUS_BY_KIND[scopusKind(dept)]);
  if (band === "INTL_GEN") return rng.pick(INTL_GEN);
  const kci = KCI_BY_DEPT[dept.code] ?? ["한국학술지"];
  return band === "DOM_GEN" ? rng.pick(kci) + " (일반학술지)" : rng.pick(kci);
}

// ── 제목 조합 ──────────────────────────────────────────────
const KOR_PAPER_TEMPLATES = [
  (t: string) => `${t}에 관한 연구`, (t: string) => `${t}의 특성 분석`,
  (t: string) => `${t}에 대한 실증 분석`, (t: string) => `${t}을(를) 활용한 접근`,
  (t: string) => `${t} 사례 연구`, (t: string) => `${t}의 영향 요인 분석`,
];
const EN_PAPER_TEMPLATES = [
  (t: string) => `A Study on ${t}`, (t: string) => `Analysis of ${t}`,
  (t: string) => `An Empirical Investigation of ${t}`, (t: string) => `Toward Robust ${t}`,
  (t: string) => `On the Characteristics of ${t}`, (t: string) => `${t}: A Data-Driven Approach`,
];

/** 논문 제목 — 국제지면(international)이면 영문, 국내면 국문. topic도 반환. */
export function paperTitle(rng: Rng, dept: DeptDef, international: boolean): { title: string; topic: string } {
  if (international && dept.enTopics.length) {
    const topic = rng.pick(dept.enTopics);
    return { title: rng.pick(EN_PAPER_TEMPLATES)(topic), topic };
  }
  const topic = rng.pick(dept.topics);
  return { title: rng.pick(KOR_PAPER_TEMPLATES)(topic), topic };
}
export function bookTitle(rng: Rng, dept: DeptDef): { title: string; topic: string } {
  const topic = rng.pick(dept.topics);
  return { title: `${topic} 입문` + (rng.bool(0.3) ? " (개정판)" : ""), topic };
}
export function conferenceTitle(rng: Rng, dept: DeptDef): { title: string; topic: string; intl: boolean } {
  const intl = rng.bool(0.4) && isSciGroup(dept.group);
  if (intl) {
    const topic = rng.pick(dept.enTopics.length ? dept.enTopics : dept.topics);
    return { title: `${topic}: Preliminary Results`, topic, intl };
  }
  const topic = rng.pick(dept.topics);
  return { title: `${topic}에 대한 예비 고찰`, topic, intl };
}

export function makeDoi(rng: Rng, year: number): string {
  return `10.${rng.int(1000, 9999)}/j.kmu.${year}.${String(rng.int(1, 99999)).padStart(5, "0")}`;
}
export function volumeIssuePages(rng: Rng): { volume: number; issue: number; pages: string } {
  const start = rng.int(1, 900);
  return { volume: rng.int(1, 60), issue: rng.int(1, 12), pages: `${start}-${start + rng.int(6, 24)}` };
}
export function coAuthors(rng: Rng, n: number, international: boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(0, n - 1); i++) out.push(international ? enName(rng) : koName(rng));
  return out;
}

// ── 연구비 ──────────────────────────────────────────────
const FUNDERS_GOV = ["한국연구재단","과학기술정보통신부","산업통상자원부","중소벤처기업부","교육부","정보통신기획평가원(IITP)","한국산업기술기획평가원(KEIT)"];
const FUNDERS_LOCAL = ["서울특별시","성북구청","경기도","한국지능정보사회진흥원"];
const FUNDERS_CORP = ["삼성전자","현대자동차","LG에너지솔루션","SK하이닉스","네이버","카카오","포스코","한화솔루션"];
const PROGRAMS = ["기초연구사업","중견연구자지원","신진연구자지원","산학협력 R&D","소재·부품·장비 기술개발","지역혁신 선도연구","우수신진연구"];

/** 연구비 종류 (v1.2 §5): 정액 배점 종류코드 반환 */
export function grantContent(
  rng: Rng, dept: DeptDef
): { title: string; funder: string; program: string; kind: string } {
  const roll = rng.next();
  const funder = roll < 0.55 ? rng.pick(FUNDERS_GOV) : roll < 0.8 ? rng.pick(FUNDERS_CORP) : rng.pick(FUNDERS_LOCAL);
  // 종류: 외부/산업체/지역협력
  const kind = roll < 0.55 ? "EXTERNAL" : roll < 0.8 ? "INDUSTRY" : "REGIONAL";
  const topic = rng.pick(dept.topics);
  return { title: `${topic} 기반 핵심기술 개발`, funder, program: rng.pick(PROGRAMS), kind };
}

// ── 특허 / 기술이전 ──
const DEVICE_NOUNS_SCI = ["장치","시스템","방법","조성물","소자","모듈","제어 알고리즘","센서"];
const DEVICE_NOUNS_GEN = ["시스템","방법","플랫폼","서비스 모델","콘텐츠 제작 방법"];
export function patentTitle(rng: Rng, dept: DeptDef): { title: string; topic: string } {
  const nouns = isSciGroup(dept.group) ? DEVICE_NOUNS_SCI : DEVICE_NOUNS_GEN;
  const topic = rng.pick(dept.topics);
  return { title: `${topic}를 이용한 ${rng.pick(nouns)} 및 그 동작 방법`, topic };
}
export function patentNumber(rng: Rng, year: number, registered: boolean): string {
  if (registered) return `10-${rng.int(1000000, 2999999)}`;
  return `10-${year}-${String(rng.int(1, 9999999)).padStart(7, "0")}`;
}
export function techTransferPartner(rng: Rng): string {
  return rng.pick(FUNDERS_CORP.concat(["㈜한국바이오","㈜에스엠소재","㈜디앤에스","㈜코리아텍"]));
}

// ── 예체능 실기 (별표2-2-1~7) ─────────────────────────────
const ART_VENUES_DOM = ["국립현대미술관","예술의전당","세종문화회관","금호미술관","아르코미술관","DDP 디자인전시관","성곡미술관","부산시립미술관","LG아트센터","블루스퀘어"];
const ART_VENUES_INTL = ["Venice Biennale","Ars Electronica","Milano Salone del Mobile","SIGGRAPH Art Gallery","Art Basel","London Design Festival"];
const ART_AWARDS_DOM = ["대한민국디자인대상","한국공예대전 대상","대한민국무용제 최우수상","전국음악콩쿠르 1위","대한민국건축대전 우수상"];
const ART_AWARDS_INTL = ["iF Design Award","Red Dot Award","IBLA Grand Prize","Prague Quadrennial 수상"];

export type ArtKind = "EXHIBITION" | "PERFORMANCE" | "AWARD";
/** 예체능 실기 실적 1건 (배점 base는 국제/국내로 결정) */
export function artEvent(
  rng: Rng, dept: DeptDef, kind: ArtKind
): { title: string; venue: string; scale: "INTL" | "DOM"; base: number; label: string } {
  const intl = rng.bool(0.3);
  const scale = intl ? "INTL" : "DOM";
  const topic = rng.pick(dept.topics);
  if (kind === "EXHIBITION") {
    return { title: `${topic} 초대전`, venue: intl ? rng.pick(ART_VENUES_INTL) : rng.pick(ART_VENUES_DOM),
      scale, base: intl ? 200 : 100, label: intl ? "국제초대전시" : "국내전시" };
  }
  if (kind === "PERFORMANCE") {
    return { title: `${topic} 공연/연주`, venue: intl ? rng.pick(ART_VENUES_INTL) : rng.pick(ART_VENUES_DOM),
      scale, base: intl ? 200 : 100, label: intl ? "국제공연" : "국내공연" };
  }
  return { title: intl ? rng.pick(ART_AWARDS_INTL) : rng.pick(ART_AWARDS_DOM),
    venue: intl ? "International" : "국내", scale, base: intl ? 150 : 100, label: intl ? "국제수상" : "국내수상" };
}

// ── 오픈소스 SW (별표2-2, R10) ─────────────────────────────
const OSS_PROJECTS = ["kmu-mlkit","fastgraph","tensor-lite","webflow-ui","secure-mesh","autoscaler-x","data-pipe","viz-canvas"];
export function ossItem(rng: Rng, dept: DeptDef): { repo: string; kind: string; stars: number; base: number } {
  const roll = rng.next();
  const topic = rng.pick(dept.topics);
  if (roll < 0.15) return { repo: `apache/${rng.pick(OSS_PROJECTS)}`, kind: "APACHE_TLP", stars: rng.int(3000, 12000), base: 500 };
  if (roll < 0.4) return { repo: `${rng.pick(OSS_PROJECTS)} (본인, ${topic})`, kind: "OWNER_1000", stars: rng.int(1000, 5000), base: 200 };
  return { repo: `${rng.pick(OSS_PROJECTS)} (${topic})`, kind: "COMMIT_1500", stars: rng.int(1500, 8000), base: 30 };
}

// ── 강의명 / 보직·위원회 ──
export function courseName(rng: Rng, dept: DeptDef): { name: string; section: string } {
  return { name: rng.pick(dept.courses), section: `0${rng.int(1, 3)}분반` };
}
export const ADMIN_POSTS = ["부총장","교무처장","기획처장","입학처장","학생처장","산학협력단장","도서관장","학장","부학장","주임교수"];
export const COMMITTEES = ["교육과정위원회","연구윤리위원회","입학전형관리위원회","교원인사위원회","등록금심의위원회","도서관운영위원회","학생지도위원회"];
export const SOCIETY_ROLES = ["학회장","부회장","편집위원장","편집위원","이사","논문심사위원"];
export const SOCIETY_NAMES = ["대한기계학회","한국경영학회","한국물리학회","한국행정학회","한국심리학회","한국디자인학회","국어국문학회","한국체육학회"];

/** 파일 내부 field 사용을 위한 재노출 (validate 등에서 참조 가능) */
export type { Field };
