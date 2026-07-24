"use client";
import { useState, useTransition } from "react";
import { saveEvaluation } from "@/lib/actions";

export interface EvalArea { area: string; raw: number; max: number; }

// 정기평가 5영역 라벨(일반·기술직 90점 체계).
const AREA_LABEL: Record<string, string> = {
  WORK: "근무실적", ATTITUDE: "근무태도", JOB_COMP: "직무역량", LEADERSHIP: "리더십", DEPT_SVC: "부서 서비스성과",
};
const AREA_COLOR: Record<string, string> = {
  WORK: "var(--area-R)", ATTITUDE: "var(--area-E)", JOB_COMP: "var(--area-S)", LEADERSHIP: "var(--area-I)", DEPT_SVC: "var(--grade-S)",
};
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "COMMITTEE", label: "심의(COMMITTEE)" },
  { value: "NOTIFIED", label: "통보(NOTIFIED)" },
  { value: "FINALIZED", label: "확정(FINALIZED)" },
];

const label: React.CSSProperties = { display: "block", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.02em", marginBottom: 6 };
const field: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.7rem", borderRadius: 9, border: "1px solid var(--border-strong)",
  background: "var(--surface-2)", color: "var(--text)", fontSize: "0.86rem",
};

export function EvalForm({ evalId, personId, areas, comment: initComment, status: initStatus }: {
  evalId: number; personId: number; areas: EvalArea[]; comment: string; status: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scores, setScores] = useState<Record<string, string>>(
    () => Object.fromEntries(areas.map((a) => [a.area, String(a.raw ?? 0)]))
  );
  const [comment, setComment] = useState(initComment ?? "");
  const [status, setStatus] = useState(STATUS_OPTIONS.some((o) => o.value === initStatus) ? initStatus : "COMMITTEE");

  const setScore = (area: string, v: string) => setScores((p) => ({ ...p, [area]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const areaScores: Record<string, number> = {};
    for (const a of areas) {
      const n = Number(scores[a.area]);
      if (Number.isFinite(n)) areaScores[a.area] = n;
    }
    start(async () => {
      try {
        await saveEvaluation(evalId, { personId, areas: areaScores, comment: comment.trim(), status });
        setMsg({ ok: true, text: "평가가 저장되었습니다. 새로고침하면 영역 점수·상태가 반영됩니다." });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "저장 중 오류가 발생했습니다." });
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <div>
          <div className="eyebrow">평가자 · 근거 기반 평가 입력</div>
          <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>5영역 점수·코멘트</h2>
        </div>
        <span className="mono chip">위 업무일지를 근거로 평가</span>
      </div>
      <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "6px 0 16px", lineHeight: 1.6 }}>
        바로 위 업무 수행 내용·증빙·연결 KPI를 근거로 각 영역 점수(영역 만점 이내)를 입력합니다. 인상 평가가 아닌 근거 기반 평가입니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px 20px" }}>
        {areas.map((a) => {
          const color = AREA_COLOR[a.area] ?? "var(--accent)";
          return (
            <div key={a.area}>
              <label style={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
                  {AREA_LABEL[a.area] ?? a.area}
                  <span className="mono" style={{ color: "var(--border-strong)", fontWeight: 500 }}>/ {a.max}점</span>
                </span>
              </label>
              <input type="number" step="0.1" min={0} max={a.max} style={{ ...field, fontFamily: "var(--font-mono, monospace)" }}
                value={scores[a.area] ?? ""} onChange={(e) => setScore(a.area, e.target.value)} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={label}>평가 코멘트</label>
        <textarea style={{ ...field, minHeight: 74, resize: "vertical" }} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="근거(수행 업무·증빙)에 기반한 평가 의견" />
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 200 }}>
          <label style={label}>상태 전이</label>
          <select style={field} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={pending}
          style={{ padding: "0.55rem 1.4rem", borderRadius: 999, cursor: pending ? "default" : "pointer", fontSize: "0.85rem", fontWeight: 700,
            border: "1px solid var(--area-I)", background: pending ? "var(--surface-2)" : "var(--area-I)", color: pending ? "var(--muted)" : "#fff" }}>
          {pending ? "저장 중…" : "평가 저장"}
        </button>
        {msg && (
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: msg.ok ? "var(--ok)" : "var(--bad)", alignSelf: "center" }}>
            {msg.ok ? "✓ " : "⚠ "}{msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
