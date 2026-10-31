import { sitePath } from "@/lib/site-path";
import Link from "next/link";
import { messages, type Locale } from "@/lib/languages";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const text = messages[locale];
  return (
    <footer className="border-t border-base-300/50 bg-base-200/30">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 lg:px-16">
        <div className="footer gap-8 text-sm sm:footer-horizontal sm:justify-between">
          <div className="max-w-64 space-y-2">
            <Link href={locale === "en" ? "/en" : "/"} className="text-xl font-bold tracking-tighter">NMRLink</Link>
            <p className="leading-5 text-base-content/60">{text.tagline}</p>
          </div>
          <nav aria-label={text.project}>
            <h2 className="footer-title">{text.project}</h2>
            <a className="link link-hover" href="https://github.com/masabando/nmrlink">GitHub</a>
            <a className="link link-hover" href="https://www.npmjs.com/package/nmrlink">npm</a>
            <a className="link link-hover" href={sitePath("/llms.txt")}>llms.txt</a>
            <a className="link link-hover" href="https://github.com/masabando/nmrlink/blob/main/LICENSE">MIT License</a>
          </nav>
          <nav aria-label={text.related}>
            <h2 className="footer-title">{text.related}</h2>
            <a className="link link-hover" href="https://alice.helixcode.net/~bando/">Masamitsu Bando</a>
            <a className="link link-hover" href="https://alice.helixcode.net/~bando/Lab/">Bando Lab</a>
            <a className="link link-hover" href="https://researchmap.jp/kondo_yasushi">{text.author}</a>
          </nav>
        </div>
        <p className="mt-8 text-xs leading-5 text-base-content/60">© 2026 Masamitsu Bando</p>
      </div>
    </footer>
  );
}
