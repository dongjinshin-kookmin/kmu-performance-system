import type { Metadata } from "next";
import { UiDictionary } from "@/features/ui-dictionary/UiDictionary";

export const metadata: Metadata = {
  title: "UI 디자인 사전 | 국민대 성과관리통합시스템",
  description: "Web과 macOS의 UI 패턴 71개를 한국어 설명과 도판으로 탐색하는 디자인 사전",
};

export default function DesignDictionaryPage() {
  return <UiDictionary />;
}
