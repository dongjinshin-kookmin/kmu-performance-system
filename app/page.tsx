import { redirect } from "next/navigation";
import { getSession, ROLES } from "@/lib/rbac";
import { IS_EXPORT } from "@/lib/runtime";
import { ClientRedirect } from "@/components/ClientRedirect";

export default async function Home() {
  // 정적 export: 데모는 인사팀(전사 열람) 고정 → 대시보드로 클라이언트 이동
  if (IS_EXPORT) return <ClientRedirect to="/dashboard" />;
  const s = await getSession();
  redirect(ROLES[s.role].landing(s.viewer));
}
