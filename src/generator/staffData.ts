/**
 * 직원(행정직) 파라미터·지표·부서유형 콘텐츠 시드 (07_파라미터_직원.md).
 * 3태그: FIXED(🟦확정)/ASSUME(🟨가정)/PROPOSE(🟩제안). 가정값은 UI에 '가정' 배지.
 * 배점·분포는 param_* 테이블에(하드코딩 금지). 기존 스키마 흡수(04 §9).
 */
import type BetterSqlite3 from "better-sqlite3";
export const PV = 2;

export type BSC = "F" | "C" | "P" | "L";
export interface KpiDef { code: string; name: string; bsc: BSC; unit: string; target: string; alimni?: boolean; }
export interface DeptTypeDef {
  code: string; label: string; count: number;
  kpis: KpiDef[]; mbo: string[]; edu: string[]; awards: string[]; innov: string[]; keywords: string[];
  depts: string[]; // 소속 부서명(개수=count)
}

// prettier-ignore
export const DEPT_TYPES: DeptTypeDef[] = [
  { code:"ACAD_AFF", label:"교무·학사", count:6,
    kpis:[{code:"K_ACAD_1",name:"학사민원 처리기간",bsc:"P",unit:"일",target:"≤2"},{code:"K_ACAD_2",name:"성적처리 정확도",bsc:"P",unit:"%",target:"≥99.5"},{code:"K_ACAD_3",name:"재학생 충원율",bsc:"C",unit:"%",target:"≥95",alimni:true},{code:"K_ACAD_4",name:"학사서비스 만족도",bsc:"C",unit:"점",target:"≥4.2"}],
    mbo:["학사민원 원스톱 처리체계 구축","성적정정 오류 제로화","강의계획서 입력률 제고","학사 FAQ 챗봇 도입","졸업사정 자동검증 고도화","수강신청 서버 안정화"],
    edu:["학사행정 실무과정","개인정보보호 교육","고객응대 서비스 교육","학사정보시스템 활용"],
    awards:["학사서비스 우수상","무민원 표창","업무개선 제안 채택상"],
    innov:["학사민원 표준응대 매뉴얼","성적입력 검증 자동화 RPA","졸업요건 셀프체크 서비스"],
    keywords:["학사","성적","수강","졸업","학적","민원"],
    depts:["교무처","학사지원팀","교학팀","수업지원팀","성적관리팀","학적팀","대학원교학팀","교육혁신팀","교직팀","계절학기운영팀"] },
  { code:"ADMISSION", label:"입학·홍보", count:2,
    kpis:[{code:"K_ADM_1",name:"신입생 충원율",bsc:"C",unit:"%",target:"≥99",alimni:true},{code:"K_ADM_2",name:"입학 경쟁률",bsc:"C",unit:"배",target:"≥8"},{code:"K_ADM_3",name:"홍보 도달수",bsc:"C",unit:"천명",target:"목표"},{code:"K_ADM_4",name:"입시 오류율",bsc:"P",unit:"%",target:"≤0.1"}],
    mbo:["고교 방문 홍보 확대","입학전형 오류 예방체계","SNS 홍보 콘텐츠 강화","입학 상담 만족도 제고","수시 경쟁률 목표 달성"],
    edu:["입학사정관 전문교육","마케팅·홍보 실무","데이터 기반 입시분석"],
    awards:["입학홍보 우수상","전형운영 무사고 표창"],
    innov:["온라인 입학설명회 플랫폼","입시결과 데이터 대시보드","챗봇 입학상담"],
    keywords:["입학","전형","홍보","충원","경쟁률","입시"],
    depts:["입학처","입학사정관실","홍보팀"] },
  { code:"RESEARCH_SUP", label:"연구지원", count:3,
    kpis:[{code:"K_RES_1",name:"연구비 수주액",bsc:"F",unit:"억",target:"목표",alimni:true},{code:"K_RES_2",name:"과제정산 적기율",bsc:"P",unit:"%",target:"≥98"},{code:"K_RES_3",name:"연구윤리 이수율",bsc:"L",unit:"%",target:"≥95"},{code:"K_RES_4",name:"기술이전 건수",bsc:"F",unit:"건",target:"목표",alimni:true}],
    mbo:["대형 국책과제 수주 지원","연구비 정산 적기처리","연구윤리 교육 이수 독려","기술이전 성사 확대","산학협력 네트워크 구축"],
    edu:["연구관리 실무과정","연구윤리 심화","기술이전·특허 실무"],
    awards:["연구지원 우수상","산학협력 기여 표창"],
    innov:["연구비 통합관리 시스템","정산 자동알림 서비스","기술이전 매칭 플랫폼"],
    keywords:["연구비","과제","정산","기술이전","산학","연구윤리"],
    depts:["산학협력단","연구처","연구지원팀","기술이전센터"] },
  { code:"CAREER", label:"취업·경력", count:1,
    kpis:[{code:"K_CAR_1",name:"졸업생 취업률",bsc:"C",unit:"%",target:"≥72",alimni:true},{code:"K_CAR_2",name:"현장실습 매칭",bsc:"P",unit:"건",target:"목표"},{code:"K_CAR_3",name:"취업상담 실적",bsc:"P",unit:"건",target:"목표"},{code:"K_CAR_4",name:"채용기업 발굴",bsc:"C",unit:"개",target:"목표"}],
    mbo:["취업률 목표 달성 프로그램","현장실습 기업 발굴","1:1 취업상담 확대","채용박람회 운영 내실화"],
    edu:["진로·취업지도 상담사 과정","커리어코칭 자격","노동시장 분석"],
    awards:["취업지원 우수상","현장실습 운영 표창"],
    innov:["AI 취업매칭 서비스","기업-학생 인턴십 플랫폼","취업역량 진단 툴"],
    keywords:["취업","현장실습","상담","채용","진로","경력"],
    depts:["취업지원팀","현장실습지원센터"] },
  { code:"GENERAL_FIN", label:"총무·재정", count:3,
    kpis:[{code:"K_FIN_1",name:"예산 적기집행률",bsc:"F",unit:"%",target:"≥95"},{code:"K_FIN_2",name:"계약 처리기간",bsc:"P",unit:"일",target:"≤7"},{code:"K_FIN_3",name:"회계 오류율",bsc:"P",unit:"%",target:"≤0.3"},{code:"K_FIN_4",name:"자산실사 정확도",bsc:"P",unit:"%",target:"≥99"}],
    mbo:["예산 조기집행 관리","계약 처리기간 단축","회계 오류 최소화","고정자산 실사 정확도 제고","전자결재 확대"],
    edu:["회계·재무 실무과정","계약·구매 법규","공공회계 기준"],
    awards:["재정운영 우수상","청렴계약 표창"],
    innov:["전자계약 시스템 도입","예산집행 실시간 모니터링","자산관리 QR 태깅"],
    keywords:["예산","계약","회계","자산","구매","재정"],
    depts:["총무팀","재무회계팀","구매팀","자산관리팀","예산팀"] },
  { code:"FACILITY", label:"시설·안전", count:2,
    kpis:[{code:"K_FAC_1",name:"안전점검 이행률",bsc:"P",unit:"%",target:"100"},{code:"K_FAC_2",name:"시설민원 처리기간",bsc:"P",unit:"일",target:"≤3"},{code:"K_FAC_3",name:"에너지 절감률",bsc:"F",unit:"%",target:"목표",alimni:true},{code:"K_FAC_4",name:"안전사고 건수",bsc:"P",unit:"건",target:"≤목표"}],
    mbo:["교내 안전점검 100% 이행","시설민원 신속 처리","에너지 절감 캠페인","노후시설 개선","무재해 사업장 달성"],
    edu:["산업안전보건 교육","시설물 유지관리 실무","전기안전 관리자"],
    awards:["안전관리 우수상","에너지 절감 표창"],
    innov:["시설민원 모바일 접수","IoT 에너지 모니터링","안전점검 체크리스트 앱"],
    keywords:["안전","시설","점검","에너지","민원","설비"],
    depts:["시설관리팀","안전관리팀","전기설비팀","환경미화팀"] },
  { code:"STUDENT_SUP", label:"학생지원", count:3,
    kpis:[{code:"K_STU_1",name:"장학금 지급 적기율",bsc:"P",unit:"%",target:"≥98",alimni:true},{code:"K_STU_2",name:"학생상담 건수",bsc:"C",unit:"건",target:"목표"},{code:"K_STU_3",name:"비교과 참여율",bsc:"C",unit:"%",target:"목표"},{code:"K_STU_4",name:"생활관 수용률",bsc:"C",unit:"%",target:"≥90",alimni:true}],
    mbo:["장학금 적기 지급체계","학생 심리상담 확대","비교과 프로그램 참여 제고","생활관 만족도 개선"],
    edu:["학생상담 기법 과정","장학행정 실무","위기학생 대응 교육"],
    awards:["학생지원 우수상","상담서비스 표창"],
    innov:["장학금 통합신청 시스템","비교과 마일리지 앱","생활관 스마트 출입"],
    keywords:["장학","상담","비교과","생활관","학생","복지"],
    depts:["학생지원팀","장학팀","생활관운영팀","비교과지원팀"] },
  { code:"IT", label:"정보전산", count:1,
    kpis:[{code:"K_IT_1",name:"핵심시스템 가동률",bsc:"P",unit:"%",target:"≥99.9"},{code:"K_IT_2",name:"정보보안 진단등급",bsc:"P",unit:"등급",target:"상위",alimni:true},{code:"K_IT_3",name:"헬프데스크 처리기간",bsc:"P",unit:"시간",target:"≤4"},{code:"K_IT_4",name:"업무 자동화 건수",bsc:"L",unit:"건",target:"목표"}],
    mbo:["학사시스템 무중단 운영","정보보안 취약점 개선","헬프데스크 SLA 준수","RPA 업무자동화 확대"],
    edu:["정보보안 전문교육","클라우드 인프라 과정","데이터 분석 실무"],
    awards:["정보화 우수상","보안관리 표창"],
    innov:["장애 예측 모니터링","제로트러스트 보안체계","챗봇 헬프데스크"],
    keywords:["시스템","보안","전산","자동화","가동률","헬프데스크"],
    depts:["정보전산원","보안관제팀"] },
  { code:"INTL", label:"국제교류", count:1,
    kpis:[{code:"K_INT_1",name:"외국인 유학생 수",bsc:"C",unit:"명",target:"목표",alimni:true},{code:"K_INT_2",name:"교류협정·파견",bsc:"C",unit:"건",target:"목표"},{code:"K_INT_3",name:"국제프로그램 운영",bsc:"C",unit:"건",target:"목표"}],
    mbo:["유학생 유치 확대","해외 교류협정 체결","글로벌 프로그램 운영","유학생 정착 지원 강화"],
    edu:["국제교류 실무과정","다문화 이해 교육","외국어 회화"],
    awards:["국제화 우수상","유학생 지원 표창"],
    innov:["유학생 원스톱 포털","온라인 교환학생 매칭","글로벌 멘토링 앱"],
    keywords:["유학생","교류","국제","글로벌","협정","파견"],
    depts:["국제교류팀","글로벌센터"] },
  { code:"PLANNING", label:"기획·평가", count:3,
    kpis:[{code:"K_PLN_1",name:"재정지원사업 수주",bsc:"F",unit:"억",target:"목표",alimni:true},{code:"K_PLN_2",name:"자체평가 이행률",bsc:"P",unit:"%",target:"≥95"},{code:"K_PLN_3",name:"중장기계획 이행률",bsc:"P",unit:"%",target:"≥90"},{code:"K_PLN_4",name:"KPI 대시보드 운영",bsc:"L",unit:"건",target:"목표"}],
    mbo:["국고 재정지원사업 수주","대학 자체평가 대응","중장기 발전계획 이행점검","성과관리 대시보드 고도화"],
    edu:["대학기획 실무과정","성과관리·BSC","정부재정사업 관리"],
    awards:["기획평가 우수상","재정사업 수주 표창"],
    innov:["성과지표 자동집계 시스템","전략과제 진도관리 툴","대학평가 데이터 허브"],
    keywords:["기획","평가","재정지원","전략","성과","중장기"],
    depts:["기획처","전략기획팀","평가인증팀","대외협력처"] },
];

