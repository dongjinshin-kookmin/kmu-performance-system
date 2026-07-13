"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from "recharts";
import { useTheme } from "./theme";
import { GradeBadge, Meter } from "./ui";
import { Spark } from "./charts";
import type { OverviewData, OPerson } from "@/lib/queries";

const AREA_META: Record<string, { label: string; color: string }> = {
  R: { label: "연구", color: "var(--area-R)" }, E: { label: "교육", color: "var(--area-E)" }, I: { label: "산학", color: "var(--area-I)" }, S: { label: "봉사", color: "var(--area-S)" },
  WORK: { label: "근무실적", color: "var(--area-R)" }, ATTITUDE: { label: "근무태도", color: "var(--area-E)" }, JOB_COMP: { label: "직무역량", color: "var(--area-S)" },
  LEADERSHIP: { label: "리더십", color: "var(--area-I)" }, DEPT_SVC: { label: "부서서비스", color: "var(--grade-S)" }, COMMON_COMP: { label: "공통역량", color: "var(--area-R)" }, JOB_BEHAV: { label: "직무행동", color: "var(--area-S)" },
};
// 사분면(성과 모멘텀 축): index 0 TL, 1 TR, 2 BL, 3 BR
// Y=현재 종합점수, X=성과 모멘텀(Δ). 우측=평균 이상 상승.
const QUADS = [
  { key: "TL", label: "안정적 고성과", sub: "고성과 · 상승폭 평균 이하", color: "var(--area-R)", pos: "insideTopLeft" as const },
  { key: "TR", label: "스타", sub: "고성과 · 상승", color: "var(--grade-S)", pos: "insideTopRight" as const },
  { key: "BL", label: "집중 관리", sub: "저성과 · 하락·정체", color: "var(--grade-D)", pos: "insideBottomLeft" as const },
  { key: "BR", label: "성장 유망", sub: "저성과 · 상승", color: "var(--warn)", pos: "insideBottomRight" as const },
];
type Filter = number | "top10" | null;

// 직급군 → 점 모양 (order 3 다이아몬드 · 2 사각 · 1 원)
function shapeNode(order: number, cx: number, cy: number, r: number, opts: any) {
  if (order >= 3) { const k = r * 1.18; return <path d={`M ${cx} ${cy - k} L ${cx + k} ${cy} L ${cx} ${cy + k} L ${cx - k} ${cy} Z`} {...opts} />; }
  if (order === 2) { const s = r * 0.92; return <rect x={cx - s} y={cy - s} width={2 * s} height={2 * s} rx={1.5} {...opts} />; }
  return <circle cx={cx} cy={cy} r={r} {...opts} />;
}
function ShapeIcon({ order, color, size = 11 }: { order: number; color: string; size?: number }) {
  const c = size / 2, r = size * 0.42;
  return <svg width={size} height={size} style={{ flex: "0 0 auto", display: "inline-block" }}>{shapeNode(order, c, c, r, { fill: color })}</svg>;
}

