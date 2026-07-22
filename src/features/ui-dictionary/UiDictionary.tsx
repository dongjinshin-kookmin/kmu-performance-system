"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UI_CATEGORIES, UI_TERMS, type UiCategory, type UiPlatform, type UiTerm } from "./data";
import { UiPreview } from "./UiPreview";

type PlatformFilter = "all" | UiPlatform;

const PLATFORM_LABEL: Record<PlatformFilter, string> = { all: "전체", web: "Web", macos: "macOS" };

function buildPrompt(item: UiTerm) {
  return `${item.nameKo}(${item.name}) 패턴을 구현해 주세요. ${item.description} 사용 목적: ${item.use} 구현 기준은 ${item.api}이며, 키보드 조작·포커스 표시·명확한 레이블을 포함해 접근 가능하게 만들어 주세요.`;
}

export function UiDictionary() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [category, setCategory] = useState<UiCategory | "all">("all");
  const [selected, setSelected] = useState<UiTerm | null>(null);
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko");
    return UI_TERMS.filter((item) => {
      if (platform !== "all" && item.platform !== platform) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!needle) return true;
      const haystack = [item.name, item.nameKo, item.description, item.use, item.api, ...item.keywords].join(" ").toLocaleLowerCase("ko");
      return haystack.includes(needle);
    });
  }, [query, platform, category]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && selected) setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    if (selected) requestAnimationFrame(() => closeRef.current?.focus());
  }, [selected]);

  const copyPrompt = async (item: UiTerm) => {
    await navigator.clipboard.writeText(buildPrompt(item));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => {
    setQuery("");
    setPlatform("all");
    setCategory("all");
    searchRef.current?.focus();
  };

  return (
    <main className="wrap ui-dictionary-page">
      <header className="ui-dictionary-hero">
        <div className="ui-dictionary-intro">
          <div className="ui-dictionary-kicker"><span>UI FIELD GUIDE</span><i /> 2026.07</div>
          <h1>이름을 알면,<br /><em>디자인이<br />선명해집니다.</em></h1>
          <p>웹과 macOS에서 반복해 만나는 UI 패턴 71개를 한국어 설명과 자체 제작 도판으로 정리했습니다.</p>
        </div>
        <div className="ui-dictionary-stats" aria-label="사전 통계">
          <div><strong>71</strong><span>전체 용어</span></div>
          <div><strong>39</strong><span>Web</span></div>
          <div><strong>32</strong><span>macOS</span></div>
        </div>
      </header>

      <section className="ui-dictionary-tools" aria-label="UI 사전 검색과 필터">
        <label className="ui-dictionary-search">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="‘점을 눌러 여는 메뉴’, ‘로딩 막대’처럼 검색하세요" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="ui-platform-tabs" aria-label="플랫폼" role="group">
          {(["all", "web", "macos"] as PlatformFilter[]).map((value) => (
            <button key={value} className={platform === value ? "is-active" : ""} onClick={() => setPlatform(value)} aria-pressed={platform === value}>
              {PLATFORM_LABEL[value]} <small>{value === "all" ? 71 : value === "web" ? 39 : 32}</small>
            </button>
          ))}
        </div>
        <div className="ui-category-filters" aria-label="용도" role="group">
          <button className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")} aria-pressed={category === "all"}>모든 용도</button>
          {UI_CATEGORIES.map((value) => <button key={value} className={category === value ? "is-active" : ""} onClick={() => setCategory(value)} aria-pressed={category === value}>{value}</button>)}
        </div>
      </section>

      <div className="ui-results-head">
        <p><strong>{results.length}</strong>개의 패턴</p>
        <span>카드를 누르면 사용 맥락과 구현 힌트를 볼 수 있습니다.</span>
      </div>

      {results.length ? (
        <section className="ui-dictionary-grid" aria-label="UI 패턴 목록">
          {results.map((item, index) => (
            <article className="ui-term-card reveal" key={item.slug} style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}>
              <UiPreview slug={item.slug} />
              <button className="ui-term-open" onClick={() => setSelected(item)} aria-label={`${item.nameKo} 상세 보기`}>
                <div className="ui-term-copy">
                  <div className="ui-term-meta"><span>{String(UI_TERMS.indexOf(item) + 1).padStart(2, "0")}</span><i className={item.platform}>{item.platform === "web" ? "WEB" : "macOS"}</i><em>{item.category}</em></div>
                  <h2>{item.nameKo}</h2>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </button>
              <footer><code>{item.api}</code><button onClick={() => setSelected(item)} aria-label={`${item.nameKo} 자세히`}>자세히 <span>↗</span></button></footer>
            </article>
          ))}
        </section>
      ) : (
        <section className="ui-no-results">
          <i>⌕</i><h2>맞는 패턴을 찾지 못했습니다.</h2><p>모양, 위치, 동작을 더 짧은 말로 검색해 보세요.</p><button onClick={reset}>필터 초기화</button>
        </section>
      )}

      <footer className="ui-dictionary-source">
        <div><span>COLLECTION NOTE</span><h2>원본을 베끼지 않고,<br />쓸 수 있는 지식으로 다시 정리했습니다.</h2></div>
        <p>용어 목록과 플랫폼 API는 <a href="https://namethatui.com/" target="_blank" rel="noreferrer">NameThatUI</a>의 공개 인덱스를 참고했습니다. 한국어 설명, 사용 지침, 카드 구성, 미니 도판은 이 프로젝트를 위해 새로 작성했으며 원본 스크린샷은 저장하지 않았습니다.</p>
      </footer>

      {selected && (
        <div className="ui-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <section className="ui-detail" role="dialog" aria-modal="true" aria-labelledby="ui-detail-title">
            <header>
              <div><span>{selected.platform === "web" ? "WEB PATTERN" : "macOS PATTERN"}</span><i>{selected.category}</i></div>
              <button ref={closeRef} onClick={() => setSelected(null)} aria-label="상세 보기 닫기">×</button>
            </header>
            <UiPreview slug={selected.slug} />
            <div className="ui-detail-body">
              <p className="ui-detail-number">{String(UI_TERMS.indexOf(selected) + 1).padStart(2, "0")} / 71</p>
              <h2 id="ui-detail-title">{selected.nameKo}</h2>
              <h3>{selected.name}</h3>
              <p className="ui-detail-description">{selected.description}</p>
              <dl>
                <div><dt>언제 쓰나요</dt><dd>{selected.use}</dd></div>
                <div><dt>구현 키워드</dt><dd><code>{selected.api}</code></dd></div>
                <div><dt>함께 검색하기</dt><dd>{selected.keywords.map((word) => <span key={word}>#{word}</span>)}</dd></div>
              </dl>
              <div className="ui-detail-actions">
                <button onClick={() => copyPrompt(selected)}>{copied ? "복사했습니다 ✓" : "개발 프롬프트 복사"}</button>
                <a href={selected.source} target="_blank" rel="noreferrer">원본 용어 페이지 ↗</a>
              </div>
            </div>
          </section>
        </div>
      )}

      {copied && <div className="ui-copy-toast" role="status">개발 프롬프트를 클립보드에 복사했습니다.</div>}
    </main>
  );
}