export function deptTypeOf(code: string): DeptTypeDef {
  return DEPT_TYPES.find((d) => d.code === code)!;
}

// ─────────────────────────── 파라미터·지표 시드 ───────────────────────────
export function seedStaffParams(db: BetterSqlite3.Database): void {
  const co = db.prepare(`INSERT INTO param_coefficient (param_version_id,coef_group,coef_key,coef_value,note) VALUES (?,?,?,?,?)`);
  const C = (g: string, k: string, v: number, n = "") => co.run(PV, g, k, v, n);
  // 정기평가 영역 배점 (일반·기술직 90점, 🟨가정)
  C("staff_area_max", "WORK", 30, "근무실적"); C("staff_area_max", "ATTITUDE", 15, "근무태도");
  C("staff_area_max", "JOB_COMP", 20, "직무역량"); C("staff_area_max", "LEADERSHIP", 10, "리더십");
  C("staff_area_max", "DEPT_SVC", 15, "부서 서비스성과");
  // 기능직 200점
  C("staff_func_max", "COMMON_COMP", 100, "공통역량"); C("staff_func_max", "JOB_BEHAV", 100, "직무행동역량");
  // 가·감점 (🟦확정 상한)
  C("staff_gain", "dept_cap", 3, "부서평가 가점"); C("staff_gain", "personal_cap", 5, "개인평가 가점");
  C("staff_gain", "tenure_max", 10, "근속점수 환산"); C("staff_gain", "award", 2, "포상 가점");
  C("staff_penalty", "강등", 2); C("staff_penalty", "정직", 2); C("staff_penalty", "감봉", 2);
  C("staff_penalty", "직위해제", 1.5); C("staff_penalty", "견책", 1);
  // 근속점수 구간 (🟨) 상한연수→점수
  C("staff_tenure", "3", 60); C("staff_tenure", "6", 70); C("staff_tenure", "10", 80); C("staff_tenure", "15", 90); C("staff_tenure", "99", 100);
  // 직급군별 %가중 (🟩·🟨) — group: JUNIOR/MIDDLE/MANAGER
  C("staff_w_JUNIOR", "biz", 60); C("staff_w_JUNIOR", "comp", 30); C("staff_w_JUNIOR", "svc", 10);
  C("staff_w_MIDDLE", "biz", 50); C("staff_w_MIDDLE", "comp", 35); C("staff_w_MIDDLE", "svc", 15);
  C("staff_w_MANAGER", "biz", 40); C("staff_w_MANAGER", "comp", 45); C("staff_w_MANAGER", "svc", 15);
  // 서비스성과 접촉빈도 가중 (🟦)
  C("staff_contact", "3", 3); C("staff_contact", "2", 2); C("staff_contact", "1", 1); C("staff_contact", "0", 0);
  // 동료평가 360° 관계유형 가중 (🟩제안) + 응답률
  C("staff_feedback_w", "MGR_DOWN", 35, "상사→부하"); C("staff_feedback_w", "PEER", 35, "동료→동료");
  C("staff_feedback_w", "SUBORD_UP", 15, "부하→상사"); C("staff_feedback_w", "CROSS_DEPT", 15, "타부서 협업");
  C("staff_feedback", "respond_rate", 0.88, "평가 응답률"); C("staff_feedback", "bonus_cap", 3, "역량평가 보완 상한(점)");

  // 등급정책 STAFF: 절대컷(90점 환산) + 강제배분(공무원형 S20/A30/B30/C10/D10)
  const gp = db.prepare(`INSERT INTO param_grade_policy (param_version_id,target_type,mode,grade,cut_score,dist_ratio) VALUES (?,?,?,?,?,?)`);
  gp.run(PV, "STAFF", "ABS_CUT", "S", 90, null); gp.run(PV, "STAFF", "ABS_CUT", "A", 80, null);
  gp.run(PV, "STAFF", "ABS_CUT", "B", 70, null); gp.run(PV, "STAFF", "ABS_CUT", "C", 60, null); gp.run(PV, "STAFF", "ABS_CUT", "D", null, null);
  gp.run(PV, "STAFF", "REL_DIST", "S", null, 0.2); gp.run(PV, "STAFF", "REL_DIST", "A", null, 0.3);
  gp.run(PV, "STAFF", "REL_DIST", "B", null, 0.3); gp.run(PV, "STAFF", "REL_DIST", "C", null, 0.1); gp.run(PV, "STAFF", "REL_DIST", "D", null, 0.1);

  // 분포 (STAFF)
  const di = db.prepare(`INSERT INTO param_distribution (param_version_id,metric_key,series,dist_type,dist_params) VALUES (?,?,?,?,?)`);
  const D = (k: string, t: string, p: object) => di.run(PV, k, "STAFF", t, JSON.stringify(p));
  D("staff_regular90", "normal_trunc", { mean: 78, sd: 6, lo: 55, hi: 90 });
  D("staff_func200", "normal_trunc", { mean: 165, sd: 12, lo: 120, hi: 200 });
  D("staff_bars", "normal_trunc", { mean: 3.5, sd: 0.6, lo: 1, hi: 5 });
  D("staff_service_item", "normal_trunc", { mean: 4.0, sd: 0.5, lo: 1, hi: 5 });
  D("staff_mbo", "normal_trunc", { mean: 90, sd: 12, lo: 40, hi: 150 });
  D("staff_deptkpi", "normal_trunc", { mean: 88, sd: 10, lo: 55, hi: 130 });
  D("staff_committee", "normal_trunc", { mean: 82, sd: 7, lo: 55, hi: 100 });
  D("staff_multi", "normal_trunc", { mean: 82, sd: 8, lo: 60, hi: 100 });

  seedStaffIndicators(db);
}

