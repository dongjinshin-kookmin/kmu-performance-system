"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Meter } from "./ui";
import { BSC } from "@/lib/colors";
import { useTheme } from "./theme";

export interface Mbo { title: string; goal: string; bsc: string; target: string; achieved: string; rate: number; cascade_name: string; actions?: string[]; evidence?: string; }
export interface Act { type: string; title: string; attrs: any; }

export function StaffMbo({ goals }: { goals: Mbo[] }) {
  const { isDark } = useTheme();
  const bscColor = (b: string) => BSC[b]?.[isDark ? "dark" : "light"] ?? "var(--accent)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
      {goals.map((g, i) => <MboCard key={i} g={g} color={bscColor(g.bsc)} idx={i} />)}
    </div>
  );
}

function MboCard({ g, color, idx }: { g: Mbo; color: string; idx: number }) {
  const [open, setOpen] = useState(false);
  const rate = g.rate;
  return (
    <div className="panel-2 reveal" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.9rem 1rem", animationDelay: `${idx * 0.05}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: "0.86rem", fontWeight: 600, lineHeight: 1.35 }}>{g.goal}</span>
        <span className="chip mono" style={{ fontSize: "0.58rem", borderColor: color, color, flexShrink: 0 }}>{BSC[g.bsc]?.label ?? g.bsc}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 5px" }}>
        <span className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: rate >= 100 ? "var(--ok)" : rate >= 80 ? "var(--text)" : "var(--warn)" }}>{rate}%</span>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>달성률 (목표 {g.target})</span>
      </div>
      <div style={{ position: "relative" }}>
        <Meter value={rate} max={150} color={color} height={7} />
        <div style={{ position: "absolute", top: -2, left: "66.6%", width: 2, height: 11, background: "var(--text-2)" }} title="목표 100%" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>↳ 부서 KPI: {g.cascade_name}</span>
        {(g.actions?.length || g.evidence) && (
          <button onClick={() => setOpen((o) => !o)} className="mono drill" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>
            추진실적 {open ? "▾" : "▸"}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border-strong)" }}>
              <ul style={{ margin: "0 0 6px", paddingLeft: 16, fontSize: "0.76rem", color: "var(--text-2)", lineHeight: 1.6 }}>
                {(g.actions ?? []).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              {g.evidence && <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>📎 {g.evidence}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 교육·포상·혁신·서비스 등 기타 실적 목록 */
export function StaffActivities({ acts }: { acts: Act[] }) {
  const groups: { type: string; label: string; icon: string }[] = [
    { type: "EDU", label: "교육 이수", icon: "🎓" }, { type: "AWARD", label: "포상", icon: "🏅" },
    { type: "INNOV", label: "혁신 제안", icon: "💡" }, { type: "SERVICE_FB", label: "서비스 평가", icon: "🤝" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((grp) => {
        const items = acts.filter((a) => a.type === grp.type);
        if (!items.length) return null;
        return (
          <div key={grp.type}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>{grp.icon} {grp.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {items.map((a, i) => <ActRow key={i} a={a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function ActRow({ a }: { a: Act }) {
  const meta = actMeta(a);
  return (
    <div className="panel-2" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.55rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: "0.82rem" }}>{a.title}</span>
      <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>{meta}</span>
    </div>
  );
}
function actMeta(a: Act): string {
  const x = a.attrs;
  if (a.type === "EDU") return `${x.org} · ${x.hours}시간`;
  if (a.type === "AWARD") return `${x.giver} · +${x.points}`;
  if (a.type === "INNOV") return `${x.status} · ${x.effect}`;
  if (a.type === "SERVICE_FB") return `${x.score}점 · "${x.opinion}"`;
  return "";
}
