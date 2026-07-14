"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./theme";

type Sec = "faculty" | "staff" | "inst";
interface Opt { id: number; name: string; dept: string; group: string; }
interface Item { label: string; href: string; icon: IconName }
interface Group { id: Sec; title: string; color: string; items: Item[] }
type IconName = "home" | "faculty" | "staff" | "building" | "cards" | "compare" | "workflow" | "indicators" | "analysis" | "settings" | "notice";

export interface SidebarProps {
  role: any; viewer: number | null; roleName: string; roleIcon: string; roleColor: string; roleDesc: string; viewerLabel: string;
  faculty: Opt[]; chairs: Opt[]; staff: Opt[]; leads: Opt[]; heads: Opt[];
  facultyLinkId: number; staffLinkId: number;
  onNavigate?: () => void;
}

export function Sidebar(p: SidebarProps) {
  const path = usePathname();
  const groups: Group[] = [
    { id: "faculty", title: "교원 성과", color: "var(--area-R)", items: [
      { label: "대시보드", href: "/dashboard", icon: "home" },
      { label: "성과 총람", href: "/overview/faculty", icon: "cards" },
      { label: "개인 성과카드", href: `/faculty/${p.facultyLinkId}`, icon: "faculty" },
      { label: "학과·단과대 비교", href: "/departments", icon: "compare" },
      { label: "평가 워크플로", href: "/workflow", icon: "workflow" },
      { label: "지표·배점표", href: "/indicators/faculty", icon: "indicators" },
      { label: "분석 · 상관관계", href: "/analysis/faculty", icon: "analysis" },
    ] },
    { id: "staff", title: "직원 성과", color: "var(--area-I)", items: [
      { label: "부서 KPI 대시보드", href: "/units", icon: "home" },
      { label: "성과 총람", href: "/overview/staff", icon: "cards" },
      { label: "개인 성과카드", href: `/staff/${p.staffLinkId}`, icon: "staff" },
      { label: "평가 워크플로", href: "/workflow", icon: "workflow" },
      { label: "지표·배점표", href: "/indicators/staff", icon: "indicators" },
      { label: "분석 · 상관관계", href: "/analysis/staff", icon: "analysis" },
    ] },
    { id: "inst", title: "기관 성과", color: "var(--accent)", items: [
      { label: "통합 대시보드", href: "/dashboard", icon: "home" },
      { label: "공시지표 대조", href: "/dashboard#disclosure", icon: "compare" },
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
  const active = (href: string, group: Sec) => !href.includes("#") && section === group && (path === href || (href !== "/dashboard" && path.startsWith(href)));

  const rail = [
    { id: "inst" as Sec, href: "/dashboard", label: "기관 성과", icon: "building" as IconName },
    { id: "faculty" as Sec, href: "/dashboard", label: "교원 성과", icon: "faculty" as IconName },
    { id: "staff" as Sec, href: "/units", label: "직원 성과", icon: "staff" as IconName },
    { id: "inst" as Sec, href: "/workflow", label: "평가 업무", icon: "workflow" as IconName },
    { id: "inst" as Sec, href: "/indicators/faculty", label: "지표 관리", icon: "indicators" as IconName },
  ];

  return (
    <aside className="sidebar-frame" aria-label="주 메뉴">
      <div className="sidebar-rail">
        <Link className="rail-logo" href="/dashboard" onClick={p.onNavigate} aria-label="통합 대시보드">K</Link>
        <div className="rail-divider" />
        <nav className="rail-nav" aria-label="업무 영역 바로가기">
          {rail.map((item, index) => {
            const on = (item.id === section && index < 3) || (index === 3 && path.startsWith("/workflow")) || (index === 4 && path.startsWith("/indicators"));
            return (
              <Link key={item.label} className={`rail-button ${on ? "is-active" : ""}`} href={item.href} title={item.label}
                onClick={() => { setSection(item.id); setOpenG((o) => ({ ...o, [item.id]: true })); p.onNavigate?.(); }} aria-label={item.label}>
                <MenuIcon name={item.icon} />
              </Link>
            );
          })}
        </nav>
        <div className="rail-bottom">
          <span className="rail-caption">KMU</span>
          <div className="rail-button" title="화면 설정"><MenuIcon name="settings" /></div>
        </div>
      </div>

      <div className="sidebar-detail">
        <Link href="/dashboard" onClick={p.onNavigate} className="sidebar-brand">
          <span className="sidebar-brand-kicker">KOOKMIN UNIVERSITY</span>
          <strong>성과관리통합시스템</strong>
        </Link>

        <div className="sidebar-profile">
          <RoleSwitcher card role={p.role} viewer={p.viewer} faculty={p.faculty} chairs={p.chairs} staff={p.staff} leads={p.leads} heads={p.heads}
            icon={p.roleIcon} color={p.roleColor} desc={p.roleDesc} viewerLabel={p.viewerLabel} />
        </div>

        <div className="sidebar-section-label">업무 메뉴</div>
        <nav className="sidebar-tree">
          {groups.map((g) => (
            <div key={g.id} className="sidebar-group">
              <button className="sidebar-group-button" onClick={() => toggle(g.id)} aria-expanded={openG[g.id]}>
                <span className="group-symbol" style={{ color: g.color }}><MenuIcon name={g.id === "faculty" ? "faculty" : g.id === "staff" ? "staff" : "building"} /></span>
                <span>{g.title}</span>
                <span className={`group-chevron ${openG[g.id] ? "is-open" : ""}`}>›</span>
              </button>
              <AnimatePresence initial={false}>
                {openG[g.id] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
                    <div className="sidebar-links">
                      {g.items.map((it) => {
                        const on = active(it.href, g.id);
                        return (
                          <Link key={it.label + it.href} href={it.href} onClick={p.onNavigate} className={`sidebar-link ${on ? "is-active" : ""}`} style={on ? { "--item-color": g.color } as React.CSSProperties : undefined}>
                            <MenuIcon name={it.icon} />
                            <span>{it.label}</span>
                            {on && <span className="sidebar-link-dot" />}
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

        <div className="sidebar-footer">
          <div className="sidebar-notice"><MenuIcon name="notice" /><span><b>2025 평가 진행 중</b><small>마감까지 18일 남음</small></span></div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function MenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></>,
    faculty: <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4.5c2.8 2 7.2 2 10 0V12M21 9v6"/></>,
    staff: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/></>,
    building: <><path d="M4 20h16M6 20V9h12v11M9 20v-5h6v5M5 9l7-5 7 5"/></>,
    cards: <><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></>,
    compare: <><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/></>,
    workflow: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a3 3 0 0 1 3 3v1M16 14v-2M16 14l-3-3M16 14l3-3M8 18h8"/></>,
    indicators: <><path d="M5 4v16M5 7h9M5 12h14M5 17h7"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="14" cy="17" r="2"/></>,
    analysis: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 12l2-3 2 2 2-4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    notice: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 20h4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
