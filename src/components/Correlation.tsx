"use client";
import Link from "next/link";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import { useTheme } from "./theme";

export interface Metric { key: string; label: string; }

/** 발산형 상관 색상 (양=teal, 음=red, 0=중립) */
function corrBg(r: number): string {
  const base = r >= 0 ? "var(--area-E)" : "var(--bad)";
  const pct = Math.round(Math.min(1, Math.abs(r)) * 82);
  return `color-mix(in srgb, ${base} ${pct}%, var(--surface-2))`;
}

export function Heatmap({ metrics, matrix, xi, yi, base }: { metrics: Metric[]; matrix: number[][]; xi: number; yi: number; base: string }) {
  const n = metrics.length;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${n}, minmax(52px, 1fr))`, gap: 3, minWidth: 520 }}>
        <div />
        {metrics.map((m) => (
          <div key={m.key} style={{ fontSize: "0.62rem", color: "var(--text-2)", textAlign: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 64, margin: "0 auto", fontWeight: 600 }}>{m.label}</div>
        ))}
        {metrics.map((rm, i) => (
          <div key={rm.key} style={{ display: "contents" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontWeight: 600 }}>{rm.label}</div>
            {metrics.map((cm, j) => {
              const r = matrix[i][j];
              const sel = (i === yi && j === xi) || (i === xi && j === yi);
              const strong = Math.abs(r) > 0.45;
              return (
                <Link key={cm.key} href={`${base}?x=${cm.key}&y=${rm.key}`}
                  style={{ aspectRatio: "1", minHeight: 40, display: "grid", placeItems: "center", borderRadius: 5, background: corrBg(r),
                    border: sel ? "2px solid var(--accent)" : "1px solid var(--border)", cursor: "pointer", textDecoration: "none" }}
                  title={`${rm.label} ↔ ${cm.label}: r=${r.toFixed(2)}`}>
                  <span className="mono" style={{ fontSize: "0.66rem", fontWeight: 700, color: strong ? "#fff" : "var(--text-2)" }}>{i === j ? "—" : r.toFixed(2)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface Pt { x: number; y: number; group: string; label: string; }
export function Scatterplot({ points, xLabel, yLabel, r, reg, colorMap, groupLabel }: { points: Pt[]; xLabel: string; yLabel: string; r: number; reg: { a: number; b: number }; colorMap: Record<string, string>; groupLabel: Record<string, string> }) {
  const { isDark } = useTheme();
  const grid = isDark ? "#282c37" : "#e6e4dd", tick = isDark ? "#8b91a0" : "#8a909c";
  const cc = (g: string) => colorMap[g] ?? (isDark ? "#4a4f5c" : "#b8bcc6");
  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const usedGroups = [...new Set(points.map((p) => p.group))].filter((g) => colorMap[g]);
  const rColor = r >= 0 ? "var(--area-E)" : "var(--bad)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{xLabel} <span style={{ color: "var(--muted)" }}>↔</span> {yLabel}</span>
        <span className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: rColor }}>피어슨 r = {r.toFixed(3)} <span style={{ fontSize: "0.66rem", color: "var(--muted)" }}>({corrWord(r)})</span></span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid stroke={grid} />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fill: tick, fontSize: 11 }} axisLine={{ stroke: grid }} tickLine={false} label={{ value: xLabel, position: "insideBottom", offset: -8, fill: tick, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fill: tick, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => active && payload?.length ? (
            <div style={{ background: "var(--elevated)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.4rem 0.6rem", fontSize: "0.74rem" }}>
              <b>{payload[0].payload.label}</b><br />{xLabel} {Number(payload[0].payload.x).toFixed(1)} · {yLabel} {Number(payload[0].payload.y).toFixed(1)}
            </div>) : null} />
          <Scatter data={points} isAnimationActive={false}>
            {points.map((p, i) => <Cell key={i} fill={cc(p.group)} fillOpacity={0.62} />)}
          </Scatter>
          <ReferenceLine ifOverflow="extendDomain" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4"
            segment={[{ x: minX, y: reg.a + reg.b * minX }, { x: maxX, y: reg.a + reg.b * maxX }]} />
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
        {usedGroups.map((g) => (
          <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--text-2)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cc(g) }} />{groupLabel[g] ?? g}
          </span>
        ))}
      </div>
    </div>
  );
}

function corrWord(r: number): string {
  const a = Math.abs(r);
  const s = a >= 0.7 ? "강한" : a >= 0.4 ? "뚜렷한" : a >= 0.2 ? "약한" : "미미한";
  return `${s} ${r >= 0 ? "양" : "음"}의 상관`;
}
