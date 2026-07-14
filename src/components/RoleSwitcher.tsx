"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

type RoleCode = "FACULTY" | "DEPT_CHAIR" | "EVAL_COMMITTEE" | "HR_TEAM" | "PRESIDENT" | "STAFF" | "TEAM_LEAD" | "DEPT_HEAD";
interface Opt { id: number; name: string; dept: string; group: string; }

const META: Record<RoleCode, { name: string; needsViewer: boolean; scope: string; land: (v: number | null) => string; kind: "F" | "S" | "ADMIN" }> = {
  PRESIDENT: { name: "총장 / 기획처", needsViewer: false, scope: "ORG_ALL", land: () => "/dashboard", kind: "ADMIN" },
  HR_TEAM: { name: "인사팀", needsViewer: false, scope: "ORG_ALL", land: () => "/dashboard", kind: "ADMIN" },
  FACULTY: { name: "교수 (본인)", needsViewer: true, scope: "SELF", land: (v) => (v ? `/faculty/${v}` : "/dashboard"), kind: "F" },
  DEPT_CHAIR: { name: "학과장", needsViewer: true, scope: "DEPT", land: () => "/departments", kind: "F" },
  EVAL_COMMITTEE: { name: "평가위원", needsViewer: false, scope: "ASSIGNED", land: () => "/workflow", kind: "F" },
  STAFF: { name: "직원 (본인)", needsViewer: true, scope: "SELF", land: (v) => (v ? `/staff/${v}` : "/units"), kind: "S" },
  TEAM_LEAD: { name: "팀장", needsViewer: true, scope: "DEPT", land: () => "/units", kind: "S" },
  DEPT_HEAD: { name: "부서장", needsViewer: true, scope: "DEPT", land: () => "/units", kind: "S" },
};
const GROUPS: { title: string; roles: RoleCode[] }[] = [
  { title: "기관", roles: ["PRESIDENT", "HR_TEAM"] },
  { title: "교수", roles: ["FACULTY", "DEPT_CHAIR", "EVAL_COMMITTEE"] },
  { title: "직원", roles: ["STAFF", "TEAM_LEAD", "DEPT_HEAD"] },
];

export function RoleSwitcher({ role, viewer, faculty, chairs, staff, leads, heads, card, icon, color, desc, viewerLabel }: { role: RoleCode; viewer: number | null; faculty: Opt[]; chairs: Opt[]; staff: Opt[]; leads: Opt[]; heads: Opt[]; card?: boolean; icon?: string; color?: string; desc?: string; viewerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  function apply(nextRole: RoleCode, nextViewer: number | null) {
    document.cookie = `rbac=${encodeURIComponent(JSON.stringify({ role: nextRole, viewer: nextViewer }))}; path=/; max-age=31536000`;
    setOpen(false);
    start(() => { router.push(META[nextRole].land(nextViewer)); router.refresh(); });
  }
  const firstViewer = (r: RoleCode): number | null =>
    r === "FACULTY" ? faculty[0]?.id ?? null : r === "DEPT_CHAIR" ? chairs[0]?.id ?? null :
    r === "STAFF" ? staff[0]?.id ?? null : r === "TEAM_LEAD" ? leads[0]?.id ?? null : r === "DEPT_HEAD" ? heads[0]?.id ?? null : null;

  const opts = role === "FACULTY" ? faculty : role === "DEPT_CHAIR" ? chairs : role === "STAFF" ? staff : role === "TEAM_LEAD" ? leads : role === "DEPT_HEAD" ? heads : [];

  const accent = color ?? (META[role].kind === "S" ? "var(--area-I)" : META[role].kind === "F" ? "var(--area-R)" : "var(--accent)");

  return (
    <div style={{ position: "relative" }}>
      {card ? (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 15, padding: "0.9rem", cursor: "pointer", color: "var(--text)", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: "grid", placeItems: "center", fontSize: "1.35rem", background: `color-mix(in srgb, ${accent} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 42%, var(--border))` }}>{icon ?? "●"}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="eyebrow" style={{ fontSize: "0.69rem" }}>현재 권한 · 눌러서 전환</span>
            <div style={{ fontSize: "1.02rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)", marginTop: 2 }}>{META[role].name}</div>
            {viewerLabel && <div style={{ fontSize: "0.76rem", color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewerLabel}</div>}
            {desc && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>{desc}</div>}
          </span>
          <span className="mono" style={{ color: "var(--muted)", fontSize: "0.8rem" }}>▾</span>
        </button>
      ) : (
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.4rem 0.75rem", cursor: "pointer", color: "var(--text)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: "0 0 8px currentColor" }} />
        <span style={{ textAlign: "left", lineHeight: 1.15 }}>
          <span className="eyebrow" style={{ fontSize: "0.58rem" }}>현재 권한</span><br />
          <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>{META[role].name}</span>
        </span>
        <span className="mono" style={{ color: "var(--muted)", fontSize: "0.7rem" }}>▾</span>
      </button>
      )}
      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.18 }}
              style={{ position: "absolute", top: "calc(100% + 8px)", left: card ? 0 : "auto", right: card ? "auto" : 0, width: 320, maxWidth: "88vw", zIndex: 60, background: "var(--elevated)", border: "1px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 8 }}>
              <div className="eyebrow" style={{ padding: "8px 8px" }}>역할 전환 · 권한별 화면 확인</div>
              {GROUPS.map((g) => (
                <div key={g.title} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--muted)", padding: "6px 8px 3px", fontWeight: 700 }}>{g.title}</div>
                  {g.roles.map((r) => (
                    <button key={r} onClick={() => apply(r, firstViewer(r))}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: 45, textAlign: "left", padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer", background: r === role ? "var(--accent-soft)" : "transparent", color: "var(--text)" }}>
                      <span style={{ fontSize: "0.86rem", fontWeight: r === role ? 700 : 500 }}>{META[r].name}</span>
                      <span className="mono chip" style={{ fontSize: "0.68rem", minHeight: 27, padding: "1px 7px" }}>{META[r].scope}</span>
                    </button>
                  ))}
                </div>
              ))}
              {opts.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 8 }}>
                  <div className="eyebrow" style={{ padding: "0 8px 6px" }}>{META[role].kind === "S" ? "직원 선택" : role === "DEPT_CHAIR" ? "학과장 선택" : "인물 선택"}</div>
                  <select value={viewer ?? ""} onChange={(e) => apply(role, Number(e.target.value))}
                    style={{ width: "100%", padding: "10px 11px", borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: "0.86rem" }}>
                    {opts.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.dept}</option>)}
                  </select>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
