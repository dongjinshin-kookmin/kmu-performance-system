"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface L2 { key: string; label: string; persons: { id: number; name: string }[]; }
interface L1 { key: string; label: string; children: L2[]; }
interface FlatP { id: number; name: string; l1: string; l1label: string; l2: string; l2label: string; }

export function PersonPicker({ tree, currentId, base, l1Label, l2Label, l1Names, accent }: {
  tree: L1[]; currentId: number; base: string; l1Label: string; l2Label: string; l1Names?: Record<string, string>; accent: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [l1, setL1] = useState<string>("ALL");
  const [l2, setL2] = useState<string>("ALL");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const l1name = (k: string, def: string) => l1Names?.[k] ?? def;

  const flat: FlatP[] = useMemo(() => {
    const out: FlatP[] = [];
    for (const a of tree) for (const b of a.children) for (const p of b.persons)
      out.push({ id: p.id, name: p.name, l1: a.key, l1label: l1name(a.label, a.label), l2: b.key, l2label: b.label });
    return out;
  }, [tree]);

  const current = flat.find((p) => p.id === currentId);
  const l2opts = useMemo(() => (l1 === "ALL" ? [] : tree.find((a) => a.key === l1)?.children ?? []), [l1, tree]);

  const results = useMemo(() => {
    const qq = q.trim();
    return flat.filter((p) =>
      (l1 === "ALL" || p.l1 === l1) &&
      (l2 === "ALL" || p.l2 === l2) &&
      (qq === "" || p.name.includes(qq))
    );
  }, [flat, q, l1, l2]);

  useEffect(() => { setSel(0); }, [q, l1, l2]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (id: number) => { setOpen(false); setQ(""); start(() => router.push(`${base}/${id}`)); };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) { e.preventDefault(); go(results[sel].id); }
  };
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "0.32rem 0.7rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
    border: `1px solid ${active ? accent : "var(--border-strong)"}`, whiteSpace: "nowrap",
    background: active ? accent : "transparent", color: active ? "#fff" : "var(--text-2)", transition: "all 0.14s",
  });

  return (
    <>
      {/* 트리거 */}
      <button onClick={() => setOpen(true)}
        className="panel"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "0.7rem 0.95rem", cursor: "pointer", borderLeft: `3px solid ${accent}`, textAlign: "left", color: "var(--text)" }}>
        <Avatar name={current?.name ?? "?"} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{current?.name ?? "인물 선택"}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current ? `${current.l1label} · ${current.l2label}` : "탐색하려면 클릭하세요"}
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: "var(--muted)" }}>
          <span className="mono" style={{ border: "1px solid var(--border-strong)", borderRadius: 6, padding: "2px 7px", fontSize: "0.72rem" }}>⌘K</span>
          <span style={{ fontWeight: 600 }}>인원 탐색</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "color-mix(in srgb, var(--bg) 55%, rgba(0,0,0,0.5))", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12vh 1rem 1rem" }}>
            <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()} onKeyDown={onListKey}
              className="panel" style={{ width: "min(640px, 100%)", maxHeight: "72vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "var(--shadow-lg)", borderColor: "var(--border-strong)" }}>
              {/* 검색 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--border)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 검색…"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)", fontSize: "1.05rem", fontFamily: "inherit" }} />
                <span className="mono" style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{results.length}명</span>
              </div>
              {/* 필터 칩 */}
              <div style={{ padding: "0.7rem 1.1rem 0.4rem", display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
                  <span style={{ fontSize: "0.66rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>{l1Label}</span>
                  <span onClick={() => { setL1("ALL"); setL2("ALL"); }} style={chip(l1 === "ALL")}>전체</span>
                  {tree.map((a) => <span key={a.key} onClick={() => { setL1(a.key); setL2("ALL"); }} style={chip(l1 === a.key)}>{l1name(a.label, a.label)}</span>)}
                </div>
                {l2opts.length > 0 && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
                    <span style={{ fontSize: "0.66rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>{l2Label}</span>
                    <span onClick={() => setL2("ALL")} style={chip(l2 === "ALL")}>전체</span>
                    {l2opts.map((b) => <span key={b.key} onClick={() => setL2(b.key)} style={chip(l2 === b.key)}>{b.label}</span>)}
                  </div>
                )}
              </div>
              {/* 결과 */}
              <div ref={listRef} style={{ overflowY: "auto", padding: "0.5rem", flex: 1 }}>
                {results.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>일치하는 인원이 없습니다</div>}
                {results.slice(0, 120).map((p, i) => (
                  <button key={p.id} data-i={i} onClick={() => go(p.id)} onMouseEnter={() => setSel(i)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "0.6rem 0.7rem", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                      background: i === sel ? "var(--accent-soft)" : "transparent", color: "var(--text)" }}>
                    <Avatar name={p.name} accent={accent} small dim={p.id !== currentId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: p.id === currentId ? 800 : 600 }}>{p.name}{p.id === currentId && <span style={{ marginLeft: 7, fontSize: "0.68rem", color: accent, fontWeight: 700 }}>현재</span>}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.l1label} · {p.l2label}</div>
                    </div>
                    {i === sel && <span className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>↵</span>}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 14, padding: "0.55rem 1.1rem", borderTop: "1px solid var(--border)", fontSize: "0.72rem", color: "var(--muted)" }}>
                <span><b className="mono">↑↓</b> 이동</span><span><b className="mono">↵</b> 선택</span><span><b className="mono">esc</b> 닫기</span>
                <span style={{ marginLeft: "auto" }}>권한 범위 내 인원만 표시</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Avatar({ name, accent, small, dim }: { name: string; accent: string; small?: boolean; dim?: boolean }) {
  const d = small ? 34 : 42;
  return (
    <span style={{ flexShrink: 0, width: d, height: d, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: dim ? "var(--surface-2)" : `color-mix(in srgb, ${accent} 20%, var(--surface-2))`, border: `1.5px solid ${dim ? "var(--border-strong)" : accent}`,
      color: dim ? "var(--text-2)" : accent, fontWeight: 800, fontSize: small ? "0.9rem" : "1.05rem" }}>
      {name.slice(0, 1)}
    </span>
  );
}
