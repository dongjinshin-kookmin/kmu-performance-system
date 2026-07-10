import Link from "next/link";
import { getSession } from "@/lib/rbac";
import {
  canViewPerson, facultyHeader, facultyEval, facultyAreas, facultyTrend,
  compositePercentile, bonusBreakdown, facultyIndicatorSummary, drilldown, pickerFaculty,
  facultyRanks, facultyScoreMax, allFacultyIds,
} from "@/lib/queries";
import { Reveal, ArcGauge, GradeBadge, Meter, CountUp, Delta } from "@/components/ui";
import { AreaRadar, TrendChart } from "@/components/charts";
import { RankWidget } from "@/components/RankWidget";
import { PerformanceBreakdown, DrillItem } from "@/components/Drilldown";
import { PersonPicker } from "@/components/PersonPicker";
import { AREA, AreaKey } from "@/lib/colors";
import { TRACK_LABEL, VERSION_LABEL } from "@/lib/format";

export function generateStaticParams() {
  return allFacultyIds().map((id) => ({ id: String(id) }));
}

export default async function FacultyCard({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const s = await getSession();
  const perm = canViewPerson(s, id);
  const h = facultyHeader(id);
  if (!h) return <Denied reason="존재하지 않는 교원입니다." />;
  if (!perm.ok) return <Denied reason={perm.reason} />;

  const ev = facultyEval(id);
  const areas = facultyAreas(id);
  const trend = facultyTrend(id);
  const pctl = compositePercentile(id);
  const total = +(ev.comp + ev.bonus).toFixed(1);
  const gradeColor = `var(--grade-${ev.rel})`;
  const scoreMax = facultyScoreMax();
  const RANK_META: Record<string, { label: string; color: string }> = {
    ALL: { label: "종합", color: "var(--accent)" },
    R: { label: AREA.R.full, color: "var(--area-R)" }, E: { label: AREA.E.full, color: "var(--area-E)" },
    I: { label: AREA.I.full, color: "var(--area-I)" }, S: { label: AREA.S.full, color: "var(--area-S)" },
  };
  const rankItems = facultyRanks(id).map((r) => ({ ...r, ...RANK_META[r.key] }));

  // 마스킹(총장): 집계·백분위만
  if (perm.masked) {
    return (
      <main className="wrap" style={{ padding: "2rem 0 4rem", maxWidth: 720 }}>
        <Reveal className="panel" style={{ padding: "2rem" }}>
          <div className="eyebrow">총장·기획처 뷰 · 개인 원점수 비노출</div>
          <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>{h.dept} 소속 교원 (익명)</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>개인 식별·원점수는 마스킹되며 백분위 집계만 제공됩니다.</p>
          <div style={{ display: "flex", gap: 30, marginTop: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><GradeBadge grade={ev.rel} size="lg" /><div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>등급</div></div>
            <div><div className="eyebrow">계열그룹 백분위</div><div className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}><CountUp value={pctl.group} suffix="%ile" /></div></div>
            <div><div className="eyebrow">전체 백분위</div><div className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}><CountUp value={pctl.univ} suffix="%ile" /></div></div>
          </div>
        </Reveal>
      </main>
    );
  }

  // 드릴다운 데이터 (핵심 5 지표)
  const inds = facultyIndicatorSummary(id).map((r: any) => ({ ind: r.ind, name: r.name, area: r.area, conv: +r.conv.toFixed(1), cnt: r.cnt }));
  const drill: Record<string, DrillItem[]> = {};
  for (const ind of ["R01", "R04", "I01", "R11", "E01"]) {
    const d = drilldown(id, ind);
    if (d.items.length) drill[ind] = d.items;
  }
  const bonus = bonusBreakdown(id);
  const isV2024 = h.version === "V_2024" && ev.gatePass !== null;
  const picker = pickerFaculty(s);

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      {picker.enabled && (
        <div style={{ marginBottom: 16 }}>
          <PersonPicker tree={picker.tree} currentId={id} base="/faculty" l1Label="단과대학" l2Label="학과" accent="var(--area-R)" />
        </div>
      )}
      {/* Hero */}
      <Reveal>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <div>
            <div className="eyebrow">{h.dept} · {h.code}</div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 8px" }}>{h.name}</h1>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span className="chip">{h.rank}</span>
              <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>{TRACK_LABEL[h.track]} 트랙</span>
              <span className="chip">{VERSION_LABEL[h.version]}</span>
              {h.tenure ? <span className="chip">정년보장</span> : null}
              {h.adminPost ? <span className="chip" style={{ color: "var(--area-S)", borderColor: "var(--area-S)" }}>보직</span> : null}
            </div>
          </div>
          <Link href="/departments" className="chip" style={{ cursor: "pointer" }}>← 학과 비교로</Link>
        </div>
      </Reveal>

      {/* 종합 게이지 + 내 위치(랭킹) */}
      <section style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, margin: "26px 0", alignItems: "stretch" }}>
        <Reveal className="panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <ArcGauge value={total} max={scoreMax.base} displayMax={scoreMax.base} color={gradeColor} grade={ev.rel} size={210} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: -2 }}>
            <GradeBadge grade={ev.rel} size="lg" />
            <div style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.35 }}>
              트랙·계열 기준환산 <b>{scoreMax.base}점</b> 만점<br />가점 <span className="mono" style={{ color: "var(--ok)" }}>+{ev.bonus.toFixed(1)}</span> 포함 · 상한 {scoreMax.bonusCap.toFixed(0)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12, width: "100%", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: "1.4rem", fontWeight: 800 }}><CountUp value={Math.max(1, 100 - pctl.group)} prefix="상위 " suffix="%" /></div><div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>계열그룹</div></div>
            <div style={{ textAlign: "center" }}><div className="mono" style={{ fontSize: "1.4rem", fontWeight: 800 }}><CountUp value={Math.max(1, 100 - pctl.univ)} prefix="상위 " suffix="%" /></div><div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>전체</div></div>
          </div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.3rem 1.5rem" }} delay={0.08}>
          <RankWidget items={rankItems} scope1Label="학과" scope2Label="전체" />
        </Reveal>
      </section>

      {/* 추이 (5개년) */}
      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 210px", gap: 26, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">5개년 추이 · 연도 구분 · 최근 구간 음영</div>
            <h2 style={{ fontSize: "1.1rem", margin: "4px 0 8px" }}>종합점수 변화</h2>
            <TrendChart data={trend.map((t: any) => ({ x: String(t.year), score: t.score, grade: t.grade }))} shade={2} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
            {(() => {
              const last = trend[trend.length - 1], prev = trend[trend.length - 2];
              const peak = trend.reduce((m: any, t: any) => (t.score > m.score ? t : m), trend[0]);
              const d = prev ? +(last.score - prev.score).toFixed(1) : 0;
              return (<>
                <TrendStat label="최근 점수" value={`${last.score}`} sub={`${last.year}년 · ${last.grade}등급`} />
                <TrendStat label="전년 대비" value={<Delta value={d} />} sub={prev ? `${prev.score} → ${last.score}` : "기준연도"} />
                <TrendStat label="최고 점수" value={`${peak.score}`} sub={`${peak.year}년`} />
              </>);
            })()}
          </div>
        </div>
      </Reveal>

      {/* 영역 프로파일 + 신설지표 가점 — 한 줄 절반씩 (2열, 좁으면 세로 스택) */}
      <section className="split-2">
        <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }} delay={0.04}>
          <div className="eyebrow">영역 프로파일 · 연구·교육·산학·봉사</div>
          <h2 style={{ fontSize: "1.15rem", margin: "4px 0 12px" }}>4영역 표준화 프로파일</h2>
          <div style={{ maxWidth: 250, margin: "0 auto 10px" }}><AreaRadar areas={areas} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {(["R", "E", "I", "S"] as AreaKey[]).map((a) => {
              const row = areas.find((x) => x.area === a)!;
              const color = `var(--area-${a})`;
              return (
                <div key={a}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />{AREA[a].full}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      표준화 <span className="mono" style={{ color: "var(--text)", fontWeight: 700 }}>{row.std.toFixed(0)}</span><span style={{ color: "var(--border-strong)" }}>/100</span>
                    </span>
                  </div>
                  <Meter value={row.std} max={120} color={color} height={9} />
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>원점수 <span className="mono" style={{ color: "var(--text-2)" }}>{row.raw.toFixed(0)}</span> · 가중 {row.weight}% · 학과 <span className="mono" style={{ color: "var(--text-2)" }}>{row.pct}%ile</span></div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.06}>
          <div className="eyebrow">신설지표 가점 (최대 +5)</div>
          <h2 style={{ fontSize: "1.15rem", margin: "4px 0 14px" }}>가점 <span className="mono" style={{ color: "var(--ok)" }}>+{ev.bonus.toFixed(1)}</span></h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bonus.map((b: any) => (
              <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="mono chip" style={{ fontSize: "0.6rem" }}>{b.key}</span>
                <span style={{ fontSize: "0.78rem", width: 68, flexShrink: 0 }}>{b.label}</span>
                <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)", width: 46, flexShrink: 0 }}>{b.metric}</span>
                <div style={{ flex: 1, minWidth: 40 }}><Meter value={b.pts} max={1.5} color="var(--grade-S)" height={6} /></div>
                <span className="mono" style={{ fontSize: "0.76rem", fontWeight: 600, width: 40, textAlign: "right", flexShrink: 0, color: b.pts > 0 ? "var(--ok)" : "var(--muted)" }}>+{b.pts.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 2024 신임 게이트 (V_2024만) — 전폭 */}
      {isV2024 && (
        <Reveal className="panel" style={{ padding: "1.2rem 1.4rem", marginBottom: 22, borderColor: ev.gatePass ? "var(--ok)" : "var(--warn)" }} delay={0.1}>
          <div className="eyebrow">[현행] 질적 필수요건 · Moving Target</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>2024 신임 게이트</h2>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(240px, 1.4fr)", gap: 24, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>{ev.gatePass ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: ev.gatePass ? "var(--ok)" : "var(--warn)" }}>{ev.gatePass ? "충족" : "미충족"}</div>
                <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>근거: {ev.gateBasis === "IF" ? "IF 백분위 편수" : ev.gateBasis === "MT" ? "Moving Target ≥150%" : "미충족"}</div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginBottom: 4 }}><span>MT 달성률</span><span className="mono" style={{ fontWeight: 700 }}>{ev.mtRate}%</span></div>
              <div style={{ position: "relative" }}>
                <Meter value={ev.mtRate} max={200} color={ev.mtRate >= 150 ? "var(--ok)" : "var(--warn)"} height={8} />
                <div style={{ position: "absolute", top: -2, left: "75%", width: 2, height: 12, background: "var(--text-2)" }} title="통과선 150%" />
              </div>
              <div style={{ fontSize: "0.64rem", color: "var(--muted)", marginTop: 3 }}>통과선 150% · 점수와 독립된 pass/fail 축</div>
            </div>
          </div>
        </Reveal>
      )}

      {/* 실적 드릴다운 */}
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div><div className="eyebrow">실적 드릴다운 · 클릭하여 개별 근거 확인</div>
            <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>2025년 실적 · 산식 투명성</h2></div>
          <span className="mono chip">논문·연구비·특허·강의·실기 = 개별 산출근거 제공</span>
        </div>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", margin: "6px 0 18px", lineHeight: 1.6 }}>
          각 지표의 환산합을 클릭하면 실적 목록이, 실적을 클릭하면 &ldquo;계단배점 × 저자환산 = 점수&rdquo; 형태의 산출 근거가 펼쳐집니다.
        </p>
        <PerformanceBreakdown rows={inds} drill={drill} />
      </Reveal>
    </main>
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
        <Link href="/dashboard" className="chip" style={{ marginTop: 16, display: "inline-flex", cursor: "pointer" }}>대시보드로 이동</Link>
      </div>
    </main>
  );
}
