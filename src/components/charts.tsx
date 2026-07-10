"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ReferenceLine, ReferenceArea, LabelList,
} from "recharts";
import { useTheme } from "./theme";
import { AREA, GRADE, AreaKey } from "@/lib/colors";
import { motion } from "framer-motion";

function useC() {
  const { isDark } = useTheme();
  return {
    isDark,
    grid: isDark ? "#282c37" : "#e6e4dd",
    tick: isDark ? "#8b91a0" : "#8a909c",
    axis: isDark ? "#3a3f4c" : "#d3d0c7",
    area: (k: AreaKey) => AREA[k][isDark ? "dark" : "light"],
    grade: (g: string) => GRADE[g as keyof typeof GRADE][isDark ? "dark" : "light"],
    surface: isDark ? "#1e222c" : "#ffffff",
    text: isDark ? "#e9eaee" : "#1b1d23",
  };
}

function Box({ children }: { children: any }) {
  return <div style={{ background: "var(--elevated)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.5rem 0.7rem", boxShadow: "var(--shadow-md)", fontSize: "0.78rem" }}>{children}</div>;
}

// ── 연도 추이 (종합점수 라인 + 그라디언트 area) ──
export function TrendLine({ data }: { data: { year: number; score: number }[] }) {
  const c = useC();
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.area("R")} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c.area("R")} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="year" tick={{ fill: c.tick, fontSize: 13 }} axisLine={{ stroke: c.axis }} tickLine={false} />
        <YAxis domain={[70, 95]} tick={{ fill: c.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <Box><b>{label}년</b> · 종합 {payload[0].value}</Box> : null} />
        <Area type="monotone" dataKey="score" stroke={c.area("R")} strokeWidth={2.5} fill="url(#tg)" dot={{ r: 4, fill: c.area("R"), strokeWidth: 0 }} activeDot={{ r: 6 }} animationDuration={1100} animationEasing="ease-out" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── 개인 5yr 미니 스파크 ──
export function Spark({ data }: { data: { year: number | string; score: number }[] }) {
  const c = useC();
  return (
    <ResponsiveContainer width="100%" height={90}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <YAxis domain={["dataMin-4", "dataMax+4"]} hide />
        <XAxis dataKey="year" tick={{ fill: c.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <Box>{label} · {payload[0].value}</Box> : null} />
        <Line type="monotone" dataKey="score" stroke={c.area("R")} strokeWidth={2.5} dot={{ r: 3, fill: c.area("R"), strokeWidth: 0 }} animationDuration={900} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── 종합점수 추이 (연도 구분선 + 최근 구간 음영) ──
export function TrendChart({ data, shade = 2, height = 244 }: { data: { x: string; score: number; grade?: string }[]; shade?: number; height?: number }) {
  const c = useC();
  // 연도 경계: x 라벨의 연도(앞 4자리 또는 "YYYY-h")가 이전과 달라지는 지점
  const yearOf = (x: string) => x.split("-")[0];
  const boundaries: { x: string; year: string }[] = [];
  data.forEach((d, i) => { if (i > 0 && yearOf(d.x) !== yearOf(data[i - 1].x)) boundaries.push({ x: d.x, year: yearOf(d.x) }); });
  const shadeStart = data.length > shade ? data[data.length - shade].x : data[0]?.x;
  const shadeEnd = data[data.length - 1]?.x;
  // 깔끔한 정수 도메인 (recharts 함수형 도메인 — 실제 dataMin/Max로 내부 평가되어 항상 유효)
  const domainMin = (v: number) => Math.floor((v - 8) / 5) * 5;
  const domainMax = (v: number) => Math.ceil((v + 9) / 5) * 5;
  // 각 데이터 포인트에 "점수 · 등급" 라벨 — 위/아래 교차 배치로 겹침 방지, tabular-nums, 등급은 시맨틱 컬러
  const lastIdx = data.length - 1;
  const renderPointLabel = (props: any) => {
    const { x, y, value, index } = props;
    if (x == null || y == null || value == null) return null;
    const grade = data[index]?.grade;
    const above = index % 2 === 0;
    const anchor = index === 0 ? "start" : index === lastIdx ? "end" : "middle";
    const dx = index === 0 ? -3 : index === lastIdx ? 3 : 0;
    return (
      <text x={x + dx} y={y + (above ? -14 : 22)} textAnchor={anchor}
        fontSize={13} fontWeight={800} fill={c.text} style={{ fontVariantNumeric: "tabular-nums" }}>
        {Number(value).toFixed(1)}
        {grade ? <tspan fontSize={11.5} fontWeight={700} fill={c.grade(grade)}>{"  "}{grade}</tspan> : null}
      </text>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 30, right: 22, left: 6, bottom: 2 }}>
        <defs>
          <linearGradient id="tgc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.area("R")} stopOpacity={0.34} />
            <stop offset="100%" stopColor={c.area("R")} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        {shadeStart && shadeEnd && shadeStart !== shadeEnd && (
          <ReferenceArea x1={shadeStart} x2={shadeEnd} fill={c.area("I")} fillOpacity={0.08} ifOverflow="extendDomain"
            label={{ value: "최근 구간", position: "insideBottomRight", fill: c.tick, fontSize: 10 }} />
        )}
        {boundaries.map((b) => (
          <ReferenceLine key={b.x} x={b.x} stroke={c.axis} strokeDasharray="3 3"
            label={{ value: b.year, position: "top", fill: c.tick, fontSize: 11, fontWeight: 700 }} />
        ))}
        <XAxis dataKey="x" tick={{ fill: c.tick, fontSize: 12 }} axisLine={{ stroke: c.axis }} tickLine={false} padding={{ left: 8, right: 8 }} />
        <YAxis domain={[domainMin, domainMax]} tickCount={5} allowDecimals={false} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <Box><b>{label}</b> · 종합 {Number(payload[0].value).toFixed(1)}</Box> : null} />
        <Area type="monotone" dataKey="score" stroke={c.area("R")} strokeWidth={2.75} fill="url(#tgc)" dot={{ r: 4, fill: c.area("R"), strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false}>
          <LabelList dataKey="score" content={renderPointLabel} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── 계열그룹 비교 (가로 바) ──
export function GroupBars({ data }: { data: { grp: string; label: string; score: number; n: number }[] }) {
  const c = useC();
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap={12}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" domain={[75, 95]} tick={{ fill: c.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={120} tick={{ fill: c.text, fontSize: 13 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.3 }} content={({ active, payload }) => active && payload?.length ? <Box><b>{payload[0].payload.label}</b><br />평균 {payload[0].value} · {payload[0].payload.n}명</Box> : null} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} animationDuration={1000} label={{ position: "right", fill: c.tick, fontSize: 11, formatter: (v: number) => v.toFixed(1) }}>
          {data.map((d, i) => <Cell key={i} fill={c.area(["R", "E", "I", "S"][i % 4] as AreaKey)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 등급 분포 (100% 누적 가로 바 + 범례) ──
export function GradeStack({ dist, height = 34 }: { dist: Record<string, number>; height?: number }) {
  const c = useC();
  const H = height * 2; // 두께 2배(사용자 지시)
  const order = ["S", "A", "B", "C", "D"];
  const total = order.reduce((s, g) => s + (dist[g] || 0), 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: H, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {order.map((g) => {
          const n = dist[g] || 0; const w = (n / total) * 100;
          if (n === 0) return null;
          return (
            <motion.div key={g} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              title={`${g} ${n}명`} style={{ background: c.grade(g), display: "flex", alignItems: "center", justifyContent: "center", borderRight: "2px solid var(--surface)" }}>
              {w > 7 && <span className="mono" style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 700 }}>{g} {n}</span>}
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {order.map((g) => (
          <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--text-2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.grade(g) }} />{g} <span className="mono" style={{ color: "var(--muted)" }}>{dist[g] || 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 개인 4영역 레이더 ──
export function AreaRadar({ areas }: { areas: { area: string; std: number }[] }) {
  const c = useC();
  const data = ["R", "E", "I", "S"].map((a) => ({ area: AREA[a as AreaKey].label, std: areas.find((x) => x.area === a)?.std ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={c.grid} />
        <PolarAngleAxis dataKey="area" tick={{ fill: c.text, fontSize: 15, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 120]} tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} />
        <Radar dataKey="std" stroke={c.area("R")} fill={c.area("R")} fillOpacity={0.3} strokeWidth={2} animationDuration={1000} />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <Box>{payload[0].payload.area} · 표준화 {Number(payload[0].value).toFixed(1)}</Box> : null} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── 표준화 분포 곡선 + 본인 위치 마커 (내 위치 위젯). 컨테이너 높이를 꽉 채움(%) ──
export function DistCurve({ mean, sd, value, color, label, height }: { mean: number; sd: number; value: number; color: string; label: string; height?: number }) {
  const s = sd > 0.5 ? sd : 1;
  const lo = mean - 3 * s, hi = mean + 3 * s;
  const span = hi - lo || 1;
  // viewBox y 0..100 (컨테이너 높이 비례). 상단 라벨 여유 TP, 하단 축 여유 BP.
  const TP = 18, BP = 16, PH = 100 - TP - BP;
  const base = TP + PH;
  const gauss = (x: number) => Math.exp(-0.5 * ((x - mean) / s) ** 2);
  const N = 60;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) { const x = lo + (span * i) / N; const px = (i / N) * 100; const py = TP + (1 - gauss(x)) * PH; pts.push(`${i ? "L" : "M"}${px.toFixed(2)} ${py.toFixed(2)}`); }
  const line = pts.join(" ");
  const areaPath = `${line} L 100 ${base} L 0 ${base} Z`;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const mx = clamp(((value - lo) / span) * 100);
  const meanX = clamp(((mean - lo) / span) * 100);
  const dotY = TP + (1 - gauss(value)) * PH;
  const labelX = Math.max(14, Math.min(86, mx));
  return (
    <div style={{ position: "relative", width: "100%", height: height ?? "100%", minHeight: 120 }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <path d={areaPath} fill={color} fillOpacity={0.16} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={base} x2="100" y2={base} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={meanX} y1={base} x2={meanX} y2={base - 6} stroke="var(--muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ position: "absolute", top: `${TP - 2}%`, bottom: `${BP}%`, left: `${mx}%`, width: 0, borderLeft: `2px dashed ${color}` }} />
      <div style={{ position: "absolute", top: `${dotY}%`, left: `${mx}%`, transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: color, border: "2px solid var(--surface)", boxShadow: `0 0 9px ${color}aa` }} />
      <div style={{ position: "absolute", top: 0, left: `${labelX}%`, transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: "0.72rem", fontWeight: 700, color: "#fff", background: color, padding: "2px 9px", borderRadius: 999, boxShadow: `0 2px 7px ${color}77` }} className="mono">{label}</div>
      <div style={{ position: "absolute", bottom: `${BP - 15}%`, left: `${meanX}%`, transform: "translateX(-50%)", fontSize: "0.62rem", color: "var(--muted)" }}>평균</div>
    </div>
  );
}

// ── 관계유형별 평균 비교 (동료평가 360°, 가로 바) ──
export function FeedbackBars({ data }: { data: { label: string; score: number; n: number; self?: boolean }[] }) {
  const c = useC();
  const palette = ["R", "E", "I", "S"] as AreaKey[];
  return (
    <ResponsiveContainer width="100%" height={Math.max(150, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 8, bottom: 4 }} barCategoryGap={12}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 5]} tick={{ fill: c.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={104} tick={{ fill: c.text, fontSize: 13 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.3 }} content={({ active, payload }) => active && payload?.length ? <Box><b>{payload[0].payload.label}</b><br />평균 {Number(payload[0].value).toFixed(2)} · {payload[0].payload.n}인</Box> : null} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} animationDuration={900} label={{ position: "right", fill: c.tick, fontSize: 12, formatter: (v: number) => v.toFixed(2) }}>
          {data.map((d, i) => <Cell key={i} fill={d.self ? c.grade("B") : c.area(palette[i % 4])} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 학과 구성원 점수 스트립 (등급 색 점) ──
export function DeptStrip({ scores }: { scores: { name: string; t: number; grade: string }[] }) {
  const c = useC();
  const min = 40, max = 130;
  return (
    <div style={{ position: "relative", height: 74, marginTop: 8 }}>
      <div style={{ position: "absolute", top: 30, left: 0, right: 0, height: 2, background: "var(--border)" }} />
      {[60, 70, 85, 95].map((g) => (
        <div key={g} style={{ position: "absolute", top: 20, left: `${((g - min) / (max - min)) * 100}%`, transform: "translateX(-50%)" }}>
          <div style={{ width: 1, height: 22, background: "var(--border-strong)" }} />
          <span className="mono" style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{g}</span>
        </div>
      ))}
      {scores.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.006, duration: 0.4 }}
          title={`${s.name} · ${s.t.toFixed(1)} (${s.grade})`}
          style={{ position: "absolute", top: 24, left: `${Math.max(0, Math.min(100, ((s.t - min) / (max - min)) * 100))}%`, transform: "translateX(-50%)", width: 13, height: 13, borderRadius: "50%", background: c.grade(s.grade), border: "2px solid var(--surface)", cursor: "default" }} />
      ))}
    </div>
  );
}
