"use client";
import { useState } from "react";
import { Sidebar, SidebarProps } from "./Sidebar";

export function AppShell({ sidebar, children }: { sidebar: Omit<SidebarProps, "onNavigate">; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="shell-sidebar" data-open={open}>
        <Sidebar {...sidebar} onNavigate={() => setOpen(false)} />
      </div>
      {open && <div className="shell-overlay" onClick={() => setOpen(false)} />}
      <div className="shell-main">
        <div className="shell-topbar">
          <button onClick={() => setOpen((o) => !o)} aria-label="메뉴" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, width: 38, height: 38, cursor: "pointer", color: "var(--text)", fontSize: "1.1rem" }}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--accent), var(--area-R))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: "0.8rem" }}>K</div>
            <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>성과관리통합시스템</span>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
