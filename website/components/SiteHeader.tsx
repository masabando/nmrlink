"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { messages, type Locale } from "@/lib/languages";
import { sitePath, documentPath } from "@/lib/site-path";
import SiteSearch from "@/components/SiteSearch";
import { version } from "../../package.json";

export default function SiteHeader({ locale = "ja" }: { locale?: Locale }) {
  const text = messages[locale];
  const pathname = documentPath(usePathname());
  const home = locale === "en" ? "/en" : "/";
  const japanesePath = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const otherLanguagePath = locale === "en" ? japanesePath : `/en${japanesePath === "/" ? "" : japanesePath}`;

  return (
    <header className="navbar fixed inset-x-0 top-0 z-30 h-16 gap-2 bg-base-100/80 px-3 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <label
          htmlFor="site-menu"
          role="button"
          tabIndex={0}
          className="btn btn-ghost btn-square drawer-button lg:hidden"
          aria-label={text.menu}
          aria-controls="site-navigation"
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              document.getElementById("site-menu")?.click();
            }
          }}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <Link href={home} className="rounded-field px-2 py-1 text-xl leading-none font-bold tracking-tighter lg:text-[28px]">NMRLink</Link>
        <a href="https://github.com/masabando/nmrlink/tags" className="btn btn-ghost btn-sm hidden min-[360px]:inline-flex px-2 text-xs font-normal text-base-content/60" aria-label={`${text.version} ${version}: ${text.tagList}`}>{version}</a>
      </div>
      <nav aria-label={text.site} className="flex items-center gap-0 sm:gap-1">
        <Link href={home} className="btn btn-ghost hidden text-sm font-normal lg:inline-flex">{text.docs}</Link>
        <a href={sitePath(`/ui/?lang=${locale}`)} className="btn btn-ghost hidden text-sm font-normal sm:inline-flex">Web UI</a>
        <SiteSearch locale={locale} />
        <a href={sitePath(otherLanguagePath)} hrefLang={locale === "en" ? "ja" : "en"} lang={locale === "en" ? "ja" : "en"} className="btn btn-ghost btn-sm px-2">
          {locale === "en" ? "日本語" : "English"}
        </a>
        <a href="https://github.com/masabando/nmrlink" className="btn btn-ghost btn-square btn-sm sm:btn-md" aria-label={text.github}>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1 1.78 2.12 3.26 1.46.1-.73.39-1.23.71-1.51-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v2.67c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
          </svg>
        </a>
      </nav>
    </header>
  );
}
