import type { Metadata } from "next";
// 자체 호스팅 폰트(빌드 시 네트워크 불필요)
import "@fontsource/ibm-plex-sans-kr/400.css";
import "@fontsource/ibm-plex-sans-kr/500.css";
import "@fontsource/ibm-plex-sans-kr/600.css";
import "@fontsource/ibm-plex-sans-kr/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { AppShell } from "@/components/AppShell";
import { getSession, ROLES, RoleCode } from "@/lib/rbac";
import { roleOptions, staffRoleOptions, getViewer } from "@/lib/queries";

export const metadata: Metadata = {
  title: "국민대 성과관리통합시스템",
  description: "교수·직원 성과 지표·평가 대시보드 (Phase 3)",
};

const ICON: Record<RoleCode, string> = {
  PRESIDENT: "🏛️", HR_TEAM: "👥", FACULTY: "🎓", DEPT_CHAIR: "🏫", EVAL_COMMITTEE: "⚖️",
  STAFF: "🧑‍💼", TEAM_LEAD: "📋", DEPT_HEAD: "🗂️",
};
const KIND_COLOR: Record<RoleCode, string> = {
  FACULTY: "var(--area-R)", DEPT_CHAIR: "var(--area-R)", EVAL_COMMITTEE: "var(--area-R)",
  STAFF: "var(--area-I)", TEAM_LEAD: "var(--area-I)", DEPT_HEAD: "var(--area-I)",
  HR_TEAM: "var(--accent)", PRESIDENT: "var(--accent)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  // A3: 마스킹(총장·기획처) 세션에서는 역할전환기/커맨드팔레트 직렬화 데이터에 실명·person_id·소속이
  // HTML 소스로 누출되지 않도록 인물 옵션 목록을 비운다. 총장은 개인 선택 드롭다운 자체가 없고,
  // 역할 버튼 전환은 이 배열과 무관하게 동작하므로 역할 전환 데모 기능은 그대로 유지된다.
  const masked = !ROLES[s.role].seeIndividualRaw;
  const { faculty, chairs } = masked ? { faculty: [], chairs: [] } : roleOptions();
  const { staff, leads, heads } = masked ? { staff: [], leads: [], heads: [] } : staffRoleOptions();
  const viewer = getViewer(s);
  const def = ROLES[s.role];
  const facultyKind = s.role === "FACULTY";
  const staffKind = s.role === "STAFF" || s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD";
  const facultyLinkId = facultyKind && s.viewer ? s.viewer : faculty[0]?.id ?? 1;
  const staffLinkId = staffKind && s.viewer ? s.viewer : staff[0]?.id ?? 601;
  const viewerLabel = viewer
    ? `${viewer.dept} · ${viewer.name}${viewer.rank ? " " + viewer.rank : ""}`
    : def.scope === "ORG_ALL" ? "전사 열람 범위" : def.scope;

  const sidebar = {
    role: s.role, viewer: s.viewer, roleName: def.name, roleIcon: ICON[s.role], roleColor: KIND_COLOR[s.role],
    roleDesc: def.desc, viewerLabel, faculty, chairs, staff, leads, heads, facultyLinkId, staffLinkId,
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell sidebar={sidebar}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
