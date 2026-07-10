"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 정적 export에서 서버 redirect()를 쓸 수 없으므로 클라이언트에서 이동.
// next/navigation의 router는 basePath를 자동으로 접두어 처리한다.
export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <main className="wrap" style={{ padding: "4rem 0", textAlign: "center" }}>
      <p style={{ color: "var(--muted)" }}>
        대시보드로 이동 중… <Link href={to} className="chip" style={{ marginLeft: 8 }}>바로가기</Link>
      </p>
    </main>
  );
}
