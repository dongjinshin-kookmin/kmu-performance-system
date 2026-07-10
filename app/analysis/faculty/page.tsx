import { analysisFacultyData } from "@/lib/queries";
import { corrMatrix, linreg, pearson } from "@/lib/stats";
import { Reveal } from "@/components/ui";
import { Heatmap, Scatterplot } from "@/components/Correlation";
import { GROUP_LABEL } from "@/lib/colors";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = {
  G_HSSP: "var(--area-R)", G_ENA: "var(--area-E)", G_ENB: "var(--area-I)", G_ENC: "var(--area-S)", G_ART: "var(--grade-S)",
};

export default async function FacultyAnalysis({ searchParams }: { searchParams: Promise<{ x?: string; y?: string }> }) {
  const sp = await searchParams;
  const { metrics, rows } = analysisFacultyData();
  const matrix = corrMatrix(metrics, rows);
  const idx = (k: string, d: number) => { const i = metrics.findIndex((m) => m.key === k); return i < 0 ? d : i; };
  const xi = idx(sp.x ?? "papers", 5);
  const yi = idx(sp.y ?? "fund", 6);
  const xv = rows.map((r) => r.vals[xi]), yv = rows.map((r) => r.vals[yi]);
  const points = rows.map((r) => ({ x: r.vals[xi], y: r.vals[yi], group: r.group, label: r.label }));
  const reg = linreg(xv, yv);
  const r = matrix[yi][xi];

  const insights = [
    { a: "papers", b: "fund", note: "연구 실적과 연구비 수주는 함께 움직이는 경향" },
    { a: "R", b: "E", note: "연구 표준화점수와 강의평가의 관계(트레이드오프 여부 확인)" },
    { a: "papers", b: "fwci", note: "논문 수와 논문 질(FWCI)의 상관" },
  ].map((it) => ({ ...it, r: pearson(rows.map((x) => x.vals[idx(it.a, 0)]), rows.map((x) => x.vals[idx(it.b, 0)])), la: metrics[idx(it.a, 0)].label, lb: metrics[idx(it.b, 0)].label }));

  return (
    <main className="wrap" style={{ padding: "2rem 0 5rem" }}>
      <Reveal>
        <div className="eyebrow" style={{ color: "var(--area-R)" }}>교원 성과 · 상관관계 분석</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>지표 상관관계 분석</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.84rem", maxWidth: "70ch" }}>
          교원 {rows.length}명의 2025 성과 지표 간 상관을 분석합니다. 히트맵 셀을 클릭하면 해당 지표 쌍의 산점도로 전환됩니다.
        </p>
      </Reveal>

      {/* 산점도 */}
      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", margin: "22px 0 16px" }}>
        <div className="eyebrow">산점도 · 개인 단위 (색=계열그룹) · 추세선</div>
        <div style={{ marginTop: 12 }}>
          <Scatterplot points={points} xLabel={metrics[xi].label} yLabel={metrics[yi].label} r={r} reg={reg} colorMap={COLOR} groupLabel={GROUP_LABEL} />
        </div>
      </Reveal>

      {/* 히트맵 */}
      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", marginBottom: 16 }}>
        <div className="eyebrow">전체 상관행렬 · 셀 클릭 → 산점도</div>
        <h2 style={{ fontSize: "1.1rem", margin: "4px 0 16px" }}>지표 간 피어슨 상관계수</h2>
        <Heatmap metrics={metrics} matrix={matrix} xi={xi} yi={yi} base="/analysis/faculty" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: "0.7rem", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb, var(--bad) 82%, var(--surface-2))" }} />−1 (음)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--surface-2)", border: "1px solid var(--border)" }} />0</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb, var(--area-E) 82%, var(--surface-2))" }} />+1 (양)</span>
        </div>
      </Reveal>

      {/* 인사이트 */}
      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem" }}>
        <div className="eyebrow">예시 인사이트</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
          {insights.map((it, i) => (
            <div key={i} className="panel-2" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{it.la} <span style={{ color: "var(--muted)" }}>↔</span> {it.lb}</div>
              <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, margin: "6px 0", color: it.r >= 0 ? "var(--area-E)" : "var(--bad)" }}>r = {it.r.toFixed(2)}</div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-2)", lineHeight: 1.5 }}>{it.note}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.74rem", color: "var(--warn)", marginTop: 16, padding: "0.7rem 0.9rem", background: "color-mix(in srgb, var(--warn) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", borderRadius: 8 }}>
          ⚠ 상관관계는 인과관계가 아닙니다(correlation ≠ causation). 표시된 계수는 동시 관찰된 지표 간 선형 연관성이며, 원인·결과를 의미하지 않습니다.
        </p>
      </Reveal>
    </main>
  );
}
