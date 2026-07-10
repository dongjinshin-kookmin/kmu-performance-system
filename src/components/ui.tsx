"use client";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { useEffect, useState, ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 진입 시 아래→위 페이드 (CSS 키프레임 — 마운트 시 항상 실행) */
export function Reveal({ children, delay = 0, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`reveal ${className ?? ""}`} style={{ animationDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  );
}

/** 스태거 컨테이너 (자식에 index별 지연) */
export function Stagger({ children, className, style }: { children: ReactNode; gap?: number; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style}>{children}</div>;
}
export function StaggerItem({ children, i = 0, className, style }: { children: ReactNode; i?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`reveal ${className ?? ""}`} style={{ animationDelay: `${i * 0.05}s`, ...style }}>
      {children}
    </div>
  );
}

/** 숫자 카운트업 */
export function CountUp({ value, decimals = 0, suffix = "", prefix = "", className, duration = 1.4 }: { value: number; decimals?: number; suffix?: string; prefix?: string; className?: string; duration?: number }) {
  const [txt, setTxt] = useState((0).toFixed(decimals));
  useEffect(() => {
    const controls = animate(0, value, {
      duration, ease: EASE,
      onUpdate: (v) => setTxt(v.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
    });
    return () => controls.stop();
  }, [value, decimals, duration]);
  return <span className={className}>{prefix}{txt}{suffix}</span>;
}

/** 선형 게이지 (영역 점수 바) — 마운트 시 채워짐. 두께 2배(사용자 지시) */
export function Meter({ value, max = 100, color, height = 10, label }: { value: number; max?: number; color: string; height?: number; label?: string }) {
  const H = height * 2;
  const pctW = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: "100%" }}>
      <div style={{ height: H, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", overflow: "hidden", position: "relative" }}>
        <motion.div initial={{ width: "0%" }} animate={{ width: `${pctW}%` }}
          transition={{ duration: 1.1, ease: EASE }}
          style={{ height: "100%", borderRadius: 999, background: color, boxShadow: `0 0 12px ${color}66` }} />
      </div>
      {label && <div className="mono" style={{ fontSize: "0.66rem", color: "var(--muted)", marginTop: 3 }}>{label}</div>}
    </div>
  );
}

/** 링(원형) 게이지 (종합점수). displayMax 지정 시 "획득 / 만점점 · NN%" 병기 */
export function ArcGauge({ value, max = 120, size = 230, color, grade, displayMax, unit = "점" }: { value: number; max?: number; size?: number; color: string; grade?: string; displayMax?: number; unit?: string }) {
  const STROKE = 22;
  const r = size / 2 - STROKE / 2 - 4;
  const circ = 2 * Math.PI * r; // 완전한 원
  const frac = Math.max(0, Math.min(1, value / max));
  const mv = useMotionValue(circ);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [dash, setDash] = useState(circ);
  useEffect(() => { mv.set(circ * (1 - frac)); }, [frac, circ, mv]);
  useEffect(() => spring.on("change", (v) => setDash(v)), [spring]);
  const c = size / 2;
  const pct = displayMax ? Math.round((value / displayMax) * 100) : null;
  const over = pct != null && pct > 100;
  const numStr = value.toFixed(1);
  const numFs = numStr.length >= 6 ? "2.15rem" : numStr.length === 5 ? "2.45rem" : numStr.length === 4 ? "2.75rem" : "2.9rem";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
        <motion.circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={dash} style={{ filter: `drop-shadow(0 0 9px ${color}77)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
        <span className="mono" style={{ fontSize: numFs, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--text)" }}>
          <CountUp value={value} decimals={1} />
        </span>
        {displayMax != null && <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap", marginTop: 1 }}>/ {displayMax.toLocaleString("ko-KR")}{unit} 기준</span>}
        {pct != null && (
          <span className="mono" style={{ marginTop: 5, fontSize: "0.74rem", fontWeight: 700, whiteSpace: "nowrap", color: over ? "#fff" : color, background: over ? "var(--ok)" : "transparent", border: over ? "none" : `1px solid ${color}`, padding: "1px 8px", borderRadius: 999 }}>
            {over ? `기준 초과 +${pct - 100}%` : `기준 대비 ${pct}%`}
          </span>
        )}
        <span style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.02em" }}>종합점수</span>
      </div>
    </div>
  );
}

/** 증감 델타 배지 */
export function Delta({ value, unit = "", positive }: { value: number; unit?: string; positive?: boolean }) {
  const pos = positive ?? value >= 0;
  return (
    <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 600, color: pos ? "var(--ok)" : "var(--bad)" }}>
      {pos ? "▲" : "▼"} {Math.abs(value).toFixed(1)}{unit}
    </span>
  );
}

/** KPI 스탯 타일 (카운트업 + 진입) */
export function StatTile({ label, value, decimals = 0, suffix = "", prefix = "", sub, accent = "var(--accent)", delay = 0, big }: { label: string; value: number; decimals?: number; suffix?: string; prefix?: string; sub?: ReactNode; accent?: string; delay?: number; big?: boolean }) {
  return (
    <div className="panel reveal" style={{ padding: "1.1rem 1.2rem", overflow: "hidden", animationDelay: `${delay}s` }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, opacity: 0.85 }} />
      <div className="eyebrow" style={{ marginBottom: 10 }}>{label}</div>
      <div className="mono" style={{ fontSize: big ? "2.5rem" : "1.9rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text)" }}>
        {prefix}<CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: "0.76rem", color: "var(--text-2)" }}>{sub}</div>}
    </div>
  );
}

/** 등급 배지 (색+라벨 — 색상 단독 금지) */
export function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const c = `var(--grade-${grade})`;
  const dim = size === "lg" ? "2.2rem" : size === "sm" ? "1.3rem" : "1.7rem";
  const fs = size === "lg" ? "1.1rem" : size === "sm" ? "0.72rem" : "0.9rem";
  return (
    <span className="mono" aria-label={`등급 ${grade}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: dim, height: dim, borderRadius: 6, fontWeight: 700, fontSize: fs, color: "#fff", background: c, boxShadow: `0 2px 8px ${c}55` }}>
      {grade}
    </span>
  );
}
