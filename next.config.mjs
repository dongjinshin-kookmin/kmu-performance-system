/** @type {import('next').NextConfig} */

// GitHub Pages 정적 배포 분기: GITHUB_PAGES=true 일 때만 static export.
// 로컬 개발(npm run dev)은 쿠키 기반 RBAC를 그대로 사용한다.
const isPages = process.env.GITHUB_PAGES === "true";
// 저장소 경로(https://<user>.github.io/<repo>/) — 필요 시 BASE_PATH로 override
const basePath = isPages ? (process.env.BASE_PATH ?? "/kmu-performance-system") : "";

const nextConfig = {
  // better-sqlite3는 네이티브 모듈 → 서버 컴포넌트에서 external 처리
  serverExternalPackages: ["better-sqlite3"],
  eslint: { ignoreDuringBuilds: true },
  ...(isPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
        images: { unoptimized: true },
        // 클라이언트에서 basePath를 참조할 수 있도록 노출
        env: { NEXT_PUBLIC_BASE_PATH: basePath },
      }
    : {}),
};

export default nextConfig;
