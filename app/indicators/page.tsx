import Link from "next/link";
import { Reveal } from "@/components/ui";

const CARDS = [
  { href: "/indicators/faculty", icon: "🎓", title: "교원 지표·배점표", color: "var(--area-R)",
    desc: "IF 계단배점 · 저자환산 · 트랙 가중 · 등급정책 · 지표 마스터", tags: ["R01 계단배점", "트랙 가중", "특허 단가"] },
  { href: "/indicators/staff", icon: "🧑‍💼", title: "직원 지표·배점표", color: "var(--area-I)",
    desc: "정기평가 90점 · 기능직 200점 · 가감점 · 등급정책(STAFF) · N-series", tags: ["90/200점 체계", "🟨가정 배지", "동료평가 360°"] },
];

export default function IndicatorsHub() {
  return (
    <main className="wrap" style={{ padding: "2rem 0 4rem" }}>
      <Reveal>
        <div className="eyebrow">지표체계 v1.2 · param 테이블 실시간 조회</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>지표 · 배점표</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "60ch" }}>교원·직원 지표체계는 배점 구조·파라미터가 완전히 다릅니다. 직군을 선택하세요.</p>
      </Reveal>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 22 }}>
        {CARDS.map((c, i) => (
          <Reveal key={c.href} delay={i * 0.08}>
            <Link href={c.href} className="panel row-hover" style={{ display: "block", padding: "1.6rem 1.7rem", cursor: "pointer", borderLeft: `4px solid ${c.color}`, height: "100%" }}>
              <div style={{ fontSize: "2rem" }}>{c.icon}</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "10px 0 6px" }}>{c.title}</h2>
              <p style={{ fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.tags.map((t) => <span key={t} className="chip" style={{ fontSize: "0.68rem" }}>{t}</span>)}
              </div>
              <div style={{ marginTop: 16, fontSize: "0.82rem", fontWeight: 700, color: c.color }}>열기 →</div>
            </Link>
          </Reveal>
        ))}
      </section>
    </main>
  );
}
