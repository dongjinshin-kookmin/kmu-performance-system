import Link from "next/link";
import { getSession, ROLES } from "@/lib/rbac";
import { workflowQueue, staffWorkflowQueue } from "@/lib/queries";
import { Reveal, GradeBadge, Stagger, StaggerItem } from "@/components/ui";
import { STATUS_LABEL, VERSION_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  FINALIZED: "var(--ok)", COMMITTEE: "var(--warn)", NOTIFIED: "var(--area-R)", CHAIR_REVIEW: "var(--area-I)",
};

export default async function Workflow() {
  const s = await getSession();
  const isStaff = s.role === "STAFF" || s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD";
  const rows = isStaff ? staffWorkflowQueue(s) : workflowQueue(s);
  const totalSteps = isStaff ? 9 : 7;
  const def = ROLES[s.role];
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div className="eyebrow">2025 사이클 · 7단계 워크플로</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>
          {s.role === "EVAL_COMMITTEE" ? "평가위원 심의 대기열" : s.role === "FACULTY" || s.role === "STAFF" ? "내 평가 진행" : isStaff ? "부서 평가 진행" : "평가 워크플로"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.84rem" }}>{def.name} 접근 범위 · {rows.length}건 {isStaff ? "· 2025-2학기 반기 평가" : "· 2025 사이클"}</p>
      </Reveal>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {Object.entries(byStatus).map(([st, n]) => (
          <span key={st} className="chip" style={{ borderColor: STATUS_COLOR[st] ?? "var(--border-strong)", color: STATUS_COLOR[st] ?? "var(--text-2)" }}>
            {STATUS_LABEL[st] ?? st} <b className="mono">{n}</b>
          </span>
        ))}
      </div>

      <Stagger style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {rows.map((r: any, i: number) => (
          <StaggerItem key={r.id} i={Math.min(i, 12)}>
            <Link href={`/workflow/${r.id}`} className="panel row-hover" style={{ display: "block", padding: "1rem 1.1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{r.name}</div>
                  <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{r.dept}</div>
                </div>
                <GradeBadge grade={r.grade} size="sm" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span className="chip" style={{ fontSize: "0.64rem", borderColor: STATUS_COLOR[r.status] ?? "var(--border-strong)", color: STATUS_COLOR[r.status] ?? "var(--text-2)" }}>
                  {STATUS_LABEL[r.status]} · {r.step}/{totalSteps}
                </span>
                {r.version === "V_2024" && <span className="chip" style={{ fontSize: "0.6rem" }}>{r.gate ? "게이트 충족" : "게이트 미충족"}</span>}
                {r.mgrRole && <span className="chip" style={{ fontSize: "0.6rem" }}>{r.mgrRole === "DEPT_HEAD" ? "부서장" : "팀장"}</span>}
                <span className="mono" style={{ marginLeft: "auto", fontWeight: 700, fontSize: "1rem" }}>{r.score}</span>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      {rows.length === 0 && <div className="panel" style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>표시할 평가 건이 없습니다.</div>}
    </main>
  );
}
