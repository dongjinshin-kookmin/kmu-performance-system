"use client";
import { motion } from "framer-motion";

const FACULTY_STEPS = ["목표설정", "실적수집", "본인확인", "학과장검토", "평가위원회", "결과통지", "확정"];
const STAFF_STEPS = ["목표설정", "중간체크인", "자기평가", "1차평가", "2차평가", "서비스취합", "캘리브레이션", "결과통지", "확정"];

export function Stepper({ current, mode = "faculty" }: { current: number; mode?: "faculty" | "staff" }) {
  const STEPS = mode === "staff" ? STAFF_STEPS : FACULTY_STEPS;
  const frac = (current - 1) / (STEPS.length - 1);
  return (
    <div style={{ position: "relative", padding: "8px 0 4px" }}>
      <div style={{ position: "absolute", top: 20, left: 16, right: 16, height: 2, background: "var(--border)" }} />
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: frac }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute", top: 20, left: 16, right: 16, height: 2, background: "var(--accent)", transformOrigin: "left" }} />
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current, cur = n === current;
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
                style={{ width: cur ? 26 : 22, height: cur ? 26 : 22, borderRadius: "50%", display: "grid", placeItems: "center",
                  background: done || cur ? "var(--accent)" : "var(--surface-2)", border: `2px solid ${done || cur ? "var(--accent)" : "var(--border-strong)"}`,
                  color: done || cur ? "#fff" : "var(--muted)", fontSize: "0.7rem", fontWeight: 700, boxShadow: cur ? "0 0 0 4px var(--ring)" : "none", zIndex: 2 }} className="mono">
                {done ? "✓" : n}
              </motion.div>
              <span style={{ fontSize: "0.66rem", color: cur ? "var(--text)" : "var(--muted)", fontWeight: cur ? 700 : 400, textAlign: "center", whiteSpace: "nowrap" }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
