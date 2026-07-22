export type UiPlatform = "web" | "macos";
export type UiCategory = "탐색" | "입력" | "피드백" | "오버레이" | "레이아웃" | "콘텐츠" | "모션" | "시스템";

export interface UiTerm {
  slug: string;
  name: string;
  nameKo: string;
  platform: UiPlatform;
  category: UiCategory;
  api: string;
  description: string;
  use: string;
  keywords: string[];
  source: string;
}

const source = (platform: UiPlatform, slug: string) => `https://namethatui.com/${platform}/${slug}`;

const term = (
  slug: string,
  name: string,
  nameKo: string,
  platform: UiPlatform,
  category: UiCategory,
  api: string,
  description: string,
  use: string,
  keywords: string[],
): UiTerm => ({ slug, name, nameKo, platform, category, api, description, use, keywords, source: source(platform, slug) });

// 2026-07-20 기준 NameThatUI 인덱스의 Elements 71개를 토대로 작성한 한국어 해설입니다.
// 명칭과 플랫폼 API는 사실 정보로 보존하고, 설명·예시 도판은 이 프로젝트에서 새로 작성했습니다.
export const UI_TERMS: UiTerm[] = [
  term("parallax", "Parallax Scrolling", "패럴랙스 스크롤", "web", "모션", "animation-timeline: scroll()", "스크롤 거리에 따라 전경과 배경을 서로 다른 속도로 움직여 깊이감을 만드는 연출입니다.", "스토리텔링형 랜딩 페이지에서 짧고 절제된 공간감을 줄 때 사용합니다.", ["스크롤", "깊이", "배경", "시차"]),
  term("date-picker", "Date Picker", "날짜 선택기", "web", "입력", "<input type=\"date\">", "달력에서 하루 또는 시작일과 종료일을 고르는 날짜 입력 도구입니다.", "예약, 일정, 조회 기간처럼 날짜 형식 오류를 줄여야 할 때 사용합니다.", ["달력", "기간", "예약", "날짜"]),
  term("pagination", "Pagination", "페이지네이션", "web", "탐색", "<nav aria-label=\"pagination\">", "긴 결과 목록을 번호가 있는 여러 페이지로 나누는 탐색 패턴입니다.", "검색 결과처럼 전체 위치와 앞뒤 이동을 함께 보여줘야 할 때 적합합니다.", ["페이지", "목록", "이전", "다음"]),
  term("sign-in-form", "Sign-in Form", "로그인 폼", "web", "입력", "autocomplete=\"current-password\"", "계정 식별자와 비밀번호, 소셜 로그인을 한 흐름에 모은 인증 양식입니다.", "서비스 진입을 위한 인증과 계정 복구 경로를 명확히 제공할 때 사용합니다.", ["로그인", "비밀번호", "인증", "소셜"]),
  term("carousel", "Carousel", "캐러셀", "web", "콘텐츠", "aria-roledescription=\"carousel\"", "한 영역에서 여러 슬라이드를 좌우로 넘겨 보는 콘텐츠 묶음입니다.", "대표 콘텐츠를 제한된 공간에 순서대로 소개할 때 사용합니다.", ["슬라이드", "갤러리", "배너", "도트"]),
  term("header-navbar", "Site Header vs. Navigation Bar", "사이트 헤더와 내비게이션 바", "web", "탐색", "<header> · <nav>", "헤더는 로고와 기능을 포함한 상단 전체이고, 내비게이션 바는 그 안의 목적지 링크 영역입니다.", "브랜드, 주요 메뉴, 계정 액션을 페이지 상단에 구조화할 때 사용합니다.", ["헤더", "내비게이션", "탑바", "메뉴"]),
  term("card", "Card", "카드", "web", "콘텐츠", "<article> · Card", "이미지, 제목, 본문, 액션을 하나의 주제로 묶는 독립 콘텐츠 컨테이너입니다.", "여러 항목을 반복 가능한 단위로 훑고 비교하게 할 때 사용합니다.", ["타일", "콘텐츠", "미디어", "컨테이너"]),
  term("resize-handle", "Resize Handle (Size Grip)", "크기 조절 핸들", "web", "입력", "resize · ::-webkit-resizer", "텍스트 영역 모서리를 드래그해 사용자가 크기를 바꾸게 하는 손잡이입니다.", "입력량이 달라 사용자가 편집 공간을 직접 늘릴 필요가 있을 때 사용합니다.", ["리사이즈", "텍스트영역", "그립", "드래그"]),
  term("insertion-caret", "Insertion Caret (Insertion Point)", "입력 캐럿", "macos", "입력", "NSTextView.insertionPointColor", "텍스트에서 다음 문자가 들어갈 위치를 알리는 깜박이는 세로선입니다.", "모든 편집 가능한 텍스트 입력에서 현재 삽입 위치를 표시합니다.", ["커서", "텍스트", "입력점", "깜박임"]),
  term("hamburger-menu", "Hamburger Menu (Nav Drawer)", "햄버거 메뉴", "web", "탐색", "aria-expanded + aria-controls", "세 줄 버튼이 화면 가장자리의 내비게이션 패널을 여는 축약 메뉴입니다.", "모바일처럼 폭이 좁아 주요 메뉴를 접어야 할 때 사용합니다.", ["드로어", "모바일", "사이드메뉴", "세줄"]),
  term("bento-grid", "Bento Grid", "벤토 그리드", "web", "레이아웃", "display: grid · grid-column: span 2", "서로 다른 크기의 타일을 하나의 규칙적인 그리드 트랙에 배치하는 레이아웃입니다.", "기능과 지표의 우선순위를 크기 차이로 보여 주는 소개면과 대시보드에 적합합니다.", ["그리드", "타일", "대시보드", "격자"]),
  term("masonry", "Masonry Layout (Pinterest Grid)", "메이슨리 레이아웃", "web", "레이아웃", "columns", "높이가 다른 카드를 열별로 촘촘하게 쌓아 빈 세로 공간을 줄이는 레이아웃입니다.", "이미지 피드처럼 읽기 순서보다 밀도와 탐색성이 중요한 콘텐츠에 사용합니다.", ["핀터레스트", "열", "카드", "갤러리"]),
  term("easing", "Easing (Timing Function)", "이징", "web", "모션", "transition-timing-function", "애니메이션의 가속과 감속 비율을 정해 움직임의 인상을 만드는 시간 곡선입니다.", "상태 전환을 갑작스럽지 않고 목적에 맞는 속도감으로 연결할 때 사용합니다.", ["타이밍", "커브", "전환", "가속"]),
  term("spring", "Spring Animation", "스프링 애니메이션", "web", "모션", "transition={{ type: \"spring\", stiffness, damping }}", "목표 지점을 조금 지나쳤다가 되돌아오며 안정되는 물리 기반 모션입니다.", "제스처나 패널 전환에 탄력 있고 반응적인 느낌을 줄 때 사용합니다.", ["탄성", "오버슈트", "모션", "댐핑"]),
  term("text-scramble", "Text Scramble (Decode Effect)", "텍스트 스크램블", "web", "모션", "ScrambleTextPlugin", "임의 문자가 빠르게 바뀌다가 최종 문구로 하나씩 확정되는 디코드 효과입니다.", "짧은 타이틀이나 기술적 분위기의 순간 강조에 제한적으로 사용합니다.", ["디코드", "글리치", "문자", "애니메이션"]),
  term("lightbox", "Lightbox", "라이트박스", "web", "오버레이", "<dialog> · ::backdrop", "썸네일을 선택하면 배경을 어둡게 하고 큰 이미지에 집중시키는 모달 뷰어입니다.", "사진이나 작품을 현재 맥락을 유지한 채 확대해서 볼 때 사용합니다.", ["갤러리", "이미지", "모달", "확대"]),
  term("marquee", "Marquee", "마키", "web", "모션", "animation + @keyframes translateX", "텍스트나 로고 묶음을 한 방향으로 끊김 없이 반복 이동시키는 띠입니다.", "파트너 로고나 짧은 알림을 넓은 가로 흐름으로 보여 줄 때 사용합니다.", ["티커", "무한스크롤", "로고", "가로"]),
  term("pointer", "Pointer (Cursor)", "포인터", "macos", "시스템", "NSCursor", "가리키기, 입력, 드래그 등 현재 가능한 조작을 모양으로 알려 주는 화면 포인터입니다.", "대상 위에서 가능한 행동이 바뀔 때 즉각적인 조작 단서를 제공합니다.", ["커서", "마우스", "포인터", "드래그"]),
  term("alert", "Alert", "경고창", "macos", "오버레이", "NSAlert", "결정이 필요한 짧은 메시지와 확인·취소 버튼을 담는 시스템 대화상자입니다.", "삭제처럼 결과가 크거나 즉시 확인이 필요한 작업 앞에 사용합니다.", ["경고", "확인", "취소", "대화상자"]),
  term("slider", "Volume Slider", "볼륨 슬라이더", "macos", "입력", "NSSlider", "트랙 위의 손잡이를 움직여 연속 범위 안의 값을 고르는 컨트롤입니다.", "음량이나 확대율처럼 즉시 미리 볼 수 있는 연속값 조정에 사용합니다.", ["슬라이더", "범위", "볼륨", "노브"]),
  term("color-well", "Color Well", "컬러 웰", "macos", "입력", "NSColorWell", "현재 색상을 작은 견본으로 보여 주고 색상 선택기를 여는 컨트롤입니다.", "문서나 객체의 채우기·선 색상을 선택할 때 사용합니다.", ["색상", "스와치", "피커", "채우기"]),
  term("form-field", "Form Field", "폼 필드", "web", "입력", "<label for>", "레이블, 입력칸, 도움말, 오류 메시지를 하나의 입력 단위로 묶은 구조입니다.", "사용자가 무엇을 어떤 형식으로 입력해야 하는지 명확히 안내할 때 사용합니다.", ["입력", "레이블", "도움말", "오류"]),
  term("truncation", "Truncation (Ellipsis & Line Clamp)", "말줄임", "web", "콘텐츠", "text-overflow: ellipsis", "정해진 폭이나 줄 수를 넘는 텍스트를 생략 부호로 줄여 표시하는 처리입니다.", "카드와 표처럼 높이와 폭을 일정하게 유지해야 하는 요약 영역에 사용합니다.", ["말줄임표", "라인클램프", "텍스트", "생략"]),
  term("drag-and-drop", "Drag & Drop", "드래그 앤 드롭", "web", "입력", "ondrop", "항목을 잡아 이동하고 목표 위치에 놓아 순서나 소속을 바꾸는 직접 조작입니다.", "파일 업로드, 칸반 이동, 목록 재정렬처럼 공간 관계가 중요한 작업에 사용합니다.", ["드래그", "드롭", "정렬", "업로드"]),
  term("divider", "Divider vs. Separator vs. Rule", "구분선", "web", "레이아웃", "<hr> · role=\"separator\"", "내용의 주제 전환, 컨트롤 분리, 장식 목적을 선의 의미에 따라 구분한 패턴입니다.", "인접 요소의 관계를 약하게 나누되 새 컨테이너까지 필요하지 않을 때 사용합니다.", ["디바이더", "세퍼레이터", "선", "구획"]),
  term("progress-indicators", "Progress Ring vs. Spinner vs. Progress Bar", "진행 표시기", "web", "피드백", "<progress>", "완료 비율은 링·바로, 완료 시점을 모르는 대기는 스피너로 보여 주는 상태 표시입니다.", "처리 시간이 체감될 만큼 길어 사용자가 진행 여부를 알아야 할 때 사용합니다.", ["로딩", "진행률", "스피너", "프로그레스"]),
  term("window", "Mac Window", "맥 윈도우", "macos", "시스템", "NSWindow", "제목 막대, 도구 막대, 콘텐츠, 크기 조절 가장자리를 포함한 macOS 앱의 기본 창입니다.", "독립적으로 이동·크기 조절할 수 있는 주요 문서나 작업 공간에 사용합니다.", ["창", "타이틀바", "툴바", "앱킷"]),
  term("split-view", "Split View", "분할 보기", "macos", "레이아웃", "NSSplitView", "하나의 창을 드래그 가능한 구분선으로 나누어 여러 패널을 동시에 보여 줍니다.", "목록과 상세처럼 함께 보면서 폭도 조절해야 하는 인접 작업에 사용합니다.", ["분할", "패널", "디바이더", "창"]),
  term("scroll-view", "Scroll View (Scroller)", "스크롤 뷰", "macos", "레이아웃", "NSScrollView", "콘텐츠가 보이는 뷰포트와 macOS식 스크롤러를 제공하는 컨테이너입니다.", "화면보다 큰 문서나 목록을 한정된 영역 안에서 탐색하게 할 때 사용합니다.", ["스크롤", "뷰포트", "스크롤러", "콘텐츠"]),
  term("search-field", "Search Field", "검색 필드", "macos", "입력", "NSSearchField", "돋보기, 지우기, 최근 검색 기능을 갖춘 검색 전용 텍스트 필드입니다.", "창 안의 파일이나 설정을 즉시 필터링할 때 사용합니다.", ["검색", "필터", "돋보기", "최근검색"]),
  term("save-panel", "Save Panel", "저장 패널", "macos", "오버레이", "NSSavePanel", "파일 이름, 위치, 형식을 선택하는 macOS 표준 저장 대화상자입니다.", "샌드박스 권한과 시스템 탐색 경험을 유지하며 파일을 저장할 때 사용합니다.", ["저장", "파일", "대화상자", "위치"]),
  term("token-field", "Token Field", "토큰 필드", "macos", "입력", "NSTokenField", "입력한 수신자나 태그를 각각 선택·삭제할 수 있는 둥근 토큰으로 바꾸는 필드입니다.", "복수의 이메일 주소나 태그처럼 항목 경계가 분명해야 할 때 사용합니다.", ["토큰", "태그", "수신자", "입력"]),
  term("combo-button", "Combo Button", "콤보 버튼", "macos", "입력", "NSComboButton", "기본 실행 버튼과 관련 명령을 여는 화살표 버튼을 붙여 둔 복합 컨트롤입니다.", "가장 흔한 액션은 한 번에 실행하고 변형 액션도 가까이 제공할 때 사용합니다.", ["스플릿버튼", "액션", "메뉴", "화살표"]),
  term("level-indicator", "Level Indicator", "레벨 인디케이터", "macos", "피드백", "NSLevelIndicator", "용량 막대, 별점, 관련도 눈금처럼 수준을 시각적으로 나타내는 게이지입니다.", "값의 정확한 숫자보다 상대적인 정도나 평가를 빠르게 보여 줄 때 사용합니다.", ["게이지", "별점", "용량", "수준"]),
  term("column-view", "Column View (Browser)", "열 보기", "macos", "탐색", "NSBrowser", "계층의 각 단계를 옆 열에 펼쳐 상위 경로와 현재 위치를 함께 보여 줍니다.", "깊은 폴더 구조를 빠르게 오가며 다음 하위 수준을 탐색할 때 사용합니다.", ["파인더", "열", "계층", "브라우저"]),
  term("outline-view", "Outline View", "아웃라인 보기", "macos", "탐색", "NSOutlineView", "들여쓰기와 펼침 컨트롤로 계층형 행을 한 목록에 표현합니다.", "폴더, 문서 목차, 객체 트리를 세로 공간 안에서 탐색할 때 사용합니다.", ["트리", "계층", "목록", "펼치기"]),
  term("three-dots", "The Three Dots (Overflow Menu)", "더보기 메뉴", "web", "탐색", "<button>", "현재 화면에 다 놓기 어려운 보조 명령을 점 아이콘 뒤에 모아 두는 메뉴입니다.", "핵심 액션의 우선순위를 유지하면서 덜 자주 쓰는 작업을 제공할 때 사용합니다.", ["케밥", "미트볼", "오버플로", "더보기"]),
  term("menu-bar", "Menu Bar", "메뉴 막대", "macos", "탐색", "NSApp.mainMenu", "화면 최상단에서 현재 앱의 명령 메뉴와 시스템 상태를 보여 주는 macOS 영역입니다.", "앱 전체 명령을 표준 계층과 키보드 단축키로 제공할 때 사용합니다.", ["메뉴", "화면상단", "명령", "단축키"]),
  term("context-menu", "Context Menu", "컨텍스트 메뉴", "macos", "탐색", "NSMenu", "포인터 위치의 선택 대상에 맞는 명령을 우클릭으로 보여 주는 메뉴입니다.", "선택한 파일이나 객체에만 적용되는 보조 작업을 가까이 제공할 때 사용합니다.", ["우클릭", "메뉴", "상황", "명령"]),
  term("disclosure-triangle", "Disclosure Triangle", "공개 삼각형", "macos", "탐색", "NSOutlineView", "삼각형이 회전하며 중첩된 행이나 추가 내용을 펼치고 접는 상태를 표시합니다.", "트리와 세부 옵션에서 상위 항목 아래 내용을 필요할 때만 보여 줍니다.", ["삼각형", "펼치기", "트리", "공개"]),
  term("dock-badge", "Dock Badge", "Dock 배지", "macos", "피드백", "NSDockTile.badgeLabel", "Dock의 앱 아이콘 위에 읽지 않은 수나 짧은 상태를 겹쳐 보여 주는 배지입니다.", "앱이 비활성 상태여도 주의가 필요한 새 항목 수를 알릴 때 사용합니다.", ["독", "배지", "알림", "숫자"]),
  term("focus-ring", "Focus Ring", "포커스 링", "macos", "피드백", "NSView.focusRingType", "키보드 입력을 받는 컨트롤의 둘레를 강조하는 macOS 포커스 표시입니다.", "Tab 키로 이동하는 사용자가 현재 조작 대상을 놓치지 않게 합니다.", ["포커스", "키보드", "접근성", "강조"]),
  term("inspector", "Inspector", "인스펙터", "macos", "레이아웃", "View.inspector(isPresented:content:)", "현재 선택한 객체의 속성을 보고 편집하는 오른쪽 보조 패널입니다.", "캔버스나 문서 선택을 유지하면서 세부 설정을 조정할 때 사용합니다.", ["속성", "오른쪽패널", "편집", "선택"]),
  term("panel", "Panel (Floating Window / HUD)", "플로팅 패널", "macos", "오버레이", "NSPanel", "주 문서 창 위에 떠서 도구나 일시적 정보를 제공하는 보조 창입니다.", "색상, 도구, 빠른 명령을 문서와 병행해 계속 열어 둘 때 사용합니다.", ["HUD", "플로팅", "보조창", "도구"]),
  term("popover", "Popover", "팝오버", "macos", "오버레이", "NSPopover", "화살표가 실행한 컨트롤을 가리키는 가벼운 부유형 정보·조작 패널입니다.", "현재 컨트롤과 직접 관련된 짧은 선택이나 정보를 문맥 안에서 보여 줍니다.", ["말풍선", "앵커", "패널", "팝업"]),
  term("popup-pulldown-combo", "Pop-Up Button vs. Pull-Down Button vs. Combo Box", "팝업·풀다운·콤보 상자", "macos", "입력", "NSPopUpButton · NSComboBox", "값 선택, 명령 실행, 직접 입력 가능 여부에 따라 구분되는 세 가지 선택 컨트롤입니다.", "선택 결과를 유지할지, 액션을 실행할지, 새 값을 허용할지에 따라 골라 사용합니다.", ["드롭다운", "선택", "콤보박스", "메뉴"]),
  term("segmented-control", "Segmented Control", "세그먼트 컨트롤", "macos", "입력", "NSSegmentedControl", "서로 연결된 구획 중 하나를 선택하는 가로형 네이티브 컨트롤입니다.", "보기 모드나 작은 범주의 상호 배타적 선택을 즉시 전환할 때 사용합니다.", ["세그먼트", "토글", "선택", "모드"]),
  term("sheet", "Sheet", "시트", "macos", "오버레이", "NSWindow.beginSheet", "특정 부모 창에 붙어 그 창의 작업만 잠시 막는 문서 단위 모달입니다.", "저장 확인처럼 현재 문서에만 영향을 주는 결정을 받을 때 사용합니다.", ["모달", "창", "확인", "문서"]),
  term("sidebar", "Sidebar (Source List)", "사이드바", "macos", "탐색", "NavigationSplitView", "macOS 창 왼쪽에서 위치나 콘텐츠 출처를 계층적으로 보여 주는 탐색 열입니다.", "메일함, 폴더, 작업 공간처럼 지속적인 최상위 목적지를 제공할 때 사용합니다.", ["소스리스트", "왼쪽", "탐색", "분할"]),
  term("stepper", "Stepper", "스테퍼", "macos", "입력", "NSStepper", "위아래 화살표로 값을 정해진 간격만큼 한 단계씩 증감하는 컨트롤입니다.", "복사 매수처럼 작은 범위의 숫자를 정밀하게 조절할 때 사용합니다.", ["증감", "숫자", "화살표", "단계"]),
  term("toolbar", "Toolbar (Unified Title Bar)", "통합 도구 막대", "macos", "탐색", "NSToolbar", "창 제목 영역과 결합되어 자주 쓰는 문서 명령을 배치하는 도구 막대입니다.", "검색, 새 문서, 공유처럼 현재 창의 주요 액션을 일관되게 제공할 때 사용합니다.", ["툴바", "타이틀바", "액션", "창"]),
  term("traffic-lights", "Traffic Lights (Window Controls)", "신호등 창 버튼", "macos", "시스템", "NSWindow.standardWindowButton", "macOS 창 왼쪽 위의 닫기, 최소화, 전체 화면 버튼 세 개입니다.", "네이티브 창의 표준 위치와 동작을 유지하는 데 사용합니다.", ["닫기", "최소화", "전체화면", "창"]),
  term("vibrancy", "Visual Effect Material (Vibrancy)", "비브런시 소재", "macos", "레이아웃", "NSVisualEffectView", "뒤의 배경색과 콘텐츠가 흐릿하게 비치는 적응형 반투명 표면입니다.", "사이드바와 메뉴를 주변 화면과 연결하면서도 전경 가독성을 유지할 때 사용합니다.", ["반투명", "블러", "소재", "배경"]),
  term("toast", "Toast (Snackbar)", "토스트", "web", "피드백", "role=\"status\"", "작업 결과를 화면 한쪽에 잠깐 보여 주고 자동으로 사라지는 비차단 알림입니다.", "저장 완료처럼 사용 흐름을 멈출 필요 없는 짧은 피드백에 사용합니다.", ["스낵바", "알림", "완료", "상태"]),
  term("dialog-drawer-sheet", "Modal Dialog vs. Drawer vs. Sheet", "모달·드로어·시트", "web", "오버레이", "<dialog>", "중앙 대화상자, 측면 패널, 하단 시트를 위치와 작업 깊이에 따라 구분한 오버레이 패턴입니다.", "짧은 결정은 모달, 보조 편집은 드로어, 모바일 작업은 하단 시트로 선택합니다.", ["모달", "드로어", "바텀시트", "오버레이"]),
  term("popover-dropdown-tooltip", "Popover vs. Dropdown Menu vs. Tooltip", "팝오버·드롭다운·툴팁", "web", "오버레이", "popover", "앵커형 오버레이를 내용과 트리거에 따라 정보 패널, 명령 메뉴, 짧은 도움말로 구분합니다.", "상호작용 여부와 정보량을 기준으로 세 패턴 중 맞는 것을 선택합니다.", ["팝오버", "드롭다운", "툴팁", "앵커"]),
  term("scrim", "Scrim (Backdrop / Overlay)", "스크림", "web", "오버레이", "::backdrop", "모달 표면 뒤에서 원래 화면을 어둡게 가리고 두 레이어를 분리하는 반투명 막입니다.", "사용자의 시선을 전면 작업에 모으고 배경이 비활성임을 알릴 때 사용합니다.", ["백드롭", "오버레이", "딤", "모달"]),
  term("skeleton-spinner", "Skeleton vs. Spinner", "스켈레톤과 스피너", "web", "피드백", "aria-busy=\"true\"", "예상 레이아웃은 스켈레톤으로, 형태를 알 수 없는 짧은 대기는 스피너로 보여 줍니다.", "비동기 콘텐츠를 기다리는 동안 화면이 멈춘 것으로 보이지 않게 합니다.", ["로딩", "스켈레톤", "스피너", "대기"]),
  term("combobox", "Combobox (Autocomplete / Typeahead)", "콤보박스 자동완성", "web", "입력", "role=\"combobox\"", "텍스트를 입력하면 필터된 선택 후보 목록이 연결되어 나타나는 컨트롤입니다.", "선택지가 많아 검색이 필요하지만 유효한 값을 고르게 해야 할 때 사용합니다.", ["자동완성", "타입어헤드", "목록", "선택"]),
  term("command-palette", "Command Palette", "명령 팔레트", "web", "탐색", "Command · role=\"dialog\"", "키보드로 앱의 페이지와 명령을 한곳에서 검색하고 실행하는 런처입니다.", "기능이 많은 생산성 앱에서 숙련 사용자의 탐색 단계를 줄일 때 사용합니다.", ["명령", "검색", "런처", "cmd-k"]),
  term("accordion", "Accordion (Disclosure)", "아코디언", "web", "콘텐츠", "<details> · <summary>", "세로로 쌓인 제목을 열고 닫아 연결된 내용을 제자리에서 보여 주는 패턴입니다.", "FAQ나 설정처럼 한 번에 모든 설명을 펼칠 필요가 없을 때 사용합니다.", ["접기", "펼치기", "FAQ", "디스클로저"]),
  term("tabs", "Tabs", "탭", "web", "탐색", "role=\"tablist\" · role=\"tab\"", "한 콘텐츠 영역을 공유하는 동등한 여러 보기를 레이블 행으로 전환합니다.", "서로 밀접한 뷰를 페이지 이동 없이 빠르게 비교·전환할 때 사용합니다.", ["탭리스트", "탭패널", "전환", "보기"]),
  term("badge-chip-pill", "Badge vs. Chip vs. Pill vs. Tag", "배지·칩·필·태그", "web", "콘텐츠", "Badge", "짧은 라벨을 의미, 모양, 상호작용 여부에 따라 배지·칩·필·태그로 구분합니다.", "상태, 분류, 필터, 숫자를 작고 훑기 쉬운 형태로 표시할 때 사용합니다.", ["배지", "칩", "필", "태그"]),
  term("breadcrumbs", "Breadcrumbs", "브레드크럼", "web", "탐색", "<nav>", "현재 페이지에서 상위 구조로 거슬러 올라가는 계층 경로를 보여 줍니다.", "깊은 정보 구조에서 위치 파악과 상위 단계 이동을 도울 때 사용합니다.", ["경로", "계층", "탐색", "상위"]),
  term("sticky-fixed", "Sticky vs. Fixed Positioning", "스티키와 고정 위치", "web", "레이아웃", "position: sticky · fixed", "컨테이너 안에서만 붙는 스티키와 뷰포트에 계속 고정되는 fixed를 구분합니다.", "스크롤 중 필요한 헤더나 액션을 적절한 범위 안에서 계속 보이게 합니다.", ["스티키", "픽스드", "스크롤", "위치"]),
  term("focus-ring-web", "Focus Ring (:focus-visible)", "웹 포커스 링", "web", "피드백", ":focus-visible", "키보드로 이동했을 때 현재 활성 컨트롤의 외곽을 명확히 표시합니다.", "마우스 사용자에게 불필요한 링은 줄이면서 키보드 접근성을 보장할 때 사용합니다.", ["포커스", "키보드", "접근성", "아웃라인"]),
  term("empty-state", "Empty State", "빈 상태", "web", "콘텐츠", "<section>", "표시할 데이터가 없을 때 이유와 다음 행동을 안내하는 목적 있는 화면입니다.", "첫 사용, 검색 결과 없음, 목록을 모두 처리한 상황을 막다른 길로 만들지 않게 합니다.", ["데이터없음", "온보딩", "안내", "CTA"]),
  term("hover-card", "Hover Card", "호버 카드", "web", "오버레이", "HoverCard", "링크나 사용자 이름에 마우스 또는 포커스를 두면 풍부한 미리보기를 보여 주는 카드입니다.", "현재 페이지를 떠나지 않고 대상의 요약 정보를 확인하게 할 때 사용합니다.", ["미리보기", "호버", "프로필", "카드"]),
  term("switch-checkbox-radio", "Switch vs. Checkbox vs. Radio", "스위치·체크박스·라디오", "web", "입력", "<input type=\"checkbox\" role=\"switch\">", "즉시 켜고 끄기는 스위치, 독립 선택은 체크박스, 단일 선택은 라디오를 사용합니다.", "선택의 적용 시점과 항목 간 관계가 드러나도록 맞는 컨트롤을 고를 때 사용합니다.", ["스위치", "체크박스", "라디오", "선택"]),
  term("toggle-group", "Toggle Group (Segmented Control)", "토글 그룹", "web", "입력", "ToggleGroup", "연결된 작은 옵션 중 하나 또는 여러 개의 활성 상태를 유지하는 컨트롤입니다.", "정렬, 정렬 방향, 보기 방식처럼 즉시 반영되는 좁은 선택에 사용합니다.", ["토글", "세그먼트", "선택", "버튼그룹"]),
  term("menu-bar-extra", "Menu Bar Extra (Status Item)", "메뉴 막대 상태 항목", "macos", "시스템", "NSStatusItem", "macOS 메뉴 막대 오른쪽에 상주하며 앱 상태와 빠른 메뉴를 제공하는 아이콘입니다.", "백그라운드 유틸리티의 상태 확인과 자주 쓰는 명령을 앱 창 없이 제공할 때 사용합니다.", ["상태아이템", "메뉴막대", "트레이", "유틸리티"]),
];

export const UI_CATEGORIES: UiCategory[] = ["탐색", "입력", "피드백", "오버레이", "레이아웃", "콘텐츠", "모션", "시스템"];
