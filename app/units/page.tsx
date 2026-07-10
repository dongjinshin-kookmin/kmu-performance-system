import Link from "next/link";
import { getSession } from "@/lib/rbac";
import { unitRanking, unitKpis, unitMembers, unitCascade, getViewer } from "@/lib/queries";
import { Reveal, Meter, GradeBadge } from "@/components/ui";
import { GradeStack } from "@/components/charts";
import { BSC, DEPT_TYPE_LABEL } from "@/lib/colors";
import { DEPT_TYPES } from "@/generator/staffData";

export const dynamic = "force-dynamic";

const KPI_TARGET = new Map<string, string>();
for (const dt of DEPT_TYPES) for (const k of dt.kpis) KPI_TARGET.set(k.code, k.target);

export default async function Units({ searchParams }: { searchParams: Promise<{ type?: string; dept?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  const viewer = getViewer(s);
  const scoped = s.role === "TEAM_LEAD" || s.role === "DEPT_HEAD";
  const canLink = s.role !== "PRESIDENT";

  const type = scoped ? undefined : sp.type && sp.type !== "ALL" ? sp.type : undefined;
  const ranking = unitRanking(20252, type);
  const selDept = sp.dept ? Number(sp.dept) : scoped ? viewer?.orgId : ranking[0]?.id;
  const kpis = selDept ? unitKpis(selDept) : [];
  const members = selDept ? unitMembers(selDept) : [];
  const cascade = selDept ? unitCascade(selDept) : new Map();
  const selRow = ranking.find((r: any) => r.id === selDept);
  const types = ["ALL", ...Object.keys(DEPT_TYPE_LABEL)];

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div className="eyebrow">2025-2학기 · {scoped ? "부서 뷰" : "부서 KPI · BSC 캐스케이딩"}</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>부서 KPI 대시보드</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>🟩제안 · 대학 전략 → 부서 KPI(BSC 4관점) → 개인 MBO 하향정렬</p>
      </Reveal>

      {!scoped && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "16px 0" }}>
          {types.map((t) => {
            const active = (sp.type ?? "ALL") === t;
            return (
              <Link key={t} href={t === "ALL" ? "/units" : `/units?type=${t}`} className="chip"
                style={{ cursor: "pointer", fontWeight: active ? 700 : 500, background: active ? "var(--accent-soft)" : "transparent", borderColor: active ? "var(--accent)" : "var(--border-strong)", color: active ? "var(--accent)" : "var(--text-2)" }}>
                {t === "ALL" ? "전체" : DEPT_TYPE_LABEL[t]}
              </Link>
            );
          })}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 14 }}>
        {/* 부서 랭킹 */}
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }}>
          <div className="eyebrow">부서 랭킹</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>KPI 평균 달성률</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 560, overflowY: "auto" }}>
            {ranking.map((d: any, i: number) => {
              const sel = d.id === selDept;
              return (
                <Link key={d.id} href={`/units?${type ? `type=${type}&` : ""}dept=${d.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "0.5rem 0.6rem", borderRadius: 8, background: sel ? "var(--accent-soft)" : "transparent", cursor: "pointer" }}>
                  <span className="mono" style={{ width: 20, color: i < 3 ? "var(--accent)" : "var(--muted)", fontSize: "0.78rem", fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
                      <span style={{ fontWeight: sel ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.dept}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{d.kpi}%</span>
                    </div>
                    <Meter value={d.kpi - 55} max={75} color={sel ? "var(--accent)" : i < 3 ? "var(--area-I)" : "var(--border-strong)"} height={5} />
                  </span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* 부서 상세 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {selRow && (
            <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.05}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div><div className="eyebrow">{DEPT_TYPE_LABEL[selRow.type]}</div>
                  <h2 style={{ fontSize: "1.2rem", margin: "3px 0 0" }}>{selRow.dept}</h2></div>
                <span className="mono" style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{selRow.n}명 · 종합 {selRow.score}</span>
              </div>
              {/* KPI 카드 (BSC) */}
              <div className="eyebrow" style={{ fontSize: "0.6rem", margin: "14px 0 8px" }}>부서 KPI · BSC 4관점</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
                {kpis.map((k: any) => (
                  <div key={k.code} className="panel-2" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.7rem 0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="chip" style={{ fontSize: "0.56rem", borderColor: `var(--area-${k.bsc === "F" ? "I" : k.bsc === "C" ? "R" : k.bsc === "P" ? "E" : "S"})` }}>{BSC[k.bsc]?.label}</span>
                      {k.alimni ? <span className="chip" style={{ fontSize: "0.54rem", color: "var(--accent)", borderColor: "var(--accent)" }}>공시연동</span> : null}
                    </div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, minHeight: 32 }}>{k.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "4px 0" }}>
                      <span className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: k.rate >= 100 ? "var(--ok)" : "var(--text)" }}>{k.rate}</span>
                      <span style={{ fontSize: "0.64rem", color: "var(--muted)" }}>% · 목표 {KPI_TARGET.get(k.code) ?? "-"}</span>
                    </div>
                    <Meter value={k.rate} max={130} color={`var(--area-${k.bsc === "F" ? "I" : k.bsc === "C" ? "R" : k.bsc === "P" ? "E" : "S"})`} height={5} />
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* 캐스케이딩 트리 */}
          {cascade.size > 0 && (
            <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.1}>
              <div className="eyebrow">캐스케이딩 · 부서 KPI → 개인 MBO</div>
              <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>목표 하향정렬</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[...cascade.entries()].slice(0, 4).map(([code, v]: any) => (
                  <div key={code} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 12 }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: 6 }}>📊 {v.name} <span className="mono chip" style={{ fontSize: "0.55rem" }}>{code}</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {v.goals.map((g: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: "var(--text-2)" }}>
                          <span style={{ color: "var(--muted)" }}>↳</span>
                          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.goal}</span>
                          <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{g.person}</span>
                          <span className="mono" style={{ fontWeight: 600, color: g.rate >= 100 ? "var(--ok)" : "var(--warn)", width: 40, textAlign: "right" }}>{g.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* 구성원 */}
          {members.length > 0 && (
            <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.15}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div className="eyebrow">구성원 {canLink ? "(클릭 → 성과카드)" : "(익명)"}</div>
                {selRow && <div style={{ width: 200 }}><GradeStack dist={{ S: selRow.s, A: selRow.a, B: selRow.b, C: selRow.c, D: selRow.d }} height={20} /></div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 260, overflowY: "auto" }}>
                {members.map((m: any, i: number) => {
                  const inner = (
                    <>
                      <span className="mono" style={{ width: 18, color: "var(--muted)", fontSize: "0.72rem" }}>{i + 1}</span>
                      <GradeBadge grade={m.grade} size="sm" />
                      <span style={{ flex: 1, fontSize: "0.82rem" }}>{canLink ? m.name : `직원 ${String(m.id).padStart(3, "0")}`}{m.mgrRole ? <span className="chip" style={{ fontSize: "0.52rem", marginLeft: 6 }}>{m.mgrRole === "DEPT_HEAD" ? "부서장" : "팀장"}</span> : null}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{m.jobGrade}</span>
                      <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)", width: 44, textAlign: "right" }}>MBO {m.mbo}%</span>
                      <span className="mono" style={{ fontWeight: 600, fontSize: "0.84rem", width: 44, textAlign: "right" }}>{m.comp.toFixed(1)}</span>
                    </>
                  );
                  return canLink
                    ? <Link key={m.id} href={`/staff/${m.id}`} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 9, padding: "0.4rem 0.5rem", borderRadius: 7 }}>{inner}</Link>
                    : <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "0.4rem 0.5rem" }}>{inner}</div>;
                })}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}
