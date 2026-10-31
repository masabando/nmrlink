import katex from "katex";
import "katex/dist/katex.min.css";

// Server Component: generate the markup before sending the page to the browser.
// Write TeX with String.raw`...` in the page to keep backslashes readable.
export default function MathFormula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: block,
    output: "htmlAndMathml",
    throwOnError: true,
    strict: "error",
    trust: false,
  });

  if (block) {
    return (
      <div className="my-6 overflow-x-auto">
        {/* Keep the full formula scrollable, including its left edge on narrow screens. */}
        <div style={{ width: "max-content", minWidth: "100%" }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