function seedStaffIndicators(db: BetterSqlite3.Database): void {
  const ins = db.prepare(
    `INSERT INTO dim_indicator (indicator_id,target_type,area,name,definition,formula_type,formula_params,unit,direction,reflect_stage,is_new,data_source,paired_with,sort_order)
     VALUES (@id,'STAFF',@area,@name,@def,@ft,@fp,@unit,'UP',@stage,@isNew,@ds,NULL,@sort)`
  );
  type R = { id: string; area: string; name: string; def: string; ft: string; fp: string; unit: string; stage: string; isNew: number; ds: string; sort: number };
  const I = (id: string, area: string, name: string, def: string, ft: string, layer: string, unit: string, stage: string, isNew: number, sort: number): R =>
    ({ id, area, name, def, ft, fp: JSON.stringify({ layer }), unit, stage, isNew, ds: "인사·업무(가상)", sort });
  const rows: R[] = [
    I("N01", "WORK", "근무실적", "담당업무 성과 (자기평가 4단계+1·2차)", "STAFF_AREA", "ASSUME", "점", "SCORE", 0, 101),
    I("N02", "ATTITUDE", "근무태도", "책임·성실·윤리·협조", "STAFF_AREA", "ASSUME", "점", "SCORE", 0, 102),
    I("N03", "JOB_COMP", "직무역량", "직무 전문성·문제해결 (BARS)", "STAFF_AREA", "ASSUME", "점", "SCORE", 0, 103),
    I("N04", "LEADERSHIP", "리더십", "조직관리·코칭 (직급↑ 비중↑)", "STAFF_AREA", "ASSUME", "점", "SCORE", 0, 104),
    I("N05", "DEPT_SVC", "부서 서비스성과", "타부서 상호 만족도 (5단계·접촉가중)", "STAFF_SERVICE", "FIXED", "점", "SCORE", 0, 105),
    I("N06", "COMMON_COMP", "공통역량(기능직)", "책임·소통·고객지향·윤리 (100점)", "STAFF_FUNC", "FIXED", "점", "SCORE", 0, 106),
    I("N07", "JOB_BEHAV", "직무행동역량(기능직)", "직무행동 관찰 평정 (100점)", "STAFF_FUNC", "FIXED", "점", "SCORE", 0, 107),
    I("N08", "GAIN", "부서평가 가점", "총장 선정 우수팀 ≤3점", "STAFF_GAIN", "FIXED", "점", "BONUS", 0, 108),
    I("N09", "GAIN", "개인평가 가점", "학교발전 기여 ≤5점", "STAFF_GAIN", "FIXED", "점", "BONUS", 0, 109),
    I("N10", "GAIN", "근속점수", "근속연수→60~100→10점 환산", "STAFF_TENURE", "FIXED", "점", "SCORE", 0, 110),
    I("N12", "PENALTY", "징계 감점", "강등/정직/감봉−2·견책−1", "STAFF_PENALTY", "FIXED", "점", "MONITOR", 0, 112),
    I("N20", "WORK", "개인 목표 달성률(MBO)", "반기 합의목표 달성도 (상한150)", "STAFF_MBO", "PROPOSE", "%", "SCORE", 1, 120),
    I("N21", "KPI", "부서 KPI 달성률", "소속 부서 KPI (BSC 4관점)", "STAFF_KPI", "PROPOSE", "%", "SCORE", 1, 121),
    I("N25", "JOB_COMP", "디지털 전환 기여", "자동화·데이터 활용", "COUNT", "PROPOSE", "건", "MONITOR", 1, 125),
    I("N27", "WORK", "혁신 제안 실적", "채택 개선제안", "COUNT", "PROPOSE", "건", "MONITOR", 1, 127),
    I("N30", "JOB_COMP", "자기계발·성장", "교육·자격·학습공동체", "COUNT", "PROPOSE", "시간", "MONITOR", 1, 130),
    I("N40", "JOB_COMP", "동료평가(360°)", "상사·동료·부하·타부서 다면평가 관계유형별 가중평균 (블라인드·평가자 비식별)", "STAFF_MULTI", "PROPOSE", "점", "BONUS", 1, 140),
  ];
  const tx = db.transaction((rs: R[]) => { for (const r of rs) ins.run(r); });
  tx(rows);

  // 부서 KPI 지표 (각 부서유형 KPI → dim_indicator, ORG 그레인 저장용)
  const insK = db.prepare(
    `INSERT INTO dim_indicator (indicator_id,target_type,area,name,definition,formula_type,formula_params,unit,direction,reflect_stage,is_new,data_source,paired_with,sort_order)
     VALUES (@id,'STAFF','KPI',@name,@def,'STAFF_KPI',@fp,@unit,'UP','SCORE',1,'부서KPI(가상)',NULL,@sort)`
  );
  let s = 200;
  const txk = db.transaction(() => {
    for (const dt of DEPT_TYPES) for (const k of dt.kpis)
      insK.run({ id: k.code, name: k.name, def: `${dt.label} · ${k.bsc}관점`, fp: JSON.stringify({ layer: "PROPOSE", bsc: k.bsc, alimni: !!k.alimni, dept_type: dt.code }), unit: k.unit, sort: s++ });
  });
  txk();
}
