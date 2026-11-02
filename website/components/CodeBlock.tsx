import type { Locale } from "@/lib/languages";
import { highlightCode } from "@/lib/highlight-code";
import CodeBlockClient from "./CodeBlockClient";

// Server Component: Shikiはビルド時だけ実行し、ブラウザには色付け済みのHTMLを渡します。
export default async function CodeBlock({ code, language, locale = "ja" }: {
  code: string; language?: string; locale?: Locale;
}) {
  const highlighted = await highlightCode(code, language);
  return <CodeBlockClient code={code} language={language} locale={locale} highlighted={highlighted} />;
}
