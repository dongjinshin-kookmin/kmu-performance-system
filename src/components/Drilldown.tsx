"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AREA, AreaKey } from "@/lib/colors";
import { useTheme } from "./theme";

export interface DrillItem { title: string; sub: string; score: number; basis: string; meta: Record<string, string>; }
export interface IndRow { ind: string; name: string; area: string; conv: number; cnt: number; }

const RICH = new Set(["R01", "R04", "I01", "R11", "E01"]);

export function PerformanceBreakdown({ rows, drill }: { rows: IndRow[]; drill: Record<string, DrillItem[]> }) {
  const { isDark } = useTheme();
  const areas: AreaKey[] = ["R", "E", "I", "S"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {areas.map((a) => {
        const inds = rows.filter((r) => r.area === a);
        if (!inds.length) return null;
        const color = AREA[a][isDark ? "dark" : "light"];
        const sum = inds.reduce((s, r) => s + r.conv, 0);
        return (
          <div key={a}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <h3 style={{ fontSize: "0.92rem", fontWeight: 700, margin: 0 }}>{AREA[a].full}</h3>
              <span className="mono" style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-2)" }}>영역 원점수 {sum.toFixed(1)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {inds.map((r) => <IndicatorRow key={r.ind} row={r} items={drill[r.ind]} color={color} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IndicatorRow({ row, items, color }: { row: IndRow; items?: DrillItem[]; color: string }) {
  const [open, setOpen] = useState(false);
  const rich = RICH.has(row.ind) && items && items.length > 0;
  return (
    <div className="panel-2" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
      <button onClick={() => (rich ? setOpen((o) => !o) : null)} disabled={!rich}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "0.7rem 0.9rem", background: "transparent", border: "none", cursor: rich ? "pointer" : "default", color: "var(--text)", textAlign: "left" }}>
        <span className="mono chip" style={{ fontSize: "0.62rem", borderColor: color, color }}>{row.ind}</span>
        <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>{row.name}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{row.cnt}건</span>
          <span className={rich ? "mono drill" : "mono"} style={{ fontSize: "0.95rem", fontWeight: 700 }}>{row.conv.toFixed(1)}</span>
          {rich && <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▸</span>}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && rich && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
            <div style={{ borderTop: "1px solid var(--border)", padding: "0.4rem 0.5rem 0.6rem" }}>
              {items!.map((it, i) => <ActivityItem key={i} it={it} color={color} idx={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityItem({ it, color, idx }: { it: DrillItem; color: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
      style={{ borderRadius: 6, marginBottom: 3 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", padding: "0.5rem 0.6rem", background: open ? "var(--surface)" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "var(--text)", textAlign: "left" }}>
        <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 500, display: "block" }}>{it.title}</span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{it.sub}</span>
        </span>
        <span className="mono" style={{ fontSize: "0.86rem", fontWeight: 700, color, flexShrink: 0 }}>{it.score.toFixed(1)}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} style={{ overflow: "hidden" }}>
            <div style={{ margin: "0 0.6rem 0.5rem 1.7rem", padding: "0.6rem 0.75rem", background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: 8 }}>
              {it.basis && (
                <div style={{ marginBottom: 8 }}>
                  <div className="eyebrow" style={{ fontSize: "0.58rem", marginBottom: 4 }}>산출 근거 · 산식 투명성</div>
                  <div className="mono" style={{ fontSize: "0.76rem", color: "var(--text)", lineHeight: 1.5 }}>{it.basis}</div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                {Object.entries(it.meta).map(([k, v]) => (
                  <span key={k} style={{ fontSize: "0.72rem" }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span> <span className="mono" style={{ color: "var(--text-2)" }}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
