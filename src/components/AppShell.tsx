"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarProps } from "./Sidebar";

export function AppShell({ sidebar, children }: { sidebar: Omit<SidebarProps, "onNavigate">; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 디자인 사전은 성과관리 업무 메뉴와 정보 구조가 다른 독립 도구다.
  // 이 경로에서는 업무용 사이드바와 모바일 셸을 렌더링하지 않는다.
  if (pathname.startsWith("/design-dictionary")) {
    return <div className="dictionary-shell">{children}</div>;
  }

  return (
    <>
      <div className="shell-sidebar" data-open={open}>
        <Sidebar {...sidebar} onNavigate={() => setOpen(false)} />
      </div>
      {open && <div className="shell-overlay" onClick={() => setOpen(false)} />}
      <div className="shell-main">
        <div className="shell-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mobile-brand-mark">K</div>
            <span className="mobile-brand-name">성과관리통합시스템</span>
          </div>
          <button className="mobile-menu-button" onClick={() => setOpen((o) => !o)} aria-label={open ? "전체 메뉴 닫기" : "전체 메뉴 열기"} aria-expanded={open}>
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
