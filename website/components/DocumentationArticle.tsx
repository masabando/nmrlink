import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement, type CSSProperties } from "react";
import type { Locale } from "@/lib/languages";

// 本文はpage.tsxにそのまま書きます。h2・h3から目次を作り、見出しの追加漏れを防ぎます。
export default function DocumentationArticle({ children, locale = "ja" }: { children: ReactNode; locale?: Locale }) {
  const sections: { id: string; title: ReactNode; level: 2 | 3 }[] = [];
  const content = Children.toArray(children).map(child => {
    if (!isValidElement(child) || child.type !== "h2" && child.type !== "h3") return child;
    const heading = child as ReactElement<{ id?: string; children: ReactNode; style?: CSSProperties }>;
    const id = heading.props.id ?? `section-${sections.length + 1}`;
    sections.push({ id, title: heading.props.children, level: child.type === "h2" ? 2 : 3 });
    return cloneElement(heading, { id, style: { ...heading.props.style, scrollMarginTop: "6rem" } });
  });
  const firstSection = content.findIndex(child => isValidElement(child) && child.type === "h2");
  const contents = sections.length >= 4 ? (
    <details className="collapse collapse-arrow my-6 border border-base-300 bg-base-200/30">
      <summary className="collapse-title min-h-0 py-3 font-medium">{locale === "ja" ? "このページの内容" : "On this page"}</summary>
      <nav className="collapse-content" aria-label={locale === "ja" ? "ページ内の目次" : "Page contents"}>
        <ul className="space-y-1">
          {sections.map(section => <li key={section.id} className={section.level === 3 ? "ml-3" : undefined}><a href={`#${section.id}`}>{section.title}</a></li>)}
        </ul>
      </nav>
    </details>
  ) : null;
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      {content.slice(0, firstSection)}
      {contents}
      {content.slice(firstSection)}
    </article>
  );
}
