# UI 디자인 사전

`/design-dictionary`에서 사용하는 71개 UI 용어 데이터와 자체 제작 미니 도판을 관리합니다.

## 구조

- `src/features/ui-dictionary/data.ts`: 검색 가능한 한국어 용어·사용 맥락·구현 API·원본 링크
- `src/features/ui-dictionary/UiPreview.tsx`: 외부 이미지에 의존하지 않는 코드 기반 미니 도판
- `src/features/ui-dictionary/UiDictionary.tsx`: 검색, 플랫폼/용도 필터, 상세 보기, 개발 프롬프트 복사
- `app/design-dictionary/page.tsx`: 사전 라우트

## 출처와 재사용 원칙

2026-07-20 기준 [NameThatUI](https://namethatui.com/) 공개 인덱스의 Web 39개, macOS 32개 용어를 확인했습니다. 명칭과 플랫폼 API 같은 사실 정보만 기준으로 삼았고, 한국어 설명·사용 지침·시각 도판·개발 프롬프트는 이 프로젝트에서 새로 작성했습니다. 원본 사이트의 스크린샷이나 설명문은 저장소에 복제하지 않습니다.

새 항목을 추가할 때는 `data.ts`와 `UiPreview.tsx`에 같은 `slug`를 사용하고, 출처 URL과 확인 날짜를 함께 갱신합니다.
