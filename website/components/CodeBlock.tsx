"use client";

import { useRef, useState } from "react";
import { messages, type Locale } from "@/lib/languages";

export default function CodeBlock({ code, language, locale = "ja" }: { code: string; language?: string; locale?: Locale }) {
  const text = messages[locale];
  const codeElement = useRef<HTMLElement>(null);
  const [message, setMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(text.copied);
    } catch {
      // HTTPのLANプレビューなどでは、コピーAPIが使えないため選択します。
      const range = document.createRange();
      range.selectNodeContents(codeElement.current!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setMessage(text.selected);
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-box border border-base-300 bg-base-200/60">
      <div data-pagefind-ignore className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-2">
        <span className="text-xs text-base-content/60">{language}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={copyCode}>{message === text.copied ? text.copied : text.copy}</button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6"><code ref={codeElement}>{code}</code></pre>
      <span data-pagefind-ignore role="status" className={message === text.selected ? "block px-4 pb-3 text-xs text-base-content/70" : "sr-only"}>{message}</span>
    </div>
  );
}
