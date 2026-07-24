"use client";
import { useState, useTransition } from "react";
import { createWorklog } from "@/lib/actions";

export interface WorklogFormKpi { code: string; name: string; }
export interface WorklogFormMember { id: number; name: string; }

// 증빙 유형 — worklog.ts:EVIDENCE_TYPES 와 동일.
const EVIDENCE_TYPES = ["기안문", "회의록", "공문", "결과보고서", "집계표", "품의서", "회신공문", "매뉴얼", "실적대장"];
// 전 부서 공통 반복 행정업무 — worklog.ts:GENERIC 표본.
const COMMON_CATEGORIES = [
  "주간 업무보고 작성·제출", "부서 정기회의 참석·회의록 작성", "공문 접수·기안 처리", "대내외 민원 응대·처리결과 회신",
  "예산 집행 품의·정산 처리", "월말 실적 집계·보고", "유관부서 협조 요청 대응", "내부 결재문서 검토·회람",
];

const label: React.CSSProperties = { display: "block", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.02em", marginBottom: 6 };
const field: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.7rem", borderRadius: 9, border: "1px solid var(--border-strong)",
  background: "var(--surface-2)", color: "var(--text)", fontSize: "0.86rem",
};

const today = () => new Date().toISOString().slice(0, 10);

export function WorklogForm({ personId, half, kpis, deptCategories, members }: {
  personId: number; half: number; kpis: WorklogFormKpi[]; deptCategories: string[]; members: WorklogFormMember[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(deptCategories[0] ?? COMMON_CATEGORIES[0]);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [summary, setSummary] = useState("");
  const [evidenceType, setEvidenceType] = useState(EVIDENCE_TYPES[0]);
  const [evidenceDoc, setEvidenceDoc] = useState("");
  const [kpiCode, setKpiCode] = useState("");
  const [mboGoal, setMboGoal] = useState("");
  const [collab, setCollab] = useState<Set<number>>(new Set());

  const deptSet = new Set(deptCategories);
  const toggleCollab = (id: number) =>
    setCollab((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function reset() {
    setTitle(""); setSummary(""); setEvidenceDoc(""); setKpiCode(""); setMboGoal("");
    setCollab(new Set()); setStartDate(today()); setEndDate(today());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) { setMsg({ ok: false, text: "제목을 입력하세요." }); return; }
    start(async () => {
      try {
        await createWorklog(personId, half, {
          title: title.trim(),
          category,
          deptSpecific: deptSet.has(category),
          start: startDate,
          end: endDate,
          summary: summary.trim(),
          evidenceType,
          evidenceDoc: evidenceDoc.trim(),
          kpiCode: kpiCode || null,
          mboGoal: mboGoal.trim() || null,
          collaboratorIds: [...collab],
        });
        reset();
        setMsg({ ok: true, text: "업무기록이 저장되어 아래 업무일지에 반영되었습니다." });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "저장 중 오류가 발생했습니다." });
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <div>
          <div className="eyebrow">직원 본인 · 자기작성 업무기록</div>
          <h2 style={{ fontSize: "1.15rem", margin: "4px 0 0" }}>수행 업무 작성</h2>
        </div>
        <span className="mono chip">저장 즉시 업무일지 반영</span>
      </div>
      <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "6px 0 16px", lineHeight: 1.6 }}>
        무엇을 수행했는지(제목·기간·요약)와 근거(증빙)·연결 KPI를 기록합니다. 저장하면 평가자가 이 내용을 근거로 평가합니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px 20px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={label}>제목</label>
          <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 학사민원 원스톱 처리체계 구축" />
        </div>

        <div>
          <label style={label}>카테고리 (부서 특화 / 공통 행정)</label>
          <select style={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            {deptCategories.length > 0 && (
              <optgroup label="부서 특화">
                {deptCategories.map((c) => <option key={`d-${c}`} value={c}>{c}</option>)}
              </optgroup>
            )}
            <optgroup label="공통 행정">
              {COMMON_CATEGORIES.map((c) => <option key={`c-${c}`} value={c}>{c}</option>)}
            </optgroup>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={label}>시작일</label>
            <input type="date" style={field} value={startDate}
              onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} />
          </div>
          <div>
            <label style={label}>종료일</label>
            <input type="date" style={field} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={label}>수행 내용 요약</label>
          <textarea style={{ ...field, minHeight: 74, resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)}
            placeholder="수행한 업무 내용과 결과를 1인칭으로 서술" />
        </div>

        <div>
          <label style={label}>증빙 유형</label>
          <select style={field} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
            {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>증빙 문서명</label>
          <input style={field} value={evidenceDoc} onChange={(e) => setEvidenceDoc(e.target.value)} placeholder="예: 기안문 제2025-142호" />
        </div>

        <div>
          <label style={label}>연결 부서 KPI</label>
          <select style={field} value={kpiCode} onChange={(e) => setKpiCode(e.target.value)}>
            <option value="">연결 없음</option>
            {kpis.map((k) => <option key={k.code} value={k.code}>{k.name}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>MBO 목표 (선택 · 직접 입력)</label>
          <input style={field} value={mboGoal} onChange={(e) => setMboGoal(e.target.value)} placeholder="입력 시 KPI와 MBO로 연결" />
        </div>

        {members.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>협업자 (같은 부서 · 선택)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {members.map((m) => {
                const on = collab.has(m.id);
                return (
                  <button type="button" key={m.id} onClick={() => toggleCollab(m.id)}
                    className="chip" style={{ cursor: "pointer", fontSize: "0.72rem", fontWeight: on ? 700 : 500,
                      color: on ? "var(--accent)" : "var(--text-2)", borderColor: on ? "var(--accent)" : "var(--border-strong)",
                      background: on ? "var(--accent-soft)" : "transparent" }}>
                    {on ? "✓ " : ""}{m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button type="submit" disabled={pending}
          style={{ padding: "0.55rem 1.4rem", borderRadius: 999, cursor: pending ? "default" : "pointer", fontSize: "0.85rem", fontWeight: 700,
            border: "1px solid var(--accent)", background: pending ? "var(--surface-2)" : "var(--accent)", color: pending ? "var(--muted)" : "#fff" }}>
          {pending ? "저장 중…" : "업무기록 저장"}
        </button>
        {msg && (
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: msg.ok ? "var(--ok)" : "var(--bad)" }}>
            {msg.ok ? "✓ " : "⚠ "}{msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
