"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./theme";

type Sec = "faculty" | "staff" | "inst";
interface Opt { id: number; name: string; dept: string; group: string; }
interface Item { label: string; href: string }
interface Group { id: Sec; title: string; icon: string; color: string; items: Item[] }

export interface SidebarProps {
  role: any; viewer: number | null; roleName: string; roleIcon: string; roleColor: string; roleDesc: string; viewerLabel: string;
  faculty: Opt[]; chairs: Opt[]; staff: Opt[]; leads: Opt[]; heads: Opt[];
  facultyLinkId: number; staffLinkId: number;
  onNavigate?: () => void;
}

export function Sidebar(p: SidebarProps) {
  const path = usePathname();
  const groups: Group[] = [
    { id: "faculty", title: "교원 성과", icon: "🎓", color: "var(--area-R)", items: [
      { label: "대시보드", href: "/dashboard" },
      { label: "성과 총람", href: "/overview/faculty" },
      { label: "개인 성과카드", href: `/faculty/${p.facultyLinkId}` },
      { label: "학과·단과대 비교", href: "/departments" },
      { label: "평가 워크플로", href: "/workflow" },
      { label: "지표·배점표", href: "/indicators/faculty" },
      { label: "분석 · 상관관계", href: "/analysis/faculty" },
    ] },
    { id: "staff", title: "직원 성과", icon: "🧑‍💼", color: "var(--area-I)", items: [
      { label: "부서 KPI 대시보드", href: "/units" },
      { label: "성과 총람", href: "/overview/staff" },
      { label: "개인 성과카드", href: `/staff/${p.staffLinkId}` },
      { label: "평가 워크플로", href: "/workflow" },
      { label: "지표·배점표", href: "/indicators/staff" },
      { label: "분석 · 상관관계", href: "/analysis/staff" },
    ] },
    { id: "inst", title: "기관", icon: "🏛️", color: "var(--accent)", items: [
      { label: "통합 대시보드", href: "/dashboard" },
      { label: "공시지표 대조", href: "/dashboard" },
    ] },
  ];

  const inferSec = (): Sec => {
    if (path.startsWith("/faculty") || path.startsWith("/departments") || path === "/analysis/faculty" || path === "/indicators/faculty" || path === "/overview/faculty") return "faculty";
    if (path.startsWith("/staff") || path.startsWith("/units") || path === "/analysis/staff" || path === "/indicators/staff" || path === "/overview/staff") return "staff";
    return "inst";
  };
  const [section, setSection] = useState<Sec>("inst");
  const [openG, setOpenG] = useState<Record<Sec, boolean>>({ faculty: true, staff: true, inst: true });

  useEffect(() => {
    const saved = localStorage.getItem("kmu-tree-open");
    if (saved) try { setOpenG(JSON.parse(saved)); } catch {}
    setSection(inferSec());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const toggle = (id: Sec) => setOpenG((o) => { const n = { ...o, [id]: !o[id] }; localStorage.setItem("kmu-tree-open", JSON.stringify(n)); return n; });
  const active = (href: string) => path === href || (href !== "/dashboard" && href.split("#")[0] !== "/dashboard" && path.startsWith(href.split("#")[0]));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: 268, background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
      {/* 브랜드 */}
      <Link href="/dashboard" onClick={p.onNavigate} style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 12px" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, var(--accent), var(--area-R))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800 }}>K</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", letterSpacing: "-0.02em" }}>성과관리통합시스템</div>
          <div className="eyebrow" style={{ fontSize: "0.54rem" }}>KOOKMIN · v1.2</div>
        </div>
      </Link>

      {/* 큰 권한 카드 */}
      <div style={{ padding: "4px 14px 12px" }}>
        <RoleSwitcher card role={p.role} viewer={p.viewer} faculty={p.faculty} chairs={p.chairs} staff={p.staff} leads={p.leads} heads={p.heads}
          icon={p.roleIcon} color={p.roleColor} desc={p.roleDesc} viewerLabel={p.viewerLabel} />
      </div>

      {/* 교원/직원/기관 탭 */}
      <div style={{ display: "flex", gap: 4, padding: "0 14px 10px" }}>
        {groups.map((g) => {
          const on = section === g.id;
          return (
            <Link key={g.id} href={g.id === "faculty" ? "/dashboard" : g.id === "staff" ? "/units" : "/dashboard"} onClick={() => { setSection(g.id); setOpenG((o) => ({ ...o, [g.id]: true })); p.onNavigate?.(); }}
              style={{ flex: 1, textAlign: "center", padding: "7px 4px", borderRadius: 8, fontSize: "0.72rem", fontWeight: on ? 700 : 500,
                background: on ? `color-mix(in srgb, ${g.color} 16%, transparent)` : "transparent", color: on ? g.color : "var(--text-2)", border: `1px solid ${on ? g.color : "var(--border)"}` }}>
              {g.icon} {g.id === "faculty" ? "교원" : g.id === "staff" ? "직원" : "기관"}
            </Link>
          );
        })}
      </div>

      {/* 트리 메뉴 */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 10px 10px" }}>
        {groups.map((g) => (
          <div key={g.id} style={{ marginBottom: 6 }}>
            <button onClick={() => toggle(g.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text)", borderRadius: 8 }}>
              <span style={{ fontSize: "0.95rem" }}>{g.icon}</span>
              <span style={{ flex: 1, textAlign: "left", fontSize: "0.82rem", fontWeight: 700 }}>{g.title}</span>
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)", transform: openG[g.id] ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▸</span>
            </button>
            <AnimatePresence initial={false}>
              {openG[g.id] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingLeft: 12, borderLeft: `1px solid var(--border)`, marginLeft: 15 }}>
                    {g.items.map((it) => {
                      const on = active(it.href);
                      return (
                        <Link key={it.label + it.href} href={it.href} onClick={p.onNavigate}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", margin: "1px 0", borderRadius: 7, fontSize: "0.8rem", fontWeight: on ? 700 : 500,
                            color: on ? g.color : "var(--text-2)", background: on ? `color-mix(in srgb, ${g.color} 12%, transparent)` : "transparent" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: on ? g.color : "var(--border-strong)" }} />
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <ThemeToggle />
        <span className="eyebrow" style={{ fontSize: "0.5rem" }}>Phase 3 · UI</span>
      </div>
    </div>
  );
}
