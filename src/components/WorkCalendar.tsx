"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

export interface WorkEvidence { type: string; doc: string; }
export interface WorkPerformer { id: number; name: string; self: boolean; }
export interface WorkKpi { kind: string; mboGoal: string | null; code: string | null; name: string | null; }
export interface WorkItem {
  title: string; start: string; end: string; durationDays: number; month: number;
  summary: string; category: string; deptSpecific: boolean;
  evidences: WorkEvidence[];
  owner: { id: number; name: string; role: string; roleLabel: string };
  performers: WorkPerformer[];
  kpi: WorkKpi | null;
}

type Filter = "ALL" | "SPECIFIC" | "COMMON";
const INITIAL = 5;

const fmtPeriod = (it: WorkItem) =>
  it.durationDays <= 1 || it.start === it.end
    ? { range: it.start, note: "하루" }
    : { range: `${it.start} ~ ${it.end}`, note: `${it.durationDays}일간` };

export function WorkCalendar({ items, year, staffId, half }: { items: WorkItem[]; year: number; staffId?: number; half?: number }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [limit, setLimit] = useState(INITIAL);
  const [open, setOpen] = useState<Set<number>>(new Set());

  const counts = useMemo(() => ({
    ALL: items.length,
    SPECIFIC: items.filter((i) => i.deptSpecific).length,
    COMMON: items.filter((i) => !i.deptSpecific).length,
  }), [items]);

  const filtered = useMemo(
    () => items.filter((i) => (filter === "ALL" ? true : filter === "SPECIFIC" ? i.deptSpecific : !i.deptSpecific)),
    [items, filter]
  );
  const shown = filtered.slice(0, limit);
  const toggle = (i: number) => setOpen((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "ALL", label: "전체" }, { key: "SPECIFIC", label: "부서 특화" }, { key: "COMMON", label: "공통 행정" },
  ];

  return (
    <div>
      {/* 필터 + 요약 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            const accent = f.key === "SPECIFIC" ? "var(--area-I)" : f.key === "COMMON" ? "var(--area-R)" : "var(--accent)";
            return (
              <button key={f.key} onClick={() => { setFilter(f.key); setLimit(INITIAL); }}
                style={{ padding: "0.4rem 0.85rem", borderRadius: 999, cursor: "pointer", fontSize: "0.82rem", fontWeight: on ? 700 : 500,
                  border: `1px solid ${on ? accent : "var(--border-strong)"}`, background: on ? accent : "transparent", color: on ? "#fff" : "var(--text-2)" }}>
                {f.label} <span className="mono" style={{ fontSize: "0.72rem", opacity: 0.85 }}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        <span className="mono chip" style={{ fontSize: "0.7rem" }}>{year}년 · 총 {items.length}건 자기작성</span>
      </div>

      {/* 카드 리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((it, i) => {
          const period = fmtPeriod(it);
          const accent = it.deptSpecific ? "var(--area-I)" : "var(--area-R)";
          const isOpen = open.has(i);
          const collaborators = it.performers.filter((p) => !p.self);
          const kpiHref = it.kpi ? (it.kpi.kind === "MBO" ? "#mbo-goals" : "/units") : undefined;
          return (
            <article key={i} className="panel-2" style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 12, overflow: "hidden" }}>
              {/* 헤더: 제목·기간 크게 */}
              <div style={{ padding: "0.95rem 1.1rem 0.7rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.02em", marginBottom: 4 }}>
                      {period.range} <span style={{ color: accent, fontWeight: 700 }}>· {period.note}</span>
                    </div>
                    <h3 style={{ fontSize: "1.02rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.35, margin: 0 }}>{it.title}</h3>
                  </div>
                  <span className="chip" style={{ flexShrink: 0, fontSize: "0.62rem", color: it.deptSpecific ? "var(--area-I)" : "var(--text-2)", borderColor: it.deptSpecific ? "var(--area-I)" : "var(--border-strong)" }}>
                    {it.deptSpecific ? "부서 특화" : "공통 행정"}
                  </span>
                </div>
              </div>

              {/* 메타 행: 책임자·수행자·증빙·KPI */}
              <div style={{ padding: "0 1.1rem 0.5rem", display: "grid", gap: "9px 22px", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
                <MetaRow label="업무책임자">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--area-I)" }} />
                    {it.owner.name}
                    <span className="chip" style={{ fontSize: "0.6rem", color: "var(--area-I)", borderColor: "var(--area-I)", padding: "0.1rem 0.45rem" }}>{it.owner.roleLabel}</span>
                  </span>
                </MetaRow>
                <MetaRow label="업무수행자">
                  <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                    {it.performers.map((p) => (
                      <span key={p.id} className="chip" style={{ fontSize: "0.68rem", padding: "0.14rem 0.5rem",
                        color: p.self ? "var(--accent)" : "var(--text-2)", borderColor: p.self ? "var(--accent)" : "var(--border-strong)", fontWeight: p.self ? 700 : 500 }}>
                        {p.name}{p.self ? " (본인)" : ""}
                      </span>
                    ))}
                  </span>
                </MetaRow>
                <MetaRow label="증빙자료">
                  <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                    {it.evidences.map((e, j) => (
                      <span key={j} className="chip" style={{ fontSize: "0.66rem", padding: "0.14rem 0.5rem", borderColor: "var(--border-strong)" }}>
                        <span style={{ color: "var(--muted)" }}>{e.type}</span>
                        <span className="mono" style={{ color: "var(--text-2)" }}>{e.doc}</span>
                      </span>
                    ))}
                  </span>
                </MetaRow>
                <MetaRow label="연결 KPI">
                  {it.kpi ? (
                    <Link href={kpiHref!} title={it.kpi.kind === "MBO" ? "개인 MBO 목표로 이동" : "부서 KPI 대시보드로 이동"}
                      className="chip" style={{ fontSize: "0.68rem", padding: "0.16rem 0.55rem", cursor: "pointer", textDecoration: "none",
                        color: it.kpi.kind === "MBO" ? "var(--grade-S)" : "var(--accent)", borderColor: it.kpi.kind === "MBO" ? "var(--grade-S)" : "var(--accent)" }}>
                      {it.kpi.kind === "MBO" ? "MBO" : "KPI"} ↔ <span style={{ fontWeight: 700 }}>{it.kpi.kind === "MBO" ? it.kpi.mboGoal : it.kpi.name}</span>
                      {it.kpi.kind === "MBO" && it.kpi.name && <span className="mono" style={{ color: "var(--muted)", fontWeight: 500 }}>· {it.kpi.name}</span>}
                    </Link>
                  ) : <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>직접 연결 없음</span>}
                </MetaRow>
              </div>

              {/* 상세 전문 아코디언 */}
              <button onClick={() => toggle(i)} aria-expanded={isOpen}
                style={{ width: "100%", textAlign: "left", padding: "0.55rem 1.1rem", background: "transparent", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-2)", fontSize: "0.74rem", fontWeight: 600 }}>
                <span>자기작성 수행 내용 {isOpen ? "접기" : "펼치기"}</span>
                <span style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "none", color: "var(--muted)" }}>›</span>
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: "0 1.1rem 0.95rem", fontSize: "0.83rem", color: "var(--text-2)", lineHeight: 1.65 }}>{it.summary}</p>
              )}
            </article>
          );
        })}
        {shown.length === 0 && (
          <div style={{ padding: "1.8rem", textAlign: "center", color: "var(--muted)", fontSize: "0.84rem", border: "1px dashed var(--border)", borderRadius: 12 }}>
            해당 조건의 업무 기록이 없습니다.
          </div>
        )}
      </div>

      {filtered.length > limit && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => setLimit((l) => l + 6)}
            style={{ padding: "0.5rem 1.4rem", borderRadius: 999, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
              border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text-2)" }}>
            더보기 <span className="mono" style={{ color: "var(--muted)" }}>+{Math.min(6, filtered.length - limit)}</span> · 남은 {filtered.length - limit}건
          </button>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="eyebrow" style={{ fontSize: "0.58rem" }}>{label}</span>
      {children}
    </div>
  );
}
