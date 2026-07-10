// 정적 export(GitHub Pages) 빌드 여부.
// 이 값에 따라 페이지 세그먼트 설정(dynamic)과 세션 처리 방식을 분기한다.
export const IS_EXPORT = process.env.GITHUB_PAGES === "true";

// 정적 export에서는 쿠키/요청 기반 동적 렌더가 불가하므로 force-static,
// 로컬 개발/서버 모드에서는 쿠키 RBAC를 위해 force-dynamic.
export const PAGE_DYNAMIC = IS_EXPORT ? "force-static" : "force-dynamic";

// 클라이언트 라우팅 시 basePath 접두어(정적 export일 때만 설정됨)
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
