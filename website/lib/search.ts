import { sitePath } from "./site-path";

export type SearchHit = { url: string; page: string; section: string; excerpt: string };
type PagefindPage = {
  url: string; excerpt: string; meta: { title: string };
  sub_results: { url: string; title: string; excerpt: string }[];
};
type SearchEngine = {
  init(): Promise<void>;
  options(options: { baseUrl: string }): Promise<void>;
  search(query: string): Promise<{ results: { data(): Promise<PagefindPage> }[] }>;
};

// 実行時に静的ファイルを読みます。Next.jsのバンドルへ組み込みません。
let enginePromise: Promise<SearchEngine> | undefined;
export function loadSearch() {
  enginePromise ??= (async () => {
    const url = sitePath("/pagefind/pagefind.js");
    const engine = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as SearchEngine;
    await engine.options({ baseUrl: sitePath("/") });
    await engine.init();
    return engine;
  })().catch(error => {
    enginePromise = undefined; // 再試行時に読み直せるようにします。
    throw error;
  });
  return enginePromise;
}

export async function searchDocuments(query: string, limit: number) {
  const engine = await loadSearch();
  const search = await engine.search(query);
  const pages = await Promise.all(search.results.slice(0, limit).map(result => result.data()));
  const hits: SearchHit[] = pages.map(page => {
    // 最も関連する節へ移動。該当する節がなければページ先頭へ移動します。
    const section = page.sub_results[0];
    return {
      url: section?.url ?? page.url,
      page: page.meta.title,
      section: section?.title === page.meta.title ? "" : section?.title ?? "",
      excerpt: section?.excerpt ?? page.excerpt,
    };
  });
  return { hits, total: search.results.length };
}
