"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { loadSearch, searchDocuments, type SearchHit } from "@/lib/search";
import type { Locale } from "@/lib/languages";

const labels = {
  ja: {
    open: "ドキュメントを検索", title: "ドキュメントを検索", close: "検索を閉じる",
    placeholder: "キーワード・API名・エラーコード", hint: "日本語のページを検索します。",
    loading: "検索を準備しています…", searching: "検索しています…", empty: "一致するページがありません。別の言葉で検索してください。",
    failed: "検索を読み込めませんでした。もう一度お試しください。", retry: "再試行", more: "さらに表示",
    results: "検索結果", count: (total: number, shown: number) => `${total}ページ見つかりました${total > shown ? `（上位${shown}ページを表示）` : ""}`,
    keys: "↑↓で選択 · Enterで移動 · Escで閉じる",
  },
  en: {
    open: "Search documentation", title: "Search documentation", close: "Close search",
    placeholder: "Keyword, API name, or error code", hint: "Search English pages.",
    loading: "Preparing search…", searching: "Searching…", empty: "No matching pages. Try another term.",
    failed: "Could not load search. Please try again.", retry: "Retry", more: "Show more",
    results: "Search results", count: (total: number, shown: number) => `${total} page${total === 1 ? "" : "s"} found${total > shown ? ` (showing the top ${shown})` : ""}`,
    keys: "↑↓ to select · Enter to open · Esc to close",
  },
};

export default function SiteSearch({ locale }: { locale: Locale }) {
  const text = labels[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(8);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "searching" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  const openSearch = useCallback(() => {
    if (dialog.current?.open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    input.current?.focus();
    setOpen(true);
  }, []);

  useEffect(() => {
    function shortcut(event: globalThis.KeyboardEvent) {
      if (event.isComposing || event.repeat || event.altKey || event.shiftKey) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Pagefindの読み込みは、検索を開いてから行います。
    const timer = setTimeout(async () => {
      setState(query.trim() ? "searching" : "loading");
      try {
        if (!query.trim()) {
          await loadSearch();
          if (!cancelled) { setHits([]); setTotal(0); setState("ready"); }
        } else {
          const found = await searchDocuments(query.trim(), limit);
          if (!cancelled) { setHits(found.hits); setTotal(found.total); setState("ready"); }
        }
      } catch (error) {
        if (!cancelled) { setHits([]); setState("failed"); console.warn("NMRLink search:", error); }
      }
    }, query.trim() ? 150 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, query, limit, attempt]);

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.current?.close();
      return;
    }
    const links = [...(results.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    if (!links.length) return;
    if (event.key === "Enter" && event.target === input.current) {
      event.preventDefault();
      links[0].click();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = current < 0 ? (event.key === "ArrowDown" ? 0 : links.length - 1)
        : (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links[next].focus();
    }
  }

  const message = state === "failed" ? text.failed : state === "loading" ? text.loading
    : state === "searching" ? text.searching : !query.trim() ? text.hint
    : total === 0 ? text.empty : text.count(total, hits.length);

  return (
    <>
      <button type="button" onClick={openSearch} aria-label={text.open} aria-haspopup="dialog" aria-controls="site-search" aria-keyshortcuts="Meta+K Control+K" title={`${text.open} (⌘K / Ctrl+K)`} className="btn btn-ghost btn-square btn-sm sm:btn-md">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" />
        </svg>
      </button>
      <dialog id="site-search" ref={dialog} onKeyDown={keyboard} aria-labelledby="site-search-title" className="modal items-start p-3 pt-20 sm:pt-24" onClose={() => {
        setOpen(false);
        if (previousFocus.current?.isConnected) previousFocus.current.focus();
      }}>
        <div className="modal-box flex max-h-[calc(100dvh-7rem)] w-full max-w-2xl flex-col overflow-hidden p-0">
          <div className="border-b border-base-300 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="site-search-title" className="text-base font-bold">{text.title}</h2>
              <button type="button" className="btn btn-ghost btn-square btn-sm" aria-label={text.close} onClick={() => dialog.current?.close()}>✕</button>
            </div>
            <input ref={input} type="search" name="documentation-search" aria-label={text.open} placeholder={text.placeholder} autoComplete="off" spellCheck={false} className="input w-full" value={query} onChange={event => {
              setQuery(event.target.value);
              setLimit(8);
              setHits([]);
              setTotal(0);
              setState(event.target.value.trim() ? "searching" : "loading");
            }} />
            <p role="status" className="mt-3 text-sm text-base-content/70">{message}</p>
            {state === "failed" ? <button type="button" className="btn btn-sm mt-3" onClick={() => setAttempt(value => value + 1)}>{text.retry}</button> : null}
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-2">
            <ul ref={results} aria-label={text.results}>
              {hits.map(hit => <li key={hit.url}>
                <a href={hit.url} onClick={() => dialog.current?.close()} className="block rounded-box p-3 hover:bg-base-200 focus-visible:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
                  <span className="block text-sm font-semibold">{hit.page}</span>
                  {hit.section ? <span className="mt-1 block text-sm">{hit.section}</span> : null}
                  {/* Pagefind escapes indexed content before adding its mark elements. */}
                  <span className="mt-1 block text-sm leading-5 text-base-content/70 [&_mark]:bg-warning/30 [&_mark]:text-base-content" dangerouslySetInnerHTML={{ __html: hit.excerpt }} />
                </a>
              </li>)}
            </ul>
            {state === "ready" && total > hits.length ? <button type="button" className="btn btn-ghost btn-sm my-2 w-full" onClick={() => setLimit(value => value + 8)}>{text.more}</button> : null}
          </div>
          <p className="border-t border-base-300 px-4 py-3 text-xs text-base-content/60">{text.keys}</p>
        </div>
        <form method="dialog" className="modal-backdrop" aria-hidden="true"><button tabIndex={-1}>close</button></form>
      </dialog>
    </>
  );
}
