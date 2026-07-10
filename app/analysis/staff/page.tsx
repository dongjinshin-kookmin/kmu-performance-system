import { analysisStaffData } from "@/lib/queries";
import { corrMatrix, linreg, pearson } from "@/lib/stats";
import { Reveal } from "@/components/ui";
import { Heatmap, Scatterplot } from "@/components/Correlation";
import { DEPT_TYPE_LABEL } from "@/lib/colors";

export const dynamic = "force-dynamic";

const PAL = ["var(--area-R)", "var(--area-E)", "var(--area-I)", "var(--area-S)", "var(--grade-S)", "var(--grade-C)", "var(--accent)", "var(--grade-D)"];
const COLOR: Record<string, string> = {};
Object.keys(DEPT_TYPE_LABEL).forEach((k, i) => { if (i < 8) COLOR[k] = PAL[i]; });

export default async function StaffAnalysis({ searchParams }: { searchParams: Promise<{ x?: string; y?: string }> }) {
  const sp = await searchParams;
  const { metrics, rows } = analysisStaffData();
  const matrix = corrMatrix(metrics, rows);
  const idx = (k: string, d: number) => { const i = metrics.findIndex((m) => m.key === k); return i < 0 ? d : i; };
  const xi = idx(sp.x ?? "mbo", 1);
  const yi = idx(sp.y ?? "svc", 2);
  const xv = rows.map((r) => r.vals[xi]), yv = rows.map((r) => r.vals[yi]);
  const points = rows.map((r) => ({ x: r.vals[xi], y: r.vals[yi], group: r.group, label: r.label }));
  const reg = linreg(xv, yv);
  const r = matrix[yi][xi];

  const insights = [
    { a: "mbo", b: "svc", note: "개인 MBO 달성률과 부서 서비스평가의 연관" },
    { a: "kpi", b: "comp", note: "부서 KPI 달성률과 개인 종합점수의 정렬(캐스케이딩 효과)" },
    { a: "WORK", b: "comp", note: "근무실적 영역이 종합점수에 미치는 연관 강도" },
  ].map((it) => ({ ...it, r: pearson(rows.map((x) => x.vals[idx(it.a, 0)]), rows.map((x) => x.vals[idx(it.b, 0)])), la: metrics[idx(it.a, 0)].label, lb: metrics[idx(it.b, 0)].label }));

  return (
    <main className="wrap" style={{ padding: "2rem 0 5rem" }}>
      <Reveal>
        <div className="eyebrow" style={{ color: "var(--area-I)" }}>직원 성과 · 상관관계 분석</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>지표 상관관계 분석</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.84rem", maxWidth: "70ch" }}>
          일반·기술직 직원 {rows.length}명의 2025-2학기 지표 간 상관을 분석합니다. 셀 클릭 시 산점도로 전환됩니다.
        </p>
      </Reveal>

      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", margin: "22px 0 16px" }}>
        <div className="eyebrow">산점도 · 개인 단위 (색=부서유형) · 추세선</div>
        <div style={{ marginTop: 12 }}>
          <Scatterplot points={points} xLabel={metrics[xi].label} yLabel={metrics[yi].label} r={r} reg={reg} colorMap={COLOR} groupLabel={DEPT_TYPE_LABEL} />
        </div>
      </Reveal>

      <Reveal className="panel" style={{ padding: "1.5rem 1.6rem", marginBottom: 16 }}>
        <div className="eyebrow">전체 상관행렬 · 셀 클릭 → 산점도</div>
        <h2 style={{ fontSize: "1.1rem", margin: "4px 0 16px" }}>지표 간 피어슨 상관계수</h2>
        <Heatmap metrics={metrics} matrix={matrix} xi={xi} yi={yi} base="/analysis/staff" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: "0.7rem", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb, var(--bad) 82%, var(--surface-2))" }} />−1</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--surface-2)", border: "1px solid var(--border)" }} />0</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb, var(--area-E) 82%, var(--surface-2))" }} />+1</span>
        </div>
      </Reveal>

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
          ⚠ 상관관계는 인과관계가 아닙니다(correlation ≠ causation). 표시된 계수는 선형 연관성일 뿐 원인·결과를 의미하지 않습니다.
        </p>
      </Reveal>
    </main>
  );
}
