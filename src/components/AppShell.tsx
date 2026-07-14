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
          <button className="mobile-menu-button" onClick={() => setOpen((o) => !o)} aria-label="전체 메뉴 열기">☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mobile-brand-mark">K</div>
            <span className="mobile-brand-name">성과관리통합시스템</span>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
