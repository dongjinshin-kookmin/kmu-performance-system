import Link from "next/link";
import { getSession } from "@/lib/rbac";
import {
  canViewStaff, staffHeader, staffHalves, staffEval, staffAreas, staffTrend,
  staffPercentile, staffMbo, staffActivities, pickerStaff, STAFF_LATEST, staffRanks, staffFeedback, staffWorklog,
  allStaffIds,
} from "@/lib/queries";
import { Reveal, ArcGauge, GradeBadge, Meter, CountUp, Delta } from "@/components/ui";
import { TrendChart } from "@/components/charts";
import { RankWidget } from "@/components/RankWidget";
import { FeedbackSection } from "@/components/Feedback";
import { WorkCalendar } from "@/components/WorkCalendar";
import { StaffMbo, StaffActivities } from "@/components/StaffMbo";
import { PersonPicker } from "@/components/PersonPicker";
import { STAFF_AREA, DEPT_TYPE_LABEL } from "@/lib/colors";
import { IS_EXPORT } from "@/lib/runtime";

export function generateStaticParams() {
  return allStaffIds().map((id) => ({ id: String(id) }));
}

const FAMILY_LABEL: Record<string, string> = { GENERAL: "일반·기술직", FUNCTIONAL: "기능직" };
const AREA_COLOR: Record<string, string> = {
  WORK: "var(--area-R)", ATTITUDE: "var(--area-E)", JOB_COMP: "var(--area-S)", LEADERSHIP: "var(--area-I)", DEPT_SVC: "var(--grade-S)",
  COMMON_COMP: "var(--area-R)", JOB_BEHAV: "var(--area-S)",
};

