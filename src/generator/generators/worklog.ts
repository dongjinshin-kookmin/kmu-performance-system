/**
 * 직원 반기 수행 업무 — 자기작성 업무일지(SELF_REPORT) 생성.
 * fact_activity 흡수(04 §9): activity_type='SELF_REPORT', indicator_id='N01'(근무실적),
 * attributes JSON = 카드 UI 계약 스키마:
 *   { date(=start), month, summary, category, deptSpecific,
 *     start, end, durationDays,            // ① 수행 기간(1일~수 주)
 *     evidences:[{type,doc}],              // ③ 증빙자료(유형+구체 문서명)
 *     ownerId, ownerName, ownerRole,       // ④ 업무책임자(같은 부서 부서장/팀장)
 *     performers:[{id,name,self}],         // ⑤ 업무수행자(본인+협업 0~2)
 *     kpi:{kind,mboGoal,code,name}|null }  // ⑥ 연결 KPI(부서 KPI) 또는 개인 MBO
 * 부서유형 10종 × (부서 특화 = mbo/innov/edu 풀) + 공통 행정 풀에서 추출. 시드 고정·부서유형 정합.
 */
import type BetterSqlite3 from "better-sqlite3";
import { Rng } from "../rng";
import { deptTypeOf } from "../staffData";
import { StaffRec } from "./types";

// 최근 6개 반기(성과카드 반기 선택기 커버)
const HALVES = [20231, 20232, 20241, 20242, 20251, 20252];

// 전 부서 공통 반복 행정업무
const GENERIC = [
  "주간 업무보고 작성·제출", "부서 정기회의 참석·회의록 작성", "공문 접수·기안 처리", "대내외 민원 응대·처리결과 회신",
  "예산 집행 품의·정산 처리", "월말 실적 집계·보고", "유관부서 협조 요청 대응", "내부 결재문서 검토·회람",
  "업무 매뉴얼 정비·공유", "직무교육·워크숍 참석", "부서 공유드라이브 자료 정리", "연간 업무계획 대비 진도 점검",
];
const EVIDENCE_TYPES = ["기안문", "회의록", "공문", "결과보고서", "집계표", "품의서", "회신공문", "매뉴얼", "실적대장"];
const DETAIL = [
  "총 {n}건을 기한 내 처리 완료하였음.", "관련 자료를 정리해 부서 공유드라이브에 등록함.", "유관부서와 협의하여 일정·범위를 조율함.",
  "검토 의견을 반영하여 최종본을 확정함.", "처리 결과를 담당자에게 회신하고 대장에 기록함.", "전월 대비 {n}% 개선된 결과를 확인함.",
  "누락 항목 {n}건을 보완하여 재제출함.", "표준 양식을 적용해 처리 시간을 단축함.",
];
const ROLE_LABEL: Record<string, string> = { DEPT_HEAD: "부서장", TEAM_LEAD: "팀장", SENIOR: "선임(직무대리)" };

export interface WorklogReport { nRows: number; nStaff: number; perHalfAvg: number; deptSpecific: number; kpiLinked: number; }

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// 부서 등급 서열(낮을수록 상위) — 업무책임자 폴백 선정용
const GRADE_ORDER: Record<string, number> = { "2급": 1, "3급": 2, "4급": 3, "5급": 4, "6급": 5, "7급": 6, "8급": 7, "9급": 8 };
const gradeRank = (g: string) => GRADE_ORDER[g] ?? 9;

/** 증빙 유형 → 구체 문서명 생성 (예: "기안문 제2025-142호", "행사 결과보고서.pdf") */
function evidenceDoc(rng: Rng, type: string, category: string, year: number, month: number, half: number): string {
  const no = rng.int(101, 486);
  const topic = category.replace(/\s*(구축|제고|강화|개선|확대|도입|고도화|운영|처리|관리|점검|지원|체계).*$/, "").trim().slice(0, 14) || category.slice(0, 14);
  switch (type) {
    case "기안문": return `기안문 제${year}-${no}호`;
    case "공문": return `접수공문 제${year}-${no}호`;
    case "회신공문": return `유관부서 협조회신 제${year}-${no}호`;
    case "품의서": return `예산집행 품의서 제${year}-${no}호`;
    case "회의록": return `${month}월 정기회의 회의록.hwp`;
    case "집계표": return `${month}월 실적 집계표.xlsx`;
    case "결과보고서": return `${topic} 결과보고서.pdf`;
    case "매뉴얼": return `${topic} 업무 매뉴얼 v${rng.int(1, 3)}.${rng.int(0, 5)}`;
    case "실적대장": return `${year}-${half % 10} 업무 실적대장`;
    default: return `${topic} 관련 문서`;
  }
}

