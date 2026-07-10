import Link from "next/link";
import { staffIndicatorMaster, staffAreaMaxRows, staffCoefRows, staffGradeCuts } from "@/lib/queries";
import { Reveal, Meter } from "@/components/ui";
import { STAFF_AREA } from "@/lib/colors";

export const dynamic = "force-dynamic";

const LAYER: Record<string, { label: string; color: string }> = {
  FIXED: { label: "🟦확정", color: "var(--ok)" }, ASSUME: { label: "🟨가정", color: "var(--warn)" }, PROPOSE: { label: "🟩제안", color: "var(--accent)" },
};
const STAGE: Record<string, { label: string; color: string }> = {
  SCORE: { label: "본평가", color: "var(--area-I)" }, BONUS: { label: "가·감점", color: "var(--grade-S)" }, MONITOR: { label: "모니터링", color: "var(--muted)" },
};

export default function StaffIndicators() {
  const inds = staffIndicatorMaster();
  const areas90 = staffAreaMaxRows();
  const func200 = staffCoefRows("staff_func_max");
  const gain = staffCoefRows("staff_gain");
  const penalty = staffCoefRows("staff_penalty");
  const cuts = staffGradeCuts();
  const absCut = cuts.filter((c: any) => c.mode === "ABS_CUT");
  const relDist = cuts.filter((c: any) => c.mode === "REL_DIST");

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <span className="chip" style={{ color: "var(--area-I)", borderColor: "var(--area-I)", fontWeight: 700 }}>🧑‍💼 직원</span>
          <Link href="/indicators/faculty" className="chip" style={{ cursor: "pointer" }}>← 교원 지표·배점표</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div className="eyebrow" style={{ color: "var(--area-I)" }}>직원(행정직) 지표체계 · 3태그 레이어</div>
          <span className="chip" style={{ fontSize: "0.6rem", color: "var(--warn)", borderColor: "var(--warn)" }}>🟨가정 = 별표 미확보 잠정값</span>
        </div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>직원 지표 · 산식 투명성</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "62ch" }}>정기평가 90점(일반·기술직)·기능직 200점·가감점·등급정책(STAFF)·N-series 지표. 🟦확정 / 🟨가정(별표 미확보) / 🟩제안 레이어를 명시합니다.</p>
      </Reveal>

      {/* 배점 체계 */}
      <section style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, margin: "20px 0 14px" }}>
        <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }}>
          <div className="eyebrow">정기평가 90점 (일반·기술직) <span style={{ color: "var(--warn)" }}>· 배분 🟨가정</span></div>
          <h2 style={{ fontSize: "1.1rem", margin: "4px 0 14px" }}>5영역 배점</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {areas90.map((a: any) => {
              const meta = STAFF_AREA[a.k];
              return (
                <div key={a.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 100, fontSize: "0.82rem", fontWeight: 500 }}>{meta?.label ?? a.note}</span>
                  <div style={{ flex: 1 }}><Meter value={a.v} max={30} color="var(--area-I)" height={14} /></div>
                  <span className="mono" style={{ width: 36, textAlign: "right", fontWeight: 700 }}>{a.v}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10 }}>합계 90점(🟦확정 총점) · 영역별 배분은 🟨가정</div>
        </Reveal>

        <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }} delay={0.08}>
          <div className="eyebrow">기능직 200점 체계 <span style={{ color: "var(--warn)" }}>· 🟨</span></div>
          <h2 style={{ fontSize: "1.1rem", margin: "4px 0 14px" }}>역량 배점</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {func200.map((a: any) => {
              const meta = STAFF_AREA[a.k];
              return (
                <div key={a.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 108, fontSize: "0.82rem", fontWeight: 500 }}>{meta?.label ?? a.note}</span>
                  <div style={{ flex: 1 }}><Meter value={a.v} max={100} color="var(--area-S)" height={14} /></div>
                  <span className="mono" style={{ width: 36, textAlign: "right", fontWeight: 700 }}>{a.v}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10 }}>합계 200점 · 기능직 별도 트랙</div>
        </Reveal>
      </section>

      {/* 가감점 + 등급정책 */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }}>
          <div className="eyebrow">가점 상한 (🟦확정)</div>
          <h2 style={{ fontSize: "1rem", margin: "4px 0 12px" }}>가점 항목</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gain.map((g: any) => (
              <div key={g.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                <span style={{ color: "var(--text-2)" }}>{g.note || g.k}</span>
                <span className="mono" style={{ fontWeight: 700, color: "var(--ok)" }}>+{g.v}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }} delay={0.06}>
          <div className="eyebrow">징계 감점 (🟦확정)</div>
          <h2 style={{ fontSize: "1rem", margin: "4px 0 12px" }}>감점 항목</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {penalty.map((g: any) => (
              <div key={g.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                <span style={{ color: "var(--text-2)" }}>{g.k}</span>
                <span className="mono" style={{ fontWeight: 700, color: "var(--bad)" }}>−{g.v}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }} delay={0.12}>
          <div className="eyebrow">등급 정책 (STAFF)</div>
          <h2 style={{ fontSize: "1rem", margin: "4px 0 12px" }}>절대컷 + 강제배분</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead><tr style={{ color: "var(--muted)", fontSize: "0.68rem", textAlign: "left" }}><th style={{ padding: "3px 0" }}>등급</th><th>절대컷</th><th>배분</th></tr></thead>
            <tbody>
              {["S", "A", "B", "C", "D"].map((g) => {
                const ab = absCut.find((c: any) => c.grade === g);
                const rl = relDist.find((c: any) => c.grade === g);
                return (
                  <tr key={g} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 0" }}><span className="mono" style={{ display: "inline-block", width: 20, height: 20, borderRadius: 5, background: `var(--grade-${g})`, color: "#fff", textAlign: "center", lineHeight: "20px", fontWeight: 700 }}>{g}</span></td>
                    <td className="mono">{ab?.cut ? `≥ ${ab.cut}` : "< 60"}</td>
                    <td className="mono">{rl?.dist ? `${(rl.dist * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 8 }}>공무원형 강제배분 S20/A30/B30/C10/D10</p>
        </Reveal>
      </section>

      {/* 지표 마스터 N-series */}
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem" }}>
        <div className="eyebrow">지표 마스터 (N-series) · 3태그 레이어</div>
        <h2 style={{ fontSize: "1.1rem", margin: "4px 0 16px" }}>직원 성과 지표</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 7 }}>
          {inds.map((x: any) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "0.5rem 0.6rem", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span className="mono" style={{ fontSize: "0.66rem", color: "var(--muted)", width: 30 }}>{x.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{x.name} {x.isNew ? <span className="chip" style={{ fontSize: "0.52rem", padding: "0 5px", color: "var(--grade-S)", borderColor: "var(--grade-S)" }}>신설</span> : null}</div>
              </div>
              <span className="mono" style={{ fontSize: "0.58rem", color: STAGE[x.stage]?.color ?? "var(--muted)" }}>{STAGE[x.stage]?.label ?? x.stage}</span>
              {LAYER[x.layer] && <span className="chip" style={{ fontSize: "0.56rem", padding: "0 6px", color: LAYER[x.layer].color, borderColor: LAYER[x.layer].color }}>{LAYER[x.layer].label}</span>}
            </div>
          ))}
        </div>
      </Reveal>
    </main>
  );
}