export function OverviewMap({ data, initialSel }: { data: OverviewData; initialSel?: number | null }) {
  const { isDark } = useTheme();
  const [selId, setSelId] = useState<number | null>(initialSel ?? null);
  const [filter, setFilter] = useState<Filter>(null);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const pick = (n: any) => setSelId(n?.id ?? n?.payload?.id ?? null);

  const sel = useMemo(() => data.people.find((p) => p.id === selId) ?? null, [data.people, selId]);
  const grid = isDark ? "#282c37" : "#e6e4dd", tick = isDark ? "#8b91a0" : "#8a909c";
  const ring = isDark ? "#1e222c" : "#ffffff";
  const TOP10 = isDark ? "#4f7bff" : "#1d4ed8"; // 상위 10% 진한 파랑 (우선순위 최상)

  // 상위 10% (종합점수 내림차순 랭크 컷 — 교원 60/직원 10 정확)
  const top10 = useMemo(() => {
    const k = Math.max(1, Math.round(data.people.length * 0.1));
    return new Set([...data.people].sort((a, b) => b.score - a.score).slice(0, k).map((p) => p.id));
  }, [data.people]);

  // X = 성과 모멘텀(Δ). Δ는 전년 대비 종합점수 변화로, 연도 간 지속성이 낮아(상관 ~0.1)
  // 소수 극단치(±100 이상)가 발생한다. 원시 min/max로 도메인을 잡으면 이 극단치가 축을
  // 늘려 다수 구성원이 중앙에 뭉쳐 보이므로(분산 붕괴), 5~95 백분위 기준의 견고한 도메인을
  // 쓰고 그 밖의 점은 경계로 클램프한다. 사분면 분류(quad)는 서버에서 실제 Δ로 이미 계산됨.
  const xs = [...data.people.map((p) => p.x)].sort((a, b) => a - b);
  const pctX = (q: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round((xs.length - 1) * q)))] ?? 0;
  let xLoR = Math.min(pctX(0.05), data.meanX), xHiR = Math.max(pctX(0.95), data.meanX);
  if (xHiR - xLoR < 2) { xLoR -= 1; xHiR += 1; } // 스프레드가 거의 없으면 최소 폭 확보
  const xpad = (xHiR - xLoR) * 0.06 + 0.6;
  const xMin = +(xLoR - xpad).toFixed(2), xMax = +(xHiR + xpad).toFixed(2);
  const clampX = (x: number) => Math.max(xLoR, Math.min(xHiR, x));
  const scores = data.people.map((p) => p.score);
  const yLo = Math.floor((Math.min(...scores) - 4) / 5) * 5, yHi = Math.ceil((Math.max(...scores) + 4) / 5) * 5;
  const dSign = (v: number) => `${v > 0 ? "+" : ""}${v}`;

  const pts = data.people.map((p) => ({ ...p, x: clampX(p.x), y: p.score }));
  const passTier = (p: OPerson) => tierFilter == null || p.tierKey === tierFilter;
  const passQuad = (p: OPerson) => filter == null ? true : filter === "top10" ? top10.has(p.id) : p.quad === filter;
  const visible = pts.filter((p) => passTier(p) && passQuad(p));
  const baseData = visible.filter((p) => !top10.has(p.id));
  const topData = visible.filter((p) => top10.has(p.id));

  // 커스텀 마크 — 색=사분면, 모양=직급, 상위10%는 진한 파랑·큰 점, 선택 시 링
  const baseDot = (props: any) => {
    const { cx, cy, payload } = props; if (cx == null || cy == null) return <g />;
    const on = payload.id === selId;
    return shapeNode(payload.tierOrder, cx, cy, on ? 7 : 4.6, { fill: QUADS[payload.quad].color, fillOpacity: on ? 1 : 0.5, stroke: on ? "var(--text)" : ring, strokeWidth: on ? 2.5 : 0.6, style: { cursor: "pointer" }, onClick: () => pick(payload) });
  };
  const topDot = (props: any) => {
    const { cx, cy, payload } = props; if (cx == null || cy == null) return <g />;
    const on = payload.id === selId;
    return shapeNode(payload.tierOrder, cx, cy, on ? 8.5 : 6.4, { fill: TOP10, fillOpacity: 1, stroke: on ? "var(--text)" : ring, strokeWidth: on ? 2.5 : 1.4, style: { cursor: "pointer" }, onClick: () => pick(payload) });
  };

  return (
    <div>
      {/* KPI 스트립 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Kpi label="대상 인원" value={`${data.kpi.n}`} unit="명" />
        <Kpi label="평균 종합점수" value={data.kpi.avg.toFixed(1)} unit={data.scoreBasis} />
        <button onClick={() => setFilter(filter === "top10" ? null : "top10")} className="panel"
          style={{ padding: "0.7rem 0.85rem", textAlign: "left", cursor: "pointer", borderColor: filter === "top10" ? TOP10 : "var(--border)", background: filter === "top10" ? `color-mix(in srgb, ${TOP10} 14%, var(--surface))` : "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: TOP10 }} /><span style={{ fontSize: "0.66rem", fontWeight: 700, color: TOP10 }}>상위 10%</span></div>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 2 }}>{top10.size}<span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 500 }}> 명</span></div>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>종합점수 상위</div>
        </button>
        {QUADS.map((q, i) => (
          <button key={q.key} onClick={() => setFilter(filter === i ? null : i)}
            className="panel" style={{ padding: "0.7rem 0.85rem", textAlign: "left", cursor: "pointer", borderColor: filter === i ? q.color : "var(--border)", background: filter === i ? `color-mix(in srgb, ${q.color} 12%, var(--surface))` : "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: q.color }} />
              <span style={{ fontSize: "0.66rem", fontWeight: 700, color: q.color }}>{q.label}</span>
            </div>
            <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 2 }}>{data.kpi.quad[i]}<span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 500 }}> 명</span></div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{q.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" }} className="ov-grid">
        {/* 성과 모멘텀 × 종합점수 사분면 산점도 (대형) */}
        <div className="panel" style={{ padding: "1.3rem 1.5rem 1.1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <div>
              <div className="eyebrow">성과 모멘텀 × 종합점수 · 점 클릭 → 세부</div>
              <h3 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>전 구성원 성과 맵 <span className="mono" style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>· {data.kpi.n}명</span></h3>
            </div>
            {filter != null && <button onClick={() => setFilter(null)} className="chip" style={{ cursor: "pointer", borderColor: filter === "top10" ? TOP10 : QUADS[filter].color, color: filter === "top10" ? TOP10 : QUADS[filter].color }}>
              {filter === "top10" ? "상위 10%" : QUADS[filter].label}만 표시 · 해제 ✕</button>}
          </div>

          {/* 직급 필터 칩 (점 모양 인코딩) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0 10px" }}>
            <button onClick={() => setTierFilter(null)} className="chip" style={{ cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, borderColor: tierFilter == null ? "var(--accent)" : "var(--border)", color: tierFilter == null ? "var(--accent)" : "var(--text-2)" }}>전체 {data.kpi.n}</button>
            {data.tiers.map((t) => (
              <button key={t.key} onClick={() => setTierFilter(tierFilter === t.key ? null : t.key)} className="chip"
                style={{ cursor: "pointer", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: 5, borderColor: tierFilter === t.key ? "var(--accent)" : "var(--border)", color: tierFilter === t.key ? "var(--accent)" : "var(--text-2)" }}>
                <ShapeIcon order={t.order} color={tierFilter === t.key ? "var(--accent)" : "var(--muted)"} />{t.label} <span className="mono" style={{ color: "var(--muted)" }}>{t.n}</span>
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={640}>
            <ScatterChart margin={{ top: 20, right: 24, bottom: 34, left: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="2 4" />
              <ReferenceArea x1={xMin} x2={data.meanX} y1={data.meanY} y2={yHi} fill={QUADS[0].color} fillOpacity={0.05} ifOverflow="hidden"
                label={{ value: QUADS[0].label, position: QUADS[0].pos, fill: QUADS[0].color, fontSize: 14, fontWeight: 800, opacity: 0.5 }} />
              <ReferenceArea x1={data.meanX} x2={xMax} y1={data.meanY} y2={yHi} fill={QUADS[1].color} fillOpacity={0.07} ifOverflow="hidden"
                label={{ value: QUADS[1].label, position: QUADS[1].pos, fill: QUADS[1].color, fontSize: 15, fontWeight: 800, opacity: 0.6 }} />
              <ReferenceArea x1={xMin} x2={data.meanX} y1={yLo} y2={data.meanY} fill={QUADS[2].color} fillOpacity={0.05} ifOverflow="hidden"
                label={{ value: QUADS[2].label, position: QUADS[2].pos, fill: QUADS[2].color, fontSize: 14, fontWeight: 800, opacity: 0.5 }} />
              <ReferenceArea x1={data.meanX} x2={xMax} y1={yLo} y2={data.meanY} fill={QUADS[3].color} fillOpacity={0.05} ifOverflow="hidden"
                label={{ value: QUADS[3].label, position: QUADS[3].pos, fill: QUADS[3].color, fontSize: 14, fontWeight: 800, opacity: 0.5 }} />
              <XAxis type="number" dataKey="x" domain={[xMin, xMax]} tickFormatter={(v: number) => dSign(Math.round(v))}
                tick={{ fill: tick, fontSize: 12.5 }} axisLine={{ stroke: grid }} tickLine={false}
                label={{ value: `▸ ${data.xLabel}`, position: "insideBottom", offset: -18, fill: tick, fontSize: 12.5 }} />
              <YAxis type="number" dataKey="y" domain={[yLo, yHi]} tick={{ fill: tick, fontSize: 12.5 }} axisLine={false} tickLine={false} width={42}
                label={{ value: data.yLabel, angle: -90, position: "insideLeft", offset: 16, fill: tick, fontSize: 12, style: { textAnchor: "middle" } }} />
              {/* Δ=0 얇은 회색 점선(라벨 없음 — 사분면 코너 라벨과 겹침 방지, 각주로 설명) */}
              {xMin < 0 && xMax > 0 && <ReferenceLine x={0} stroke={tick} strokeDasharray="1 4" strokeWidth={1} ifOverflow="hidden" />}
              {/* 평균선 라벨을 코너가 아닌 변의 중앙에 배치 → '스타/평균', '성장유망/집중관리' 코너 겹침 해소 */}
              <ReferenceLine x={data.meanX} stroke="var(--accent)" strokeDasharray="5 4" strokeWidth={1.5} ifOverflow="hidden"
                label={{ value: `평균 Δ ${dSign(data.meanX)}`, position: "insideTop", fill: "var(--accent)", fontSize: 11.5, fontWeight: 700 }} />
              <ReferenceLine y={data.meanY} stroke="var(--accent)" strokeDasharray="5 4" strokeWidth={1.5} ifOverflow="hidden"
                label={{ value: `평균 ${data.meanY}`, position: "insideLeft", fill: "var(--accent)", fontSize: 12, fontWeight: 700 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => active && payload?.length ? (() => {
                const p = payload[0].payload as OPerson;
                return <div style={{ background: "var(--elevated)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.45rem 0.65rem", fontSize: "0.76rem", boxShadow: "var(--shadow-md)" }}>
                  <b>{p.name}</b> · <span style={{ color: "var(--muted)" }}>{p.tierLabel}</span>{top10.has(p.id) && <span style={{ color: TOP10, fontWeight: 700 }}> · 상위 10%</span>}<br />
                  종합 <span className="mono" style={{ fontWeight: 700 }}>{p.score}</span> · {p.grade}등급 · {data.deltaLabel} <span className="mono" style={{ fontWeight: 700, color: p.delta == null ? "var(--muted)" : p.delta > 0 ? "var(--ok)" : p.delta < 0 ? "var(--bad)" : "var(--muted)" }}>{p.delta == null ? "—" : `${p.delta > 0 ? "▲ +" : p.delta < 0 ? "▼ " : "± "}${p.delta === 0 ? 0 : Math.abs(p.delta)}`}</span>
                </div>;
              })() : null} />
              <Scatter data={baseData} isAnimationActive={false} shape={baseDot} onClick={pick} />
              <Scatter data={topData} isAnimationActive={false} shape={topDot} onClick={pick} />
            </ScatterChart>
          </ResponsiveContainer>

          {/* 범례 — 사분면 색 · 직급 모양 · 상위10% */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
            {QUADS.map((q) => (
              <span key={q.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--text-2)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: q.color }} />{q.label}
              </span>
            ))}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--text)", fontWeight: 700 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: TOP10, border: `1.5px solid ${ring}`, boxShadow: `0 0 0 1px ${TOP10}` }} />상위 10%
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 6 }}>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600 }}>직급(모양):</span>
            {data.tiers.map((t) => (
              <span key={t.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--text-2)" }}>
                <ShapeIcon order={t.order} color="var(--text-2)" />{t.label}
              </span>
            ))}
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "8px 4px 0", lineHeight: 1.5 }}>
            X축은 <b>성과 모멘텀</b>({data.deltaLabel} 종합점수 변화 Δ), Y축은 현재 종합점수입니다. 세로 점선은 <b style={{ color: "var(--accent)" }}>평균 Δ</b>(우측=평균 이상 상승), 가로 점선은 평균 종합점수로 4사분면을 구분하며, 얇은 회색 점선은 <b>Δ=0</b>(절대 유지선)입니다. 점 <b>모양</b>은 직급, <b>색</b>은 사분면이며, <b style={{ color: TOP10 }}>종합점수 상위 10%</b>는 진한 파랑·큰 점으로 강조됩니다.
            {" "}종합점수는 {data.kind === "faculty"
              ? <>교원 <b>기준환산 지수</b>(트랙·계열 벤치마크를 100으로 표준화 — 100 초과 가능)</>
              : <>직원 <b>정규화 지수</b>(정기 90점/기능 200점 만점을 100 기준으로 정규화)</>}입니다.
            {" "}Δ의 연도 간 편차가 커 소수 극단치가 있어, X 도메인은 5~95 백분위 기준으로 잡고 그 밖은 경계로 표시했습니다.
            {data.kpi.noDelta > 0 && <> 직전 평가 기록이 없는 <b>{data.kpi.noDelta}명</b>(신임 등)은 Δ=0(중앙)으로 표시합니다.</>}
          </p>
        </div>

        {/* 세부 정보 패널 (슬라이드 인) */}
        <div className="panel" style={{ padding: "1.1rem 1.2rem", minHeight: 640, overflow: "hidden" }}>
          <div className="eyebrow" style={{ fontSize: "0.6rem", marginBottom: 8 }}>선택 구성원 세부</div>
          <AnimatePresence mode="wait">
            {sel ? (
              <motion.div key={sel.id} initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <span className="chip" style={{ fontSize: "0.6rem", color: QUADS[sel.quad].color, borderColor: QUADS[sel.quad].color }}>{QUADS[sel.quad].label}</span>
                  <span className="chip" style={{ fontSize: "0.6rem", display: "inline-flex", alignItems: "center", gap: 4 }}><ShapeIcon order={sel.tierOrder} color="var(--text-2)" size={10} />{sel.tierLabel}</span>
                  {top10.has(sel.id) && <span className="chip" style={{ fontSize: "0.6rem", color: TOP10, borderColor: TOP10, fontWeight: 700 }}>상위 10%</span>}
                </div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "2px 0 2px" }}>{sel.name}</h3>
                <div style={{ fontSize: "0.74rem", color: "var(--text-2)" }}>{data.masked ? "익명 집계 뷰" : `${sel.dept}`} · 근속 {sel.tenure}년</div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 16, margin: "14px 0 4px" }}>
                  <div>
                    <div className="mono" style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{sel.score}</div>
                    <div style={{ fontSize: "0.64rem", color: "var(--muted)", marginTop: 2 }}>종합점수 · {data.scoreBasis}</div>
                  </div>
                  <div style={{ textAlign: "center" }}><GradeBadge grade={sel.grade} size="lg" /><div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4 }}>등급</div></div>
                  <div>
                    {(() => { const d = sel.delta; const c = d == null ? "var(--muted)" : d > 0 ? "var(--ok)" : d < 0 ? "var(--bad)" : "var(--muted)"; return (
                      <div className="mono" style={{ fontSize: "1.35rem", fontWeight: 800, lineHeight: 1, color: c }}>
                        {d == null ? "—" : `${d > 0 ? "▲ +" : d < 0 ? "▼ " : "± "}${d === 0 ? 0 : Math.abs(d)}`}
                      </div>); })()}
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4 }}>{sel.delta == null ? "직전 평가 없음" : `${data.deltaLabel} Δ`}</div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="eyebrow" style={{ fontSize: "0.56rem", marginBottom: 8 }}>영역별 프로파일 (표준화)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sel.areas.map((a) => { const m = AREA_META[a.key] ?? { label: a.key, color: "var(--accent)" }; return (
                      <div key={a.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 2 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />{m.label}</span>
                          <span className="mono" style={{ color: "var(--text-2)", fontWeight: 700 }}>{a.val}</span>
                        </div>
                        <Meter value={Math.min(100, a.val)} max={100} color={m.color} height={6} />
                      </div>
                    ); })}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="eyebrow" style={{ fontSize: "0.56rem", marginBottom: 2 }}>최근 추이</div>
                  <Spark data={data.trendAxis.map((x, i) => ({ year: x, score: sel.trend[i] })).filter((d) => Number.isFinite(d.score))} />
                </div>

                {!data.masked ? (
                  <Link href={`${data.base}/${sel.id}`} className="chip" style={{ marginTop: 12, display: "inline-flex", cursor: "pointer", borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 700, padding: "0.35rem 0.8rem" }}>
                    성과카드 열기 →
                  </Link>
                ) : (
                  <div style={{ marginTop: 12, fontSize: "0.68rem", color: "var(--muted)" }}>총장·기획처 뷰 · 개인 실명·카드 비노출</div>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: 560, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted)", gap: 10 }}>
                <div style={{ fontSize: "2rem", opacity: 0.5 }}>◎</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)" }}>산점도에서 점을 클릭하세요</div>
                <div style={{ fontSize: "0.72rem", lineHeight: 1.55, maxWidth: 220 }}>선택한 구성원의 종합점수·등급·성과 모멘텀(Δ)·영역 프로파일·최근 추이가 여기에 표시됩니다.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="panel" style={{ padding: "0.7rem 0.9rem" }}>
      <div className="eyebrow" style={{ fontSize: "0.58rem" }}>{label}</div>
      <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: accent ?? "var(--text)", marginTop: 2 }}>
        {value}{unit && <span style={{ fontSize: "0.66rem", color: "var(--muted)", fontWeight: 500 }}> {unit}</span>}
      </div>
    </div>
  );
}
