"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function Nav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav style={{ display: "flex", gap: 2 }}>
      {links.map((l) => {
        const active = path === l.href || (l.href !== "/dashboard" && path.startsWith(l.href));
        return (
          <Link key={l.href} href={l.href}
            style={{ position: "relative", padding: "0.5rem 0.85rem", borderRadius: 8, fontSize: "0.86rem", fontWeight: active ? 700 : 500, color: active ? "var(--text)" : "var(--text-2)", background: active ? "var(--surface-2)" : "transparent" }}>
            {l.label}
            {active && <span style={{ position: "absolute", left: "0.85rem", right: "0.85rem", bottom: 2, height: 2, borderRadius: 2, background: "var(--accent)" }} />}
          </Link>
        );
      })}
    </nav>
  );
}
