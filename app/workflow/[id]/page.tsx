import Link from "next/link";
import { getSession } from "@/lib/rbac";
import { evalById, workflowSteps, canViewPerson } from "@/lib/queries";
import { Reveal, GradeBadge } from "@/components/ui";
import { Stepper } from "@/components/Stepper";
import { STATUS_LABEL, VERSION_LABEL, TRACK_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkflowDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const s = await getSession();
  const e = evalById(id);
  if (!e) return <main className="wrap" style={{ padding: "3rem 0" }}><div className="panel" style={{ padding: "2rem" }}>존재하지 않는 평가입니다.</div></main>;
  const isStaff = e.cycle > 20000;
  const perm = canViewPerson(s, e.pid);
  const steps = workflowSteps(id);
  const canCard = perm.ok && !perm.masked;

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem", maxWidth: 920 }}>
      <Reveal>
        <Link href="/workflow" className="chip" style={{ cursor: "pointer", marginBottom: 14, display: "inline-flex" }}>← 워크플로 목록</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">{e.dept} · 2025 평가</div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "6px 0 8px" }}>{perm.masked ? `교원 ${String(e.pid).padStart(3, "0")}` : e.name}</h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {e.rank && <span className="chip">{e.rank}</span>}
              {e.track && <span className="chip">{TRACK_LABEL[e.track]}</span>}
              <span className="chip">{VERSION_LABEL[e.version]}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <GradeBadge grade={e.grade} size="lg" />
            <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: 6 }}>{e.score}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{e.status === "COMMITTEE" ? "확정 전 · 등급 비공개" : "종합점수"}</div>
          </div>
        </div>
      </Reveal>

      <Reveal className="panel" style={{ padding: "1.6rem 1.8rem", margin: "18px 0 14px" }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>진행 상태 · {STATUS_LABEL[e.status]} ({e.step}/{isStaff ? 9 : 7})</div>
        <Stepper current={e.step} mode={isStaff ? "staff" : "faculty"} />
      </Reveal>

      <section style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }}>
          <div className="eyebrow">단계 이력 · 감사 추적</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 16px" }}>워크플로 로그</h2>
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: "var(--border)" }} />
            {steps.map((st: any, i: number) => (
              <div key={i} style={{ position: "relative", paddingBottom: 18 }}>
                <div style={{ position: "absolute", left: -19, top: 3, width: 12, height: 12, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--surface)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{STATUS_LABEL[st.t] ?? st.t}</span>
                  <span className="mono chip" style={{ fontSize: "0.6rem" }}>{st.actor}</span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-2)", marginTop: 2 }}>{st.comment}</div>
              </div>
            ))}
            {steps.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>기록된 단계 이력이 없습니다(과거 사이클).</p>}
          </div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }} delay={0.08}>
          <div className="eyebrow">정성 평가 · 게이트</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>심의 메모</h2>
          <div style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 10px" }}><b style={{ color: "var(--text)" }}>학과장</b> · {e.chairC ?? "—"}</p>
            <p style={{ margin: 0 }}><b style={{ color: "var(--text)" }}>평가위</b> · {e.commC ?? "—"}</p>
          </div>
          {e.version === "V_2024" && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div className="eyebrow" style={{ fontSize: "0.58rem", marginBottom: 8 }}>[현행] 게이트</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.3rem" }}>{e.gate ? "✅" : "⚠️"}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: e.gate ? "var(--ok)" : "var(--warn)" }}>{e.gate ? "충족" : "미충족"} · MT {e.mtRate}%</span>
              </div>
            </div>
          )}
          {canCard && <Link href={`${isStaff ? "/staff" : "/faculty"}/${e.pid}`} className="chip" style={{ marginTop: 16, cursor: "pointer", display: "inline-flex", borderColor: "var(--accent)", color: "var(--accent)" }}>성과카드 열기 →</Link>}
        </Reveal>
      </section>
    </main>
  );
}
