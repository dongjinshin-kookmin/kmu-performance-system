"use client";
import { FeedbackBars } from "./charts";
import { Meter } from "./ui";

interface FB {
  enabled: boolean; invited: number; responded: number; overall: number; weighted: number;
  byRel: { type: string; label: string; n: number; avg: number }[];
  items: { label: string; avg: number }[];
  comments: { rel: string; text: string }[];
}

export function FeedbackSection({ fb }: { fb: FB }) {
  const progress = fb.invited ? Math.round((fb.responded / fb.invited) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--area-I)" }}>🟩제안 · 동료평가 360° · 블라인드</div>
          <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>다면평가 결과 (본인 수신)</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="mono chip">종합 {fb.overall.toFixed(2)} / 5</span>
          <span className="mono chip" style={{ color: "var(--area-I)", borderColor: "var(--area-I)" }}>응답 {fb.responded}/{fb.invited} · {progress}%</span>
        </div>
      </div>
      <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "6px 0 16px", lineHeight: 1.6 }}>
        상사·동료·부하·타부서 협업자의 평가를 관계유형별로 집계합니다. <b style={{ color: "var(--text-2)" }}>평가자는 어떤 역할(본인·부서장·인사팀 포함)에서도 식별되지 않습니다.</b> 관계유형과 평가자 수만 공개됩니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24, marginBottom: 14 }}>
        {/* 관계유형별 비교 */}
        <div>
          <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: 8 }}>관계유형별 평균 (1~5)</div>
          <FeedbackBars data={fb.byRel.map((r) => ({ label: `${r.label} ${r.n}인`, score: r.avg, n: r.n }))} />
        </div>
        {/* 문항별 강약 */}
        <div>
          <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: 10 }}>역량 문항별 강·약</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fb.items.map((it, i) => (
              <div key={it.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>{it.label}</span>
                  <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-2)", fontWeight: 700 }}>{it.avg.toFixed(2)}<span style={{ color: "var(--border-strong)" }}> / 5</span></span>
                </div>
                <Meter value={it.avg} max={5} color={i === 0 ? "var(--ok)" : i === fb.items.length - 1 ? "var(--warn)" : "var(--area-I)"} height={7} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 익명 서술 코멘트 */}
      {fb.comments.length > 0 && (
        <div>
          <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: 8 }}>익명 서술 코멘트 · {fb.comments.length}건</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {fb.comments.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "0.7rem 0.8rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span className="chip" style={{ flexShrink: 0, fontSize: "0.62rem", height: "fit-content", color: "var(--area-I)", borderColor: "var(--area-I)" }}>{c.rel}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.55 }}>{c.text}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 10 }}>※ 코멘트는 관계유형 라벨만 표시되며 작성자를 특정할 수 있는 정보는 저장·노출되지 않습니다.</p>
        </div>
      )}
    </div>
  );
}
