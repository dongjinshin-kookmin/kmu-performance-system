import type { ReactNode } from "react";

function Window({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`ui-mini-window ${compact ? "is-compact" : ""}`}>
      <div className="ui-mini-titlebar"><i /><i /><i /></div>
      <div className="ui-mini-content">{children}</div>
    </div>
  );
}

function Lines({ count = 3 }: { count?: number }) {
  return <div className="ui-mini-lines">{Array.from({ length: count }, (_, i) => <i key={i} style={{ width: `${92 - i * 14}%` }} />)}</div>;
}

function Menu({ labels = ["열기", "이름 변경", "보관"] }: { labels?: string[] }) {
  return <div className="ui-mini-menu">{labels.map((label, i) => <span key={label} className={i === 0 ? "is-on" : ""}>{label}{i === 1 && <kbd>⌘R</kbd>}</span>)}</div>;
}

export function UiPreview({ slug }: { slug: string }) {
  const preview: Record<string, ReactNode> = {
    "parallax": <div className="ui-parallax"><i className="sun" /><i className="mountain back" /><i className="mountain front" /><span>SCROLL ↓</span></div>,
    "date-picker": <div className="ui-calendar"><b>2026년 7월</b><div>{["일","월","화","수","목","금","토","12","13","14","15","16","17","18"].map((d, i) => <i className={i === 10 || i === 11 ? "is-date" : ""} key={i}>{d}</i>)}</div></div>,
    "pagination": <div className="ui-pagination"><button>‹</button><button className="on">1</button><button>2</button><button>3</button><span>…</span><button>8</button><button>›</button></div>,
    "sign-in-form": <div className="ui-signin"><b>다시 오신 것을 환영해요</b><label>이메일<i /></label><label>비밀번호<i /></label><button>로그인</button><small>또는 Google로 계속</small></div>,
    "carousel": <div className="ui-carousel"><button>‹</button><div><span>01</span><b>새로운 관점</b></div><button>›</button><i /><i className="on" /><i /></div>,
    "header-navbar": <Window compact><div className="ui-header"><b>ACME</b><span>홈</span><span className="on">문서</span><span>가격</span><button>로그인</button></div><Lines count={2} /></Window>,
    "card": <div className="ui-card-demo"><div className="media">CASE 04</div><b>더 나은 체크아웃</b><p>작은 개선이 큰 차이를 만듭니다.</p><span>사례 보기 →</span></div>,
    "resize-handle": <div className="ui-textarea"><span>피드백</span><p>내보내기 버튼을 찾기 어려워요.</p><i>╲╲</i></div>,
    "insertion-caret": <div className="ui-caret-demo">Name that <i /> UI</div>,
    "hamburger-menu": <Window compact><div className="ui-hamburger"><b>Field Notes</b><button><i/><i/><i/></button><aside><span>홈</span><span>글</span><span>소개</span></aside></div></Window>,
    "bento-grid": <div className="ui-bento"><i className="wide"><small>매출</small><b>₩48.2M</b></i><i><small>사용자</small><b>2.4K</b></i><i><small>성장</small><b>+12%</b></i></div>,
    "masonry": <div className="ui-masonry">{[38,58,44,70,50,32].map((h,i)=><i key={i} style={{height:h}}><span>{i+1}</span></i>)}</div>,
    "easing": <div className="ui-curve"><svg viewBox="0 0 180 90"><path d="M12 76 C72 76 105 12 168 12"/><line x1="12" y1="76" x2="168" y2="12"/><circle cx="12" cy="76" r="4"/><circle cx="168" cy="12" r="4"/></svg><span>ease-in-out</span></div>,
    "spring": <div className="ui-spring"><i className="target"/><i className="ball"/><svg viewBox="0 0 200 40"><path d="M10 20 C45 20 50 2 75 20 S108 37 126 20 S148 10 160 20 S174 24 188 20"/></svg></div>,
    "text-scramble": <div className="ui-scramble"><small>DECRYPTING…</small><b>NAME T#A7 UI</b><span>NAME THAT UI</span></div>,
    "lightbox": <div className="ui-lightbox"><i/><div><button>×</button><span>DESERT / 03</span></div></div>,
    "marquee": <div className="ui-marquee"><span>✦ DESIGN</span><span>◆ SYSTEM</span><span>● BUILD</span><span>✦ DESIGN</span></div>,
    "pointer": <div className="ui-pointers"><span>↖<small>기본</small></span><span>☝<small>링크</small></span><span>↔<small>크기</small></span><span>✥<small>이동</small></span></div>,
    "alert": <Window compact><div className="ui-alert"><i>!</i><div><b>휴지통을 비울까요?</b><p>이 작업은 되돌릴 수 없습니다.</p><span><button>취소</button><button className="danger">비우기</button></span></div></div></Window>,
    "slider": <div className="ui-slider"><span>🔈</span><i><b /></i><span>🔊</span><small>65</small></div>,
    "color-well": <div className="ui-color-well"><span>채우기</span><button><i/></button><small>#5D74E6</small></div>,
    "form-field": <div className="ui-field"><label>이메일 <em>*</em></label><div>name@kookmin.ac.kr</div><small>업무용 이메일을 입력하세요.</small></div>,
    "truncation": <div className="ui-truncate"><b>text-overflow</b><p>분기 리뷰 회의 일정이 금요일 오후로 변경되었습니다…</p><b>line-clamp: 2</b><p>이번 업데이트는 동기화 엔진을 개선하고 오프라인 편집 문제를 해결하며…</p></div>,
    "drag-and-drop": <div className="ui-dnd"><section><b>할 일</b><span>⠿ 소개 작성</span><span className="drag">⠿ 헤더 수정</span></section><i>→</i><section className="drop"><b>검토 중</b><span>여기에 놓기</span></section></div>,
    "divider": <div className="ui-dividers"><span>소개</span><hr/><span>세부 정보</span><i/><div><button>복사</button><u/><button>삭제</button></div></div>,
    "progress-indicators": <div className="ui-progress"><i className="spinner"/><i className="ring"><b>65%</b></i><div><span style={{width:"65%"}}/></div></div>,
    "window": <Window><div className="ui-window-body"><aside><i/><i/><i/><i/></aside><div><Lines count={4}/></div></div></Window>,
    "split-view": <Window compact><div className="ui-split"><aside><b>받은 편지함</b><span>보낸 편지함</span><span>임시 보관함</span></aside><i/><section><b>메시지</b><Lines count={4}/></section></div></Window>,
    "scroll-view": <Window compact><div className="ui-scroll"><div><b>저널</b><Lines count={6}/></div><i><b/></i></div></Window>,
    "search-field": <div className="ui-search-demo"><span>⌕</span><b>2026 영수증</b><button>×</button><div><small>최근 검색</small><i>invoices</i><i>tax</i></div></div>,
    "save-panel": <Window compact><div className="ui-save"><label>별도 저장:<i>보고서.pages</i></label><label>위치:<i>문서⌄</i></label><section><span>데스크톱</span><span>문서</span><span>다운로드</span></section><footer><button>취소</button><button>저장</button></footer></div></Window>,
    "token-field": <div className="ui-token-field"><span>태그:</span><i>디자인 <b>×</b></i><i>Q3 보고서 <b>×</b></i><em>|</em></div>,
    "combo-button": <div className="ui-combo-button"><button>저장</button><button>⌄</button><Menu labels={["저장", "별도 저장…", "모두 저장"]}/></div>,
    "level-indicator": <div className="ui-level"><label>평점 <span>★★★★<i>★</i></span></label><label>용량 <b><i/></b></label><label>관련도 <em><i/><i/><i/><i/><i/></em></label></div>,
    "column-view": <Window compact><div className="ui-columns"><section><b>파일</b><span>프로젝트 ›</span><span>보관 ›</span></section><section><span>디자인 ›</span><span className="on">NameThat ›</span></section><section><span>콘텐츠</span><span>리서치</span></section></div></Window>,
    "outline-view": <Window compact><div className="ui-outline"><span>⌄ 라이브러리</span><i>› 프로젝트</i><i>⌄ 디자인</i><b>　NameThat</b><b>　FeelBench</b></div></Window>,
    "three-dots": <div className="ui-overflow"><div><button>•••</button><button>⋮</button><button>☰</button></div><Menu labels={["이름 변경", "복제", "삭제"]}/></div>,
    "menu-bar": <Window compact><div className="ui-menubar"><b>● Finder</b><span>파일</span><span>편집</span><span>보기</span><i>⌁　9:41</i></div><Menu labels={["새로 만들기", "열기…", "종료"]}/></Window>,
    "context-menu": <div className="ui-context"><span>Q3 Report.pages</span><b>⌁</b><Menu labels={["열기", "이름 변경…", "휴지통으로 이동"]}/></div>,
    "disclosure-triangle": <div className="ui-disclosure"><span>⌄ 문서</span><i>　Q3 Report.pages</i><i>　Notes.md</i><span>› 다운로드</span></div>,
    "dock-badge": <div className="ui-dock"><span>✉<b>3</b></span><span>⌘</span><span>♫</span></div>,
    "focus-ring": <div className="ui-focus"><input aria-label="검색" value="검색…" readOnly/><button>활성</button><span>키보드 포커스</span></div>,
    "inspector": <Window compact><div className="ui-inspector"><section><Lines count={4}/></section><aside><b>스타일</b><label>채우기 <i/></label><label>테두리 <i/></label><label>그림자 <i/></label></aside></div></Window>,
    "panel": <div className="ui-panel-demo"><Window compact><Lines count={3}/></Window><aside><b>Colors</b><i/><span>#7546E8</span></aside></div>,
    "popover": <div className="ui-popover"><aside><b>지금 재생 중</b><span>Night Drive</span></aside><button>팝오버 열기</button></div>,
    "popup-pulldown-combo": <div className="ui-popup-types"><button>중간　⌄</button><button>추가　▾</button><label>Avenir <span>⌄</span></label></div>,
    "segmented-control": <div className="ui-segments"><button>일</button><button>주</button><button className="on">월</button><button>년</button></div>,
    "sheet": <Window compact><div className="ui-sheet"><aside><b>“Q3 보고서”를 삭제할까요?</b><p>이 창의 작업만 차단됩니다.</p><span><button>취소</button><button>삭제</button></span></aside><Lines count={3}/></div></Window>,
    "sidebar": <Window compact><div className="ui-source-list"><aside><b>즐겨찾기</b><span>최근 항목</span><span className="on">데스크톱</span><span>문서</span><span>다운로드</span></aside><Lines count={4}/></div></Window>,
    "stepper": <div className="ui-stepper"><label>복사본:<input value="2" readOnly aria-label="복사본"/><span><button>⌃</button><button>⌄</button></span></label></div>,
    "toolbar": <Window compact><div className="ui-toolbar"><b>Notes</b><span>↶</span><span>↷</span><i/><button>＋ 새로 만들기</button></div><Lines count={3}/></Window>,
    "traffic-lights": <Window><div className="ui-traffic-label"><i/>닫기　 <i/>최소화　 <i/>전체 화면</div></Window>,
    "vibrancy": <div className="ui-vibrancy"><i/><i/><div><b>비브런시 켜짐</b><span>배경이 소재를 통해 비칩니다.</span></div></div>,
    "toast": <div className="ui-toast"><Window compact><Lines count={3}/></Window><aside><i>✓</i><b>변경 사항을 저장했습니다</b></aside></div>,
    "dialog-drawer-sheet": <div className="ui-overlay-types"><i className="modal">모달</i><i className="drawer">드로어</i><i className="sheet">시트</i></div>,
    "popover-dropdown-tooltip": <div className="ui-anchor-types"><button>필터</button><aside>활성 항목만　◉</aside><Menu labels={["이름 변경", "복제", "보관"]}/><small>오늘 업데이트됨</small></div>,
    "scrim": <div className="ui-scrim"><Window compact><Lines count={3}/></Window><i/><aside><b>Modal surface</b><span>배경의 반투명 막이 스크림입니다.</span></aside></div>,
    "skeleton-spinner": <div className="ui-loading"><section><i/><Lines count={3}/></section><span className="spinner"/></div>,
    "combobox": <div className="ui-combobox"><label>좋아하는 과일</label><i>Ap</i><div><span className="on">Apple</span><span>Apricot</span></div></div>,
    "command-palette": <div className="ui-command"><header><span>⌕</span><b>명령 검색…</b><kbd>ESC</kbd></header><small>제안</small><i>새 프로젝트 만들기 <kbd>⌘ N</kbd></i><i>설정 열기 <kbd>⌘ ,</kbd></i></div>,
    "accordion": <div className="ui-accordion"><details open><summary>컴포넌트란?</summary><p>구조와 동작을 가진 재사용 UI입니다.</p></details><details><summary>디자인 토큰이란?</summary></details><details><summary>왜 이름이 필요할까요?</summary></details></div>,
    "tabs": <div className="ui-tabs"><header><button className="on">개요</button><button>인사이트</button></header><span>주간 활동</span><b>1,248</b><small>지난주보다 +12%</small></div>,
    "badge-chip-pill": <div className="ui-labels"><span className="badge">✉ <b>7</b></span><span className="chip">디자인　×</span><span className="pill">활성</span><span className="tag">WEB</span></div>,
    "breadcrumbs": <div className="ui-breadcrumbs"><span>홈</span><i>/</i><span>컴포넌트</span><i>/</i><b>버튼</b></div>,
    "sticky-fixed": <div className="ui-position"><section><b>STICKY</b><Lines count={5}/></section><section><Lines count={5}/><b>FIXED</b></section></div>,
    "focus-ring-web": <div className="ui-focus-web"><button>뒤로</button><button className="on">계속</button><button>저장</button><span>:focus-visible</span></div>,
    "empty-state": <div className="ui-empty"><i>◇</i><b>아직 프로젝트가 없습니다</b><span>첫 프로젝트를 만들어 시작하세요.</span><button>＋ 새 프로젝트</button></div>,
    "hover-card": <div className="ui-hover"><span>Designed by <u>@jane</u></span><aside><i>J</i><b>Jane Appleseed</b><small>@jane</small><p>Design systems engineer.</p></aside></div>,
    "switch-checkbox-radio": <div className="ui-choice"><label><span className="switch"><i/></span> 스위치</label><label><span className="check">✓</span> 체크박스</label><label><span className="radio"><i/></span> 라디오</label></div>,
    "toggle-group": <div className="ui-toggle-group"><button>왼쪽</button><button className="on">가운데</button><button>오른쪽</button></div>,
    "menu-bar-extra": <Window compact><div className="ui-statusbar"><b>● Finder</b><i>◒　⌁　♫　9:41</i></div><aside className="ui-status-pop"><b>집중 모드</b><span>켜짐　●</span></aside></Window>,
  };

  return <div className="ui-preview" aria-hidden="true" inert>{preview[slug] ?? <Lines count={4} />}</div>;
}
