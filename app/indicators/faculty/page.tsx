import Link from "next/link";
import { paperBands, indicatorMaster, trackWeights, ipUnits, gradeCuts } from "@/lib/queries";
import { Reveal, Meter, Stagger, StaggerItem } from "@/components/ui";
import { AREA, AreaKey } from "@/lib/colors";
import { BAND_LABEL } from "@/lib/format";

const STAGE: Record<string, { label: string; color: string }> = {
  SCORE: { label: "본평가", color: "var(--area-R)" },
  BONUS: { label: "가점", color: "var(--grade-S)" },
  MONITOR: { label: "모니터링", color: "var(--muted)" },
};

export default function FacultyIndicators() {
  const bands = paperBands();
  const inds = indicatorMaster();
  const tracks = trackWeights();
  const ip = ipUnits();
  const cuts = gradeCuts();
  const maxBand = bands[0].v;
  const absCut = cuts.filter((c: any) => c.mode === "ABS_CUT");
  const relDist = cuts.filter((c: any) => c.mode === "REL_DIST");

  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <span className="chip" style={{ color: "var(--area-R)", borderColor: "var(--area-R)", fontWeight: 700 }}>🎓 교원</span>
          <Link href="/indicators/staff" className="chip" style={{ cursor: "pointer" }}>직원 지표·배점표 →</Link>
        </div>
        <div className="eyebrow">교원 지표체계 v1.2 · param 테이블 실시간 조회</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>교원 지표 · 산식 투명성</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "60ch" }}>IF 계단배점·저자환산·트랙 가중·등급정책 — 모든 배점·계수는 코드가 아닌 파라미터 테이블에서 조회해 표시합니다. (원칙 P1 · 산식 투명성)</p>
      </Reveal>

      {/* 계단배점 */}
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem", margin: "20px 0 14px" }}>
        <div className="eyebrow">논문 IF 백분위 계단배점 (별표2-2)</div>
        <h2 style={{ fontSize: "1.15rem", margin: "4px 0 4px" }}>R01 = Σ (계단배점 × 저자환산 2/(N+k) × 융복합 1.3)</h2>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginBottom: 16 }}>v1.1 곱셈 q(강한안)는 대안 계수군으로 보존 · 현재 기본은 계단배점</p>
        <Stagger style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {bands.map((b: any, i: number) => (
            <StaggerItem key={b.k} i={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 150, fontSize: "0.82rem", fontWeight: 500 }}>{BAND_LABEL[b.k] ?? b.k}</span>
              <div style={{ flex: 1 }}><Meter value={b.v} max={maxBand} color="var(--area-R)" height={16} /></div>
              <span className="mono" style={{ width: 60, textAlign: "right", fontWeight: 700, fontSize: "0.95rem" }}>{b.v}</span>
              <span style={{ width: 120, fontSize: "0.7rem", color: "var(--muted)" }}>{b.note}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* 트랙 가중 */}
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }}>
          <div className="eyebrow">트랙별 영역 가중치 (%)</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>교원유형 트랙</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tracks.map((t: any) => (
              <div key={t.code}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{t.name} <span className="mono chip" style={{ fontSize: "0.6rem" }}>{t.code}</span></span>
                </div>
                <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                  {(["R", "E", "I", "S"] as AreaKey[]).map((a) => {
                    const w = t[`w_${a}`];
                    return <div key={a} title={`${AREA[a].full} ${w}%`} style={{ width: `${w}%`, background: `var(--area-${a})`, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--surface)" }}>
                      {w >= 15 && <span className="mono" style={{ fontSize: "0.64rem", color: "#fff", fontWeight: 600 }}>{a}{w}</span>}
                    </div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 등급 정책 */}
        <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }} delay={0.08}>
          <div className="eyebrow">등급 정책 (교원)</div>
          <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>절대컷 + 상대배분 상한 병기</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ color: "var(--muted)", fontSize: "0.7rem", textAlign: "left" }}><th style={{ padding: "4px 0" }}>등급</th><th>절대컷</th><th>상대상한(누적)</th></tr></thead>
            <tbody>
              {["S", "A", "B", "C", "D"].map((g) => {
                const ab = absCut.find((c: any) => c.grade === g);
                const rl = relDist.find((c: any) => c.grade === g);
                return (
                  <tr key={g} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "7px 0" }}><span className="mono" style={{ display: "inline-block", width: 22, height: 22, borderRadius: 5, background: `var(--grade-${g})`, color: "#fff", textAlign: "center", lineHeight: "22px", fontWeight: 700 }}>{g}</span></td>
                    <td className="mono">{ab?.cut ? `≥ ${ab.cut}` : "< 60"}</td>
                    <td className="mono">{rl?.dist ? `${(rl.dist * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 10 }}>S 상위 10% · S+A 35% · D 하위 5% (계열그룹 코호트)</p>
        </Reveal>
      </section>

      {/* 지표 마스터 */}
      <Reveal className="panel" style={{ padding: "1.4rem 1.5rem", marginBottom: 14 }}>
        <div className="eyebrow">지표 마스터 · 25종</div>
        <h2 style={{ fontSize: "1.1rem", margin: "4px 0 16px" }}>영역별 지표 · 반영단계</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {(["R", "E", "I", "S"] as AreaKey[]).map((a) => (
            <div key={a}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(--area-${a})` }} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{AREA[a].full}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {inds.filter((x: any) => x.area === a).map((x: any) => (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.35rem 0.5rem", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <span className="mono" style={{ fontSize: "0.66rem", color: "var(--muted)", width: 30 }}>{x.id}</span>
                    <span style={{ flex: 1, fontSize: "0.76rem" }}>{x.name}</span>
                    {x.isNew ? <span className="chip" style={{ fontSize: "0.56rem", padding: "0 5px", color: "var(--grade-S)", borderColor: "var(--grade-S)" }}>신설</span> : null}
                    <span className="mono" style={{ fontSize: "0.58rem", color: STAGE[x.stage].color }}>{STAGE[x.stage].label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 특허 단가 */}
      <Reveal className="panel" style={{ padding: "1.3rem 1.4rem" }}>
        <div className="eyebrow">특허·지식재산 배점 (별표2-2, 국민대 실값)</div>
        <h2 style={{ fontSize: "1.05rem", margin: "4px 0 14px" }}>I01 지식재산 단가</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px 20px" }}>
          {ip.map((u: any) => (
            <div key={u.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{u.note || u.k}</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--area-I)" }}>{u.v}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </main>
  );
}
