import Link from "next/link";
import { getSession } from "@/lib/rbac";
import { deptRanking, deptScores, getViewer } from "@/lib/queries";
import { Reveal, Meter, GradeBadge, CountUp } from "@/components/ui";
import { DeptStrip, GradeStack } from "@/components/charts";
import { GROUP_LABEL } from "@/lib/colors";
import { IS_EXPORT } from "@/lib/runtime";

export default async function Departments({ searchParams }: { searchParams: Promise<{ group?: string; dept?: string }> }) {
  const sp = IS_EXPORT ? {} : await searchParams;
  const s = await getSession();
  const viewer = getViewer(s);
  const isChair = s.role === "DEPT_CHAIR";
  const canLink = s.role !== "PRESIDENT"; // 총장은 개인 raw 비노출

  const group = isChair ? viewer?.group : sp.group && sp.group !== "ALL" ? sp.group : undefined;
  const ranking = deptRanking(2025, group);
  const selDept = sp.dept ? Number(sp.dept) : isChair ? viewer?.orgId : ranking[0]?.id;
  const detail = selDept ? deptScores(selDept) : [];
  const detailName = ranking.find((r: any) => r.id === selDept)?.dept ?? (detail.length ? viewer?.dept : "");
  const groups = ["ALL", ...Object.keys(GROUP_LABEL)];

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div className="eyebrow">2025 사이클 · {isChair ? "학과장 뷰" : "학과·단과대 비교"}</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 14px" }}>학과 성과 비교</h1>
      </Reveal>

      {!isChair && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {groups.map((g) => {
            const active = (sp.group ?? "ALL") === g;
            return (
              <Link key={g} href={g === "ALL" ? "/departments" : `/departments?group=${g}`}
                className="chip" style={{ cursor: "pointer", fontWeight: active ? 700 : 500, background: active ? "var(--accent-soft)" : "transparent", borderColor: active ? "var(--accent)" : "var(--border-strong)", color: active ? "var(--accent)" : "var(--text-2)" }}>
                {g === "ALL" ? "전체" : GROUP_LABEL[g]}
              </Link>
            );
          })}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
        {/* 랭킹 */}
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }}>
          <div className="eyebrow">학과 랭킹</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 12px" }}>평균 종합점수 {group ? `· ${GROUP_LABEL[group]}` : ""}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 560, overflowY: "auto" }}>
            {ranking.map((d: any, i: number) => {
              const sel = d.id === selDept;
              return (
                <Link key={d.id} href={`/departments?${group ? `group=${group}&` : ""}dept=${d.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.6rem", borderRadius: 8, background: sel ? "var(--accent-soft)" : "transparent", cursor: "pointer" }}>
                  <span className="mono" style={{ width: 22, color: i < 3 ? "var(--accent)" : "var(--muted)", fontSize: "0.8rem", fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 3 }}>
                      <span style={{ fontWeight: sel ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.dept}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{d.score} <span style={{ color: "var(--muted)", fontWeight: 400 }}>·{d.n}</span></span>
                    </div>
                    <Meter value={d.score - 70} max={25} color={sel ? "var(--accent)" : i < 3 ? "var(--area-R)" : "var(--border-strong)"} height={5} />
                  </span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* 학과 상세 */}
        <Reveal className="panel" style={{ padding: "1.2rem 1.3rem" }} delay={0.08}>
          {detail.length > 0 ? (() => {
            const r = ranking.find((x: any) => x.id === selDept);
            const dist: Record<string, number> = r ? { S: r.s, A: r.a, B: r.b, C: r.c, D: r.d } : { S: 0, A: 0, B: 0, C: 0, D: 0 };
            return (
              <>
                <div className="eyebrow">학과 상세</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h2 style={{ fontSize: "1.15rem", margin: "4px 0 2px" }}>{detailName}</h2>
                  <span className="mono" style={{ color: "var(--muted)", fontSize: "0.78rem" }}><CountUp value={detail.length} />명</span>
                </div>
                <div className="eyebrow" style={{ fontSize: "0.6rem", margin: "14px 0 2px" }}>구성원 종합점수 분포</div>
                <DeptStrip scores={detail.map((x: any) => ({ name: x.name, t: x.t, grade: x.grade }))} />
                {r && <div style={{ margin: "10px 0 16px" }}><GradeStack dist={dist} height={26} /></div>}
                <div className="eyebrow" style={{ fontSize: "0.6rem", marginBottom: 8 }}>구성원 {canLink ? "(클릭 → 성과카드)" : "(총장 뷰 · 익명)"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 300, overflowY: "auto" }}>
                  {detail.map((m: any, i: number) => {
                    const inner = (
                      <>
                        <span className="mono" style={{ width: 20, color: "var(--muted)", fontSize: "0.74rem" }}>{i + 1}</span>
                        <GradeBadge grade={m.grade} size="sm" />
                        <span style={{ flex: 1, fontSize: "0.82rem" }}>{canLink ? m.name : `교원 ${String(m.id).padStart(3, "0")}`}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{m.rank}</span>
                        <span className="mono" style={{ fontWeight: 600, fontSize: "0.84rem", width: 46, textAlign: "right" }}>{m.t.toFixed(1)}</span>
                      </>
                    );
                    return canLink ? (
                      <Link key={m.id} href={`/faculty/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.4rem 0.5rem", borderRadius: 7 }} className="row-hover">{inner}</Link>
                    ) : (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.4rem 0.5rem" }}>{inner}</div>
                    );
                  })}
                </div>
              </>
            );
          })() : <p style={{ color: "var(--muted)" }}>학과를 선택하세요.</p>}
        </Reveal>
      </section>
    </main>
  );
}
