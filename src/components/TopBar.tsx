import Link from "next/link";
import { getSession, ROLES } from "@/lib/rbac";
import { roleOptions, staffRoleOptions, getViewer } from "@/lib/queries";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./theme";
import { Nav } from "./Nav";

export async function TopBar() {
  const s = await getSession();
  const { faculty, chairs } = roleOptions();
  const { staff, leads, heads } = staffRoleOptions();
  const viewer = getViewer(s);
  const def = ROLES[s.role];

  const links: { href: string; label: string }[] = [];
  if (s.role === "PRESIDENT" || s.role === "HR_TEAM") {
    links.push({ href: "/dashboard", label: "총괄 대시보드" }, { href: "/departments", label: "학과 비교" }, { href: "/units", label: "부서 KPI" }, { href: "/indicators", label: "지표·산식" });
    if (s.role === "HR_TEAM") links.push({ href: "/workflow", label: "평가 워크플로" });
  } else if (s.role === "DEPT_CHAIR") {
    links.push({ href: "/departments", label: "학과 비교" }, { href: "/workflow", label: "평가 워크플로" }, { href: "/indicators", label: "지표·산식" });
  } else if (s.role === "EVAL_COMMITTEE") {
    links.push({ href: "/workflow", label: "심의 대기열" }, { href: "/indicators", label: "지표·산식" });
  } else if (s.role === "FACULTY") {
    if (viewer) links.push({ href: `/faculty/${viewer.id}`, label: "내 성과카드" });
    links.push({ href: "/workflow", label: "내 평가" }, { href: "/indicators", label: "지표·산식" });
  } else if (s.role === "STAFF") {
    if (viewer) links.push({ href: `/staff/${viewer.id}`, label: "내 성과카드" });
    links.push({ href: "/workflow", label: "내 평가" }, { href: "/indicators", label: "지표·산식" });
  } else if (s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD") {
    links.push({ href: "/units", label: "부서 KPI" }, { href: "/workflow", label: "부서 평가" }, { href: "/indicators", label: "지표·산식" });
  }

  const scope = viewer
    ? `${viewer.dept} · ${viewer.name}${viewer.rank ? " " + viewer.rank : ""}`
    : def.scope === "ORG_ALL" ? "전사 범위" : def.scope;

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(12px)", background: "color-mix(in srgb, var(--bg) 82%, transparent)", borderBottom: "1px solid var(--border)" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 20, height: 62 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), var(--area-R))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: "0.9rem" }}>K</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.02em" }}>성과관리통합시스템</div>
            <div className="eyebrow" style={{ fontSize: "0.56rem" }}>KOOKMIN · v1.2</div>
          </div>
        </Link>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", overflowX: "auto" }}>
          <Nav links={links} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <RoleSwitcher role={s.role} viewer={s.viewer} faculty={faculty} chairs={chairs} staff={staff} leads={leads} heads={heads} />
        </div>
      </div>
      {/* 스코프 배너 */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 12, height: 34, fontSize: "0.74rem" }}>
          <span className="eyebrow">접근 범위</span>
          <span style={{ color: "var(--text-2)" }}>{scope}</span>
          {!def.seeIndividualRaw && <span className="chip" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>개인 raw 비노출 · n&lt;5 마스킹</span>}
          <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{def.desc}</span>
        </div>
      </div>
    </header>
  );
}
