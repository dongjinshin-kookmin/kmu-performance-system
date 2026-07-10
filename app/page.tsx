import { redirect } from "next/navigation";
import { getSession, ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSession();
  redirect(ROLES[s.role].landing(s.viewer));
}