export default async function StaffCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ half?: string }> }) {
  const id = Number((await params).id);
  // 정적 export에서는 searchParams를 읽으면 정적 렌더가 불가하므로 최신 반기 고정.
  const half = IS_EXPORT ? STAFF_LATEST : (Number((await searchParams).half) || STAFF_LATEST);
  const s = await getSession();
  const h = staffHeader(id);
  if (!h) return <Denied reason="존재하지 않는 직원입니다." />;
  const perm = canViewStaff(s, id);
  if (!perm.ok) return <Denied reason={perm.reason} />;

  const ev = staffEval(id, half);
  if (!ev) return <Denied reason="해당 반기 평가가 없습니다." />;
  const areas = staffAreas(id, half);
  const trend = staffTrend(id).map((t: any) => ({ year: `${Math.floor(t.half / 10)}-${t.half % 10}`, score: t.score, grade: t.grade }));
  const pctl = staffPercentile(id, half);
  const halves = staffHalves();
  const gradeColor = `var(--grade-${ev.rel})`;
  const rankItems = staffRanks(id, half).map((r) => ({
    ...r,
    label: r.key === "ALL" ? "종합" : (STAFF_AREA[r.key]?.label ?? r.key),
    color: r.key === "ALL" ? "var(--accent)" : (AREA_COLOR[r.key] ?? "var(--accent)"),
  }));

  if (perm.masked) {
    return (
      <main className="wrap" style={{ padding: "2rem 0 4rem", maxWidth: 720 }}>
        <Reveal className="panel" style={{ padding: "2rem" }}>
          <div className="eyebrow">총장·기획처 뷰 · 개인 원점수 비노출</div>
          <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>{h.dept} 소속 직원 (익명)</h1>
          <div style={{ display: "flex", gap: 30, marginTop: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><GradeBadge grade={ev.rel} size="lg" /><div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>등급</div></div>
            <div><div className="eyebrow">부서 백분위</div><div className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}><CountUp value={pctl.dept} suffix="%ile" /></div></div>
            <div><div className="eyebrow">전체 백분위</div><div className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}><CountUp value={pctl.all} suffix="%ile" /></div></div>
          </div>
        </Reveal>
      </main>
    );
  }

  const mbo = staffMbo(id, half);
  const acts = staffActivities(id, half);
  const fb = staffFeedback(id, half);
  const worklog = staffWorklog(id, half);
  const halfYear = Math.floor(half / 10);
  const isFunc = h.familyTop === "FUNCTIONAL";
  const picker = pickerStaff(s);

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      {picker.enabled && (
        <div style={{ marginBottom: 16 }}>
          <PersonPicker tree={picker.tree} currentId={id} base="/staff" l1Label="부서유형" l2Label="부서" l1Names={DEPT_TYPE_LABEL} accent="var(--area-I)" />
        </div>
      )}
      <Reveal>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">{h.dept} · {DEPT_TYPE_LABEL[h.deptType] ?? ""} · {h.code}</div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 8px" }}>{h.name}</h1>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span className="chip">{h.grade}</span>
              <span className="chip">{FAMILY_LABEL[h.familyTop]}</span>
              <span className="chip">근속 {h.tenure}년</span>
              {h.mgrRole && <span className="chip" style={{ color: "var(--area-I)", borderColor: "var(--area-I)" }}>{h.mgrRole === "DEPT_HEAD" ? "부서장" : "팀장"}</span>}
              <span className="chip">{h.evalType === "CONTRACT" ? "성과계약" : "근무성적"}</span>
            </div>
          </div>
          {/* 반기 선택 */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {halves.slice(0, 6).reverse().map((hh: any) => (
              <Link key={hh.id} href={`/staff/${id}?half=${hh.id}`} className="chip" style={{ cursor: "pointer", fontWeight: hh.id === half ? 700 : 500, background: hh.id === half ? "var(--accent-soft)" : "transparent", borderColor: hh.id === half ? "var(--accent)" : "var(--border-strong)", color: hh.id === half ? "var(--accent)" : "var(--text-2)" }}>
                {hh.year}-{hh.half}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 종합 게이지 + 내 위치(랭킹) */}
      <section style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, margin: "26px 0", alignItems: "stretch" }}>
        <Reveal className="panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <ArcGauge value={ev.rawTotal} max={ev.scale} displayMax={ev.scale} color={gradeColor} grade={ev.rel} size={210} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: -2 }}>
            <GradeBadge grade={ev.rel} size="lg" />
            <div style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.35 }}>
              {isFunc ? "기능직 200점" : "정기평가 90점"} 체계<br />강제배분 등급 <b>{ev.rel}</b> · 정규화 <span className="mono">{ev.comp}</span>/100
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12, width: "100%", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: "1.4rem", fontWeight: 800 }}><CountUp value={Math.max(1, 100 - pctl.dept)} prefix="상위 " suffix="%" /></div><div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>부서</div></div>
            <div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: "1.4rem", fontWeight: 800 }}><CountUp value={ev.mbo} suffix="%" /></div><div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>MBO 달성률</div></div>
          </div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.3rem 1.5rem" }} delay={0.08}>
          <RankWidget items={rankItems} scope1Label="부서" scope2Label="전체" />
        </Reveal>
      </section>

      {/* 반기별 추이 */}
      <Reveal className="panel" style={{ padding: "1.3rem 1.4rem", marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 210px", gap: 26, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">반기별 추이 · 연도 구분 · 최근 2개 반기 음영</div>
            <h2 style={{ fontSize: "1.1rem", margin: "4px 0 8px" }}>종합점수 변화</h2>
            <TrendChart data={trend.map((t: any) => ({ x: t.year, score: t.score, grade: t.grade }))} shade={2} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
            {(() => {
              const last = trend[trend.length - 1], prev = trend[trend.length - 2];
              const peak = trend.reduce((m: any, t: any) => (t.score > m.score ? t : m), trend[0]);
              const d = prev ? +(last.score - prev.score).toFixed(1) : 0;
              return (<>
                <TrendStat label="최근 점수" value={`${last.score}`} sub={`${last.year} · ${last.grade}등급`} />
                <TrendStat label="전기 대비" value={<Delta value={d} />} sub={prev ? `${prev.score} → ${last.score}` : "기준반기"} />
                <TrendStat label="최고 점수" value={`${peak.score}`} sub={`${peak.year}`} />
              </>);
            })()}
          </div>
        </div>
      </Reveal>

      {/* 영역 프로파일 + 가·감점 — 한 줄 절반씩 (2열, 좁으면 세로 스택) */}
      <section className="split-2">
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }} delay={0.04}>
        <div className="eyebrow">{isFunc ? "기능직 역량 (200점 체계)" : "정기평가 5영역 (90점 체계)"}</div>
        <h2 style={{ fontSize: "1.15rem", margin: "4px 0 14px" }}>{isFunc ? "직무역량 영역 프로파일" : "근무실적·태도·역량·리더십·서비스"}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px 32px" }}>
          {areas.map((a: any) => {
            const meta = STAFF_AREA[a.area];
            const color = AREA_COLOR[a.area] ?? "var(--accent)";
            return (
              <div key={a.area}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />{meta?.label ?? a.area}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    <span className="mono" style={{ color: "var(--text)", fontWeight: 700 }}>{a.raw}</span><span style={{ color: "var(--border-strong)" }}> / {a.max}점</span> · <span className="mono" style={{ color: "var(--text-2)" }}>{Math.round(a.norm)}%</span>
                  </span>
                </div>
                <Meter value={a.norm} max={100} color={color} height={9} />
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* 가·감점 · 조정 */}
      <Reveal className="panel" style={{ padding: "1.2rem 1.4rem" }} delay={0.06}>
        <div className="eyebrow">가·감점 · 조정</div>
        <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>공정성 장치</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 24px" }}>
          <KV label="가점 (부서·개인·포상)" value={`+${ev.gain?.toFixed(1) ?? 0}`} color="var(--ok)" />
          <KV label="징계 감점" value={ev.penalty ? `−${ev.penalty.toFixed(1)}` : "0"} color={ev.penalty ? "var(--bad)" : "var(--muted)"} />
          <KV label="부서 서비스성과" value={`${ev.service?.toFixed(1)} / 5`} />
          <KV label="조정계수 (관대화 완화)" value={`×${ev.adj}`} />
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 12 }}>극단값 5% 절사 + 평가집단별 조정계수 적용 (🟦확정 방식 · 🟨계수 가정)</p>
      </Reveal>
      </section>

      {/* 동료평가 360° (블라인드 다면평가) */}
      {fb.enabled && (
        <Reveal className="panel" style={{ padding: "1.4rem 1.5rem", marginBottom: 22, borderColor: "var(--area-I)" }} delay={0.04}>
          <FeedbackSection fb={fb} />
        </Reveal>
      )}

      {/* MBO 목표 */}
      <div id="mbo-goals" style={{ scrollMarginTop: 80 }} />
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
          <div><div className="eyebrow">🟩제안 · MBO 목표관리 · 부서 KPI 캐스케이딩</div>
            <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>반기 목표 달성 현황</h2></div>
          <span className="mono chip">평균 달성률 {ev.mbo}%</span>
        </div>
        <StaffMbo goals={mbo} />
      </Reveal>

      {/* 반기 수행 업무 (자기작성 업무일지 · 카드) */}
      {worklog.length > 0 && (
        <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", marginBottom: 20 }} delay={0.04}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <div>
              <div className="eyebrow">반기 수행 업무 · 자기작성 업무일지</div>
              <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>{halfYear}-{half % 10} 반기 수행 업무</h2>
            </div>
            <span className="mono chip">수행 기간 · 책임자 · 수행자 · 증빙 · KPI</span>
          </div>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "6px 0 16px", lineHeight: 1.6 }}>선택 반기 동안 본인이 스스로 작성한 업무 실적을 카드로 나열합니다. 각 카드는 수행 기간·업무책임자(부서장/팀장)·업무수행자·증빙 문서·연결 KPI를 담고 있으며, 카드를 펼치면 자기작성 수행 내용 전문을 볼 수 있습니다.</p>
          <WorkCalendar items={worklog} year={halfYear} staffId={id} half={half} />
        </Reveal>
      )}

      {/* 기타 실적 드릴다운 */}
      {acts.filter((a: any) => a.type !== "MBO" && a.type !== "SELF_REPORT").length > 0 && (
        <Reveal className="panel" style={{ padding: "1.5rem 1.6rem" }}>
          <div className="eyebrow">실적 상세 · 드릴다운</div>
          <h2 style={{ fontSize: "1.1rem", margin: "4px 0 16px" }}>교육·포상·혁신·서비스 평가</h2>
          <StaffActivities acts={acts.filter((a: any) => a.type !== "MBO" && a.type !== "SELF_REPORT")} />
        </Reveal>
      )}
    </main>
  );
}

function KV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{label}</div>
      <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}

function TrendStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: "0.64rem", marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Denied({ reason }: { reason?: string }) {
  return (
    <main className="wrap" style={{ padding: "4rem 0" }}>
      <div className="panel" style={{ padding: "3rem", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: "2rem" }}>🔒</div>
        <h1 style={{ fontSize: "1.3rem", margin: "12px 0 6px" }}>접근 권한이 없습니다</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{reason ?? "현재 역할의 접근 범위를 벗어났습니다."}</p>
        <Link href="/units" className="chip" style={{ marginTop: 16, display: "inline-flex", cursor: "pointer" }}>부서 KPI로 이동</Link>
      </div>
    </main>
  );
}