export function generateWorklog(db: BetterSqlite3.Database, rng: Rng, staff: StaffRec[]): WorklogReport {
  const ins = db.prepare(
    `INSERT INTO fact_activity (activity_id,person_id,indicator_id,period_id,activity_type,title,occurred_on,attributes,claim_status,evidence_url,source)
     VALUES (?,?,?,?, 'SELF_REPORT', ?, ?, ?, 'CLAIMED', NULL, '자기작성 업무일지(가상)')`
  );
  let aid = (db.prepare(`SELECT COALESCE(MAX(activity_id),0) m FROM fact_activity`).get() as any).m + 1;
  const rGen = rng.derive("worklog");
  let nRows = 0, deptSpecific = 0, kpiLinked = 0;

  // 이름 조회(StaffRec.name은 비어 있음) + 부서별 구성원·업무책임자 사전 계산
  const nameById = new Map<number, string>();
  for (const r of db.prepare(`SELECT person_id id, name FROM dim_person WHERE person_type='STAFF'`).all() as any[]) nameById.set(r.id, r.name);
  const byOrg = new Map<number, StaffRec[]>();
  for (const s of staff) { if (!byOrg.has(s.org_id)) byOrg.set(s.org_id, []); byOrg.get(s.org_id)!.push(s); }
  // 업무책임자: 부서장 > 팀장 > 최상위 등급 선임
  const ownerByOrg = new Map<number, { id: number; name: string; role: string }>();
  for (const [org, mem] of byOrg) {
    const head = mem.find((m) => m.mgrRole === "DEPT_HEAD");
    const lead = mem.find((m) => m.mgrRole === "TEAM_LEAD");
    const senior = [...mem].sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || a.person_id - b.person_id)[0];
    const pick = head ?? lead ?? senior;
    ownerByOrg.set(org, { id: pick.person_id, name: nameById.get(pick.person_id) ?? "미상", role: pick.mgrRole ?? "SENIOR" });
  }

  for (const s of staff) {
    const dt = deptTypeOf(s.deptType);
    const deptPool = [...dt.mbo, ...dt.innov, ...dt.edu]; // 부서 특화 과제(검증 대상)
    const selfName = nameById.get(s.person_id) ?? "본인";
    const coworkers = (byOrg.get(s.org_id) ?? []).filter((m) => m.person_id !== s.person_id);
    // 업무책임자: 부서 대표 관리자(본인이 그 관리자면 다른 관리자/선임으로 대체)
    const orgOwner = ownerByOrg.get(s.org_id)!;
    const owner = orgOwner.id !== s.person_id ? orgOwner : (() => {
      const alt = coworkers.find((m) => m.mgrRole === "TEAM_LEAD") ?? [...coworkers].sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || a.person_id - b.person_id)[0];
      return alt ? { id: alt.person_id, name: nameById.get(alt.person_id) ?? "미상", role: alt.mgrRole ?? "SENIOR" } : orgOwner;
    })();

    for (const half of HALVES) {
      const year = Math.floor(half / 10), h = half % 10;
      const months = h === 1 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 12];
      const n = rGen.int(8, 18);
      for (let i = 0; i < n; i++) {
        const specific = rGen.bool(0.55);
        const category = specific ? rGen.pick(deptPool) : rGen.pick(GENERIC);
        if (specific) deptSpecific++;
        const title = category;
        const month = rGen.pick(months);

        // ① 수행 기간: 대부분 1일, 일부 수일~수 주
        const durationDays = rGen.weighted([
          { value: 1, w: 50 }, { value: 2, w: 12 }, { value: 3, w: 10 },
          { value: 5, w: 9 }, { value: 8, w: 8 }, { value: 12, w: 7 }, { value: 20, w: 4 },
        ]);
        const startDay = rGen.int(1, durationDays > 8 ? 8 : 24);
        const startDate = new Date(year, month - 1, startDay);
        const endDate = addDays(startDate, durationDays - 1);
        const start = iso(startDate), end = iso(endDate);

        // ② 업무 내용(자기작성 1인칭 서술)
        const detail = rGen.pick(DETAIL).replace("{n}", String(rGen.int(2, 34)));
        const summary = `${specific ? `${dt.label} 업무로 ` : ""}${title} 관련 업무를 수행함. ${detail}`;

        // ③ 증빙자료: 1~2건(유형 + 구체 문서명)
        const nEv = rGen.weighted([{ value: 1, w: 62 }, { value: 2, w: 38 }]);
        const evTypes = rGen.sample(EVIDENCE_TYPES, nEv);
        const evidences = evTypes.map((t: string) => ({ type: t, doc: evidenceDoc(rGen, t, category, year, month, half) }));

        // ⑤ 업무수행자: 본인 + 협업 0~2(같은 부서)
        const nCo = coworkers.length === 0 ? 0 : rGen.weighted([{ value: 0, w: 45 }, { value: 1, w: 38 }, { value: 2, w: 17 }]);
        const cos = rGen.sample(coworkers, Math.min(nCo, coworkers.length));
        const performers = [{ id: s.person_id, name: selfName, self: true }, ...cos.map((c: StaffRec) => ({ id: c.person_id, name: nameById.get(c.person_id) ?? "미상", self: false }))];

        // ⑥ 연결 KPI(부서 KPI) 또는 개인 MBO
        let kpi: { kind: string; mboGoal: string | null; code: string | null; name: string | null } | null = null;
        if (specific && dt.mbo.includes(category)) {
          const parent = rGen.pick(dt.kpis); // MBO → 상위 부서 KPI(BSC 캐스케이딩)
          kpi = { kind: "MBO", mboGoal: category, code: parent.code, name: parent.name };
        } else if (rGen.bool(0.68)) {
          const k = rGen.pick(dt.kpis);
          kpi = { kind: "KPI", mboGoal: null, code: k.code, name: k.name };
        }
        if (kpi) kpiLinked++;

        const attrs = JSON.stringify({
          date: start, month, summary, category, deptSpecific: specific,
          start, end, durationDays,
          evidences,
          ownerId: owner.id, ownerName: owner.name, ownerRole: owner.role, ownerRoleLabel: ROLE_LABEL[owner.role] ?? "책임자",
          performers,
          kpi,
        });
        ins.run(aid++, s.person_id, "N01", half, title, start, attrs);
        nRows++;
      }
    }
  }
  return { nRows, nStaff: staff.length, perHalfAvg: +(nRows / (staff.length * HALVES.length)).toFixed(1), deptSpecific, kpiLinked };
}
