"use client";
import { useState } from "react";
import { DistCurve } from "./charts";

export interface RankItem {
  key: string; label: string; color: string;
  value: number; mean: number; sd: number;
  scope1Rank: number; scope1N: number; scope2Rank: number; scope2N: number; topPct: number;
}

export function RankWidget({ items, scope1Label, scope2Label = "전체" }: { items: RankItem[]; scope1Label: string; scope2Label?: string }) {
  const [sel, setSel] = useState(items[0]?.key ?? "ALL");
  const it = items.find((x) => x.key === sel) ?? items[0];
  if (!it) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>내 위치 · 표준화 랭킹</div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>영역별 순위 &amp; 분포</h2>
        </div>
        <div style={{ position: "relative" }}>
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            style={{ appearance: "none", WebkitAppearance: "none", padding: "0.5rem 2.1rem 0.5rem 0.9rem", borderRadius: 10, border: `1.5px solid ${it.color}`, background: `color-mix(in srgb, ${it.color} 12%, var(--surface-2))`, color: "var(--text)", fontSize: "0.92rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {items.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: it.color, fontSize: "0.68rem" }}>▼</span>
        </div>
      </div>

      {/* 선택 영역 + 순위(크게) + 비교집단 총원(작게) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>선택 영역</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: it.color, display: "inline-block" }} />{it.label}
            <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>{it.value.toFixed(1)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <RankStat scope={scope1Label} rank={it.scope1Rank} n={it.scope1N} />
          <RankStat scope={scope2Label} rank={it.scope2Rank} n={it.scope2N} accent={it.color} />
        </div>
      </div>

      {/* 분포 곡선 — 카드 내부를 꽉 채우는 고정 높이 */}
      <div style={{ height: 224, marginTop: 16 }}>
        <DistCurve key={it.key} mean={it.mean} sd={it.sd} value={it.value} color={it.color}
          label={`${scope2Label} ${it.scope2Rank}위 · 상위 ${it.topPct}%`} />
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "4px 0 0" }}>곡선은 {scope2Label} 표준화 분포이며 마커가 본인 위치입니다. 드롭다운에서 영역을 전환하세요.</p>
    </div>
  );
}

function RankStat({ scope, rank, n, accent }: { scope: string; rank: number; n: number; accent?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: 1 }}>{scope} 순위</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "flex-end" }}>
        <span className="mono" style={{ fontSize: "1.55rem", fontWeight: 800, letterSpacing: "-0.02em", color: accent ?? "var(--text)", lineHeight: 1 }}>{rank}</span>
        <span className="mono" style={{ fontSize: "0.9rem", fontWeight: 700, color: accent ?? "var(--text)" }}>위</span>
        <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>/{n}명</span>
      </div>
    </div>
  );
}
