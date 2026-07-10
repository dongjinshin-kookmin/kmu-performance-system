import { getSession } from "@/lib/rbac";
import { overviewStaff } from "@/lib/queries";
import { Reveal } from "@/components/ui";
import { OverviewMap } from "@/components/OverviewMap";
import { IS_EXPORT } from "@/lib/runtime";

export default async function StaffOverview({ searchParams }: { searchParams: Promise<{ sel?: string }> }) {
  const s = await getSession();
  const data = overviewStaff(s);
  // 정적 export에서는 searchParams를 읽을 수 없음. 선택은 OverviewMap 내부 상태로 처리(클릭 정상 동작).
  const sel = IS_EXPORT ? null : (Number((await searchParams).sel) || null);
  return (
    <main className="wrap" style={{ padding: "2rem 0 5rem" }}>
      <Reveal>
        <div className="eyebrow" style={{ color: "var(--area-I)" }}>직원 성과 · 성과 총람</div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>성과 총람</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.84rem", maxWidth: "74ch" }}>
          전체 직원의 성과를 한 화면에서 조망합니다. 가로축은 <b>성과 모멘텀</b>(전 반기 대비 종합점수 변화 Δ), 세로축은 현재 종합점수로, 우상단 <b>‘스타’</b>(고성과·상승) 구역이 한눈에 들어옵니다. 직급군은 점 모양으로 구분하며, 점을 클릭하면 오른쪽에 세부가 열립니다.
          {" "}<span style={{ color: "var(--text-2)" }}>열람 범위: <b>{data.scopeLabel}</b> · 2025-2 반기 기준</span>
        </p>
      </Reveal>

      {data.denied ? (
        <Notice title="열람 권한이 제한됩니다" body={data.reason ?? "전사·부서 열람 권한에서 제공됩니다."} />
      ) : data.people.length === 0 ? (
        <Notice title="표시할 데이터가 없습니다" body="현재 열람 범위에 해당하는 직원 평가 데이터가 없습니다." />
      ) : (
        <Reveal style={{ marginTop: 22 }} delay={0.05}><OverviewMap data={data} initialSel={sel} /></Reveal>
      )}
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 560, margin: "28px auto 0" }}>
      <div style={{ fontSize: "1.6rem" }}>🔒</div>
      <h2 style={{ fontSize: "1.15rem", margin: "10px 0 6px" }}>{title}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.84rem" }}>{body}</p>
    </div>
  );
}
