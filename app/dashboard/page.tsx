import Link from "next/link";
import { instituteKpis, trendByYear, groupCompare, collegeCompare, gradeDist, disclosure, staffInstituteSummary } from "@/lib/queries";
import { StatTile, Reveal, Meter, CountUp } from "@/components/ui";
import { TrendLine, GroupBars, GradeStack } from "@/components/charts";
import { GROUP_LABEL } from "@/lib/colors";
import { won } from "@/lib/format";
import { getSession } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const s = await getSession();
  const k = instituteKpis();
  const trend = trendByYear();
  const groups = groupCompare().map((g: any) => ({ grp: g.grp, label: GROUP_LABEL[g.grp] ?? g.grp, score: g.score, n: g.n }));
  const colleges = collegeCompare();
  const dist = gradeDist();
  const disc = disclosure();
  const staff = staffInstituteSummary();
  const prevScore = trend.length > 1 ? trend[trend.length - 2].score : k.avgScore;

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <div className="eyebrow">2025 평가 사이클 · 기관 성과</div>
            <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 0" }}>총괄 대시보드</h1>
          </div>
          <div className="chip mono">{s.role === "PRESIDENT" ? "총장·기획처 뷰 · 집계·백분위" : "인사팀 뷰 · 전사"}</div>
        </div>
      </Reveal>

      {/* KPI */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="전임교원" value={k.facN} suffix="명" accent="var(--accent)" delay={0} />
        <StatTile label="평균 종합점수" value={k.avgScore} decimals={1} accent="var(--area-R)" delay={0.05}
          sub={<span>전년 {prevScore} 대비 <b style={{ color: k.avgScore >= prevScore ? "var(--ok)" : "var(--bad)" }}>{k.avgScore >= prevScore ? "▲" : "▼"} {Math.abs(k.avgScore - prevScore).toFixed(1)}</b></span>} />
        <StatTile label="SCI급 논문 (2025)" value={k.sciN} suffix="편" accent="var(--area-R)" delay={0.1} sub={`1인당 ${(k.sciN / k.facN).toFixed(2)}편`} />
        <StatTile label="연구비 총 수주" value={Math.round(k.fund / 1e8)} suffix="억" accent="var(--area-I)" delay={0.15} sub={`${won(k.fund)}원`} />
        <StatTile label="특허 등록 (누적)" value={k.patents} suffix="건" accent="var(--area-I)" delay={0.2} />
        <StatTile label="S·A 등급 비율" value={k.saRatio * 100} decimals={1} suffix="%" accent="var(--grade-S)" delay={0.25} sub={`Gate 충족 ${k.gatePass}/${k.gateN} (V_2024)`} />
      </section>

      {/* 추이 + 공시 */}
      <section style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14, marginBottom: 18 }}>
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div><div className="eyebrow">연도별 추이</div><h2 style={{ fontSize: "1.05rem", margin: "4px 0 0" }}>종합점수 5개년</h2></div>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>2021 → 2025</span>
          </div>
          <div style={{ marginTop: 10 }}><TrendLine data={trend} /></div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.08}>
          <div className="eyebrow">대학알리미 공시 대조</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>우리대학 vs 동종 평균</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {disc.slice(0, 5).map((d: any) => {
              const max = Math.max(d.our, d.peer) * 1.05 || 1;
              const label = d.unit === "원" ? won(d.our) : `${d.our}${d.unit}`;
              return (
                <div key={d.code}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: 5 }}>
                    <span style={{ color: "var(--text-2)" }}>{d.name}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{label} <span style={{ color: d.our >= d.peer ? "var(--ok)" : "var(--warn)" }}>{d.our >= d.peer ? "▲" : "▽"}</span></span>
                  </div>
                  <Meter value={d.our} max={max} color="var(--area-R)" height={7} />
                  <div style={{ marginTop: 3 }}><Meter value={d.peer} max={max} color="var(--border-strong)" height={4} /></div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 14, fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
              <span>■ 우리대학</span><span style={{ color: "var(--border-strong)" }}>■ 동종 평균</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 그룹 비교 + 등급분포 */}
      <section style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14, marginBottom: 18 }}>
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }}>
          <div className="eyebrow">계열그룹 비교</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>그룹별 평균 종합점수</h2>
          <GroupBars data={groups} />
        </Reveal>
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.08}>
          <div className="eyebrow">등급 분포</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 16px" }}>전체 교원 <CountUp value={Object.values(dist).reduce((a, b) => a + b, 0)} className="mono" />명</h2>
          <GradeStack dist={dist} height={40} />
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 16, lineHeight: 1.6 }}>
            절대컷(S≥95·A≥85·B≥70·C≥60) 1차 후, 계열그룹 코호트에 상대상한(S≤10%·S+A≤35%·D≤5%)을 병기 적용한 결과입니다.
          </p>
        </Reveal>
      </section>

      {/* 직원 성과 요약 (교수/직원 통합 기관 뷰) */}
      <Reveal className="panel" style={{ padding: "1.3rem 1.4rem", marginBottom: 18, borderColor: "var(--area-I)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div><div className="eyebrow" style={{ color: "var(--area-I)" }}>직원 성과 · 2025-2학기 반기</div>
            <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>행정직 성과 요약</h2></div>
          <Link href="/units" className="chip" style={{ cursor: "pointer", borderColor: "var(--area-I)", color: "var(--area-I)" }}>부서 KPI 대시보드 →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.4fr", gap: 18, marginTop: 14, alignItems: "center" }}>
          <Metric label="직원" value={staff.n} suffix="명" />
          <Metric label="평균 종합점수" value={staff.avg} decimals={1} />
          <Metric label="MBO 평균 달성률" value={staff.mbo} suffix="%" />
          <Metric label="부서 KPI 평균" value={staff.kpi} suffix="%" />
          <div><div className="eyebrow" style={{ fontSize: "0.6rem", marginBottom: 6 }}>등급 분포 (강제배분 S20/D10)</div><GradeStack dist={staff.dist} height={26} /></div>
        </div>
      </Reveal>

      {/* 단과대 랭킹 */}
      <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }}>
        <div className="eyebrow">단과대 비교</div>
        <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>단과대학 평균 종합점수 랭킹</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px 22px" }}>
          {colleges.map((c: any, i: number) => {
            const max = colleges[0].score;
            return (
              <div key={c.college} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ width: 20, color: "var(--muted)", fontSize: "0.8rem" }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 3 }}>
                    <span>{c.college}</span><span className="mono" style={{ fontWeight: 600 }}>{c.score} <span style={{ color: "var(--muted)" }}>·{c.n}명</span></span>
                  </div>
                  <Meter value={c.score - 70} max={max - 70} color={i < 3 ? "var(--area-R)" : "var(--border-strong)"} height={6} />
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </main>
  );
}

function Metric({ label, value, decimals = 0, suffix = "" }: { label: string; value: number; decimals?: number; suffix?: string }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: "0.6rem", marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
    </div>
  );
}
