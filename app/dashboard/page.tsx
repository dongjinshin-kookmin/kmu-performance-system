import Link from "next/link";
import { instituteKpis, trendByYear, groupCompare, collegeCompare, gradeDist, disclosure, staffInstituteSummary } from "@/lib/queries";
import { StatTile, Reveal, Meter, CountUp } from "@/components/ui";
import { TrendLine, GroupBars, GradeStack } from "@/components/charts";
import { GROUP_LABEL } from "@/lib/colors";
import { won } from "@/lib/format";
import { getSession } from "@/lib/rbac";

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
  const totalFaculty = Object.values(dist).reduce((a, b) => a + b, 0);
  const scoreDelta = k.avgScore - prevScore;

  return (
    <main className="wrap dashboard-page">
      <Reveal>
        <header className="dashboard-header">
          <div>
            <div className="dashboard-kicker"><span />2025 성과평가 · 기관 통합 현황</div>
            <h1>성과 대시보드</h1>
            <p>교원과 직원의 핵심 성과를 한눈에 확인하고, 필요한 업무로 바로 이동하세요.</p>
          </div>
          <div className="dashboard-actions">
            <span className="view-chip">{s.role === "PRESIDENT" ? "총장·기획처 통합 뷰" : "인사팀 전사 뷰"}</span>
            <Link href="/workflow" className="primary-action">평가 업무 확인 <span>→</span></Link>
          </div>
        </header>
      </Reveal>

      <section className="kpi-grid" aria-label="핵심 성과 지표">
        <StatTile label="전임교원" value={k.facN} suffix="명" accent="var(--accent)" delay={0} sub="평가 대상 전체 인원" />
        <StatTile label="평균 종합점수" value={k.avgScore} decimals={1} suffix="점" accent="var(--area-R)" delay={0.05}
          sub={<span>전년보다 <b className={scoreDelta >= 0 ? "positive" : "negative"}>{scoreDelta >= 0 ? "↑" : "↓"} {Math.abs(scoreDelta).toFixed(1)}점</b></span>} />
        <StatTile label="SCI급 논문" value={k.sciN} suffix="편" accent="var(--area-E)" delay={0.1} sub={`교원 1인당 ${(k.sciN / k.facN).toFixed(2)}편`} />
        <StatTile label="연구비 총 수주" value={Math.round(k.fund / 1e8)} suffix="억원" accent="var(--area-I)" delay={0.15} sub={`${won(k.fund)}원`} />
      </section>

      <section className="dashboard-grid dashboard-grid-primary">
        <Reveal className="panel dashboard-card trend-card">
          <SectionHeader eyebrow="연도별 성과 추이" title="종합점수 5개년 변화" aside="2021 — 2025" />
          <div className="trend-summary">
            <div><span>2025 종합점수</span><strong className="mono">{k.avgScore.toFixed(1)}</strong></div>
            <div className={scoreDelta >= 0 ? "positive" : "negative"}>{scoreDelta >= 0 ? "↑" : "↓"} 전년 대비 {Math.abs(scoreDelta).toFixed(1)}점</div>
          </div>
          <div className="chart-space"><TrendLine data={trend} /></div>
        </Reveal>

        <Reveal className="panel dashboard-card cycle-card" delay={0.08}>
          <SectionHeader eyebrow="2025 평가 사이클" title="평가 진행 현황" />
          <div className="cycle-overview">
            <div className="progress-ring" style={{ "--progress": `${Math.round(k.saRatio * 100)}%` } as React.CSSProperties}>
              <div><strong className="mono"><CountUp value={k.saRatio * 100} decimals={1} suffix="%" /></strong><span>S·A 등급</span></div>
            </div>
            <div className="cycle-facts">
              <div><span>평가 대상</span><strong className="mono">{totalFaculty}명</strong></div>
              <div><span>Gate 충족</span><strong className="mono">{k.gatePass} / {k.gateN}</strong></div>
              <div><span>특허 등록</span><strong className="mono">{k.patents}건</strong></div>
            </div>
          </div>
          <div className="grade-summary">
            <span>전체 등급 분포</span>
            <GradeStack dist={dist} height={20} />
          </div>
          <Link href="/workflow" className="text-action">상세 평가 현황 보기 <span>→</span></Link>
        </Reveal>
      </section>

      <section className="dashboard-grid dashboard-grid-secondary">
        <Reveal className="panel dashboard-card">
          <SectionHeader eyebrow="계열그룹 비교" title="그룹별 평균 종합점수" aside={`${groups.length}개 그룹`} />
          <div className="chart-space"><GroupBars data={groups} /></div>
        </Reveal>

        <Reveal id="disclosure" className="panel dashboard-card" delay={0.08}>
          <SectionHeader eyebrow="대학알리미 공시 대조" title="우리 대학과 동종 대학 비교" aside="최근 공시 기준" />
          <div className="disclosure-list">
            {disc.slice(0, 5).map((d: any) => {
              const max = Math.max(d.our, d.peer) * 1.05 || 1;
              const label = d.unit === "원" ? won(d.our) : `${d.our}${d.unit}`;
              return (
                <div className="disclosure-item" key={d.code}>
                  <div><span>{d.name}</span><strong className="mono">{label} <em className={d.our >= d.peer ? "positive" : "negative"}>{d.our >= d.peer ? "↑" : "↓"}</em></strong></div>
                  <Meter value={d.our} max={max} color="var(--accent)" height={5} />
                  <div className="peer-meter"><Meter value={d.peer} max={max} color="var(--border-strong)" height={3} /></div>
                </div>
              );
            })}
          </div>
          <div className="chart-legend"><span className="ours" />우리 대학 <span className="peers" />동종 대학 평균</div>
        </Reveal>
      </section>

      <Reveal className="panel dashboard-card staff-card">
        <div className="staff-card-header">
          <SectionHeader eyebrow="직원 성과 · 2025년 2반기" title="행정직 성과 요약" />
          <Link href="/units" className="secondary-action">부서 KPI 대시보드 <span>→</span></Link>
        </div>
        <div className="staff-metrics">
          <Metric label="평가 직원" value={staff.n} suffix="명" />
          <Metric label="평균 종합점수" value={staff.avg} decimals={1} suffix="점" />
          <Metric label="MBO 평균 달성률" value={staff.mbo} suffix="%" />
          <Metric label="부서 KPI 평균" value={staff.kpi} suffix="%" />
          <div className="staff-grade"><span>직원 등급 분포</span><GradeStack dist={staff.dist} height={17} /></div>
        </div>
      </Reveal>

      <Reveal className="panel dashboard-card college-card">
        <SectionHeader eyebrow="단과대 비교" title="단과대학 평균 종합점수 순위" aside={`${colleges.length}개 단과대학`} />
        <div className="college-list">
          {colleges.map((c: any, i: number) => {
            const max = colleges[0].score;
            return (
              <div className="college-row" key={c.college}>
                <span className={`rank-number ${i < 3 ? "top" : ""}`}>{i + 1}</span>
                <div className="college-result">
                  <div><span>{c.college}</span><strong className="mono">{c.score.toFixed(1)}점 <small>· {c.n}명</small></strong></div>
                  <Meter value={c.score - 70} max={max - 70} color={i < 3 ? "var(--accent)" : "var(--border-strong)"} height={4} />
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </main>
  );
}

function SectionHeader({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: string }) {
  return (
    <div className="section-header">
      <div><span>{eyebrow}</span><h2>{title}</h2></div>
      {aside && <small className="mono">{aside}</small>}
    </div>
  );
}

function Metric({ label, value, decimals = 0, suffix = "" }: { label: string; value: number; decimals?: number; suffix?: string }) {
  return (
    <div className="staff-metric">
      <span>{label}</span>
      <strong className="mono"><CountUp value={value} decimals={decimals} suffix={suffix} /></strong>
    </div>
  );
}
