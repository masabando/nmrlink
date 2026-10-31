"use client";

import Link from "next/link";
import { sitePath, documentPath } from "@/lib/site-path";
import { usePathname } from "next/navigation";
import { messages, type Locale } from "@/lib/languages";


export default function SiteSidebar({ locale = "ja" }: { locale?: Locale }) {
  const text = messages[locale];
  const home = locale === "en" ? "/en" : "/";
  const prefix = locale === "en" ? "/en" : "";
  const pathname = documentPath(usePathname()).replace(/\/$/, "") || "/";

  function currentPage(href: string, className = "") {
    const active = pathname === href;
    return {
      className: [className, active ? "menu-active font-semibold" : ""].filter(Boolean).join(" ") || undefined,
      "aria-current": active ? "page" as const : undefined,
    };
  }

  return (
    <aside className="drawer-side top-16 z-20 h-[calc(100dvh-4rem)] lg:border-r lg:border-base-300">
      <label htmlFor="site-menu" aria-label={text.closeMenu} className="drawer-overlay" />
      <nav
        id="site-navigation"
        aria-label={text.docs}
        className="min-h-full w-72 bg-base-100 px-4 py-6"
        onClick={event => {
          if (event.target instanceof Element && event.target.closest("a")) {
            const toggle = document.getElementById("site-menu") as HTMLInputElement;
            toggle.checked = false;
          }
        }}
      >
        <ul className="menu w-full gap-1">
          <li><Link href={home} {...currentPage(home)}>{text.introduction}</Link></li>
          <li className="menu-title mt-4">{text.webUI}</li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
            <a href={sitePath(`/ui/?lang=${locale}`)} className="min-w-0">{text.standard} ↗</a>
            <Link href={`${prefix}/guide/standard`} {...currentPage(`${prefix}/guide/standard`, "text-xs")} aria-label={`${text.standard}: ${text.guide}`}>{text.guide}</Link>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
            <a href={sitePath(`/ui/frequency/?lang=${locale}`)} className="min-w-0">{text.frequency} ↗</a>
            <Link href={`${prefix}/guide/frequency`} {...currentPage(`${prefix}/guide/frequency`, "text-xs")} aria-label={`${text.frequency}: ${text.guide}`}>{text.guide}</Link>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
            <a href={sitePath(`/ui/pulse/?lang=${locale}`)} className="min-w-0">{text.pulse} ↗</a>
            <Link href={`${prefix}/guide/pulse`} {...currentPage(`${prefix}/guide/pulse`, "text-xs")} aria-label={`${text.pulse}: ${text.guide}`}>{text.guide}</Link>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
            <a href={sitePath(`/ui/t1/?lang=${locale}`)} className="min-w-0">{text.t1} ↗</a>
            <Link href={`${prefix}/guide/t1`} {...currentPage(`${prefix}/guide/t1`, "text-xs")} aria-label={`${text.t1}: ${text.guide}`}>{text.guide}</Link>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
            <a href={sitePath(`/ui/t2/?lang=${locale}`)} className="min-w-0">{text.t2} ↗</a>
            <Link href={`${prefix}/guide/t2`} {...currentPage(`${prefix}/guide/t2`, "text-xs")} aria-label={`${text.t2}: ${text.guide}`}>{text.guide}</Link>
          </li>
          <li className="menu-title mt-4">{text.libraryGuide}</li>
          <li><Link href={`${prefix}/guide/install`} {...currentPage(`${prefix}/guide/install`)}>{text.install}</Link></li>
          <li><Link href={`${prefix}/guide/first`} {...currentPage(`${prefix}/guide/first`)}>{text.buildFirstUI}</Link></li>
          <li><Link href={`${prefix}/guide/measurement`} {...currentPage(`${prefix}/guide/measurement`)}>{text.controlMeasurement}</Link></li>
          <li><Link href={`${prefix}/guide/analysis`} {...currentPage(`${prefix}/guide/analysis`)}>{text.analyzeSignal}</Link></li>
          <li><Link href={`${prefix}/guide/graphs`} {...currentPage(`${prefix}/guide/graphs`)}>{text.displayGraphs}</Link></li>
          <li><Link href={`${prefix}/guide/save`} {...currentPage(`${prefix}/guide/save`)}>{text.save}</Link></li>
          <li><Link href={`${prefix}/guide/ai`} {...currentPage(`${prefix}/guide/ai`)}>{text.ai}</Link></li>
          <li className="menu-title mt-4">{text.reference}</li>
          <li>
            <Link href={`${prefix}/reference/api`} {...currentPage(`${prefix}/reference/api`)}>API</Link>
            <ul>
              <li><Link href={`${prefix}/reference/api/measurement`} {...currentPage(`${prefix}/reference/api/measurement`)}>{text.apiMeasurement}</Link></li>
              <li><Link href={`${prefix}/reference/api/analysis`} {...currentPage(`${prefix}/reference/api/analysis`)}>{text.apiAnalysis}</Link></li>
              <li><Link href={`${prefix}/reference/api/graphs`} {...currentPage(`${prefix}/reference/api/graphs`)}>{text.apiGraphs}</Link></li>
              <li><Link href={`${prefix}/reference/api/files`} {...currentPage(`${prefix}/reference/api/files`)}>{text.apiFiles}</Link></li>
              <li><Link href={`${prefix}/reference/api/sweeps`} {...currentPage(`${prefix}/reference/api/sweeps`)}>{text.apiSweeps}</Link></li>
              <li><Link href={`${prefix}/reference/api/relaxation`} {...currentPage(`${prefix}/reference/api/relaxation`)}>{text.apiRelaxation}</Link></li>
              <li><Link href={`${prefix}/reference/api#error-codes`}>{text.apiErrors}</Link></li>
            </ul>
          </li>
          <li><Link href={`${prefix}/reference/analysis`} {...currentPage(`${prefix}/reference/analysis`)}>{text.analysisSpec}</Link></li>
          <li><Link href={`${prefix}/guide/browsers`} {...currentPage(`${prefix}/guide/browsers`)}>{text.browsersTroubleshooting}</Link></li>
          <li className="menu-title mt-4">{text.remote}</li>
          <li><Link href={`${prefix}/guide/remote`} {...currentPage(`${prefix}/guide/remote`)}>{text.remoteStart}</Link></li>
          <li><Link href={`${prefix}/guide/remote-admin`} {...currentPage(`${prefix}/guide/remote-admin`)}>{text.admin}</Link></li>
          <li><Link href={`${prefix}/guide/remote-ui`} {...currentPage(`${prefix}/guide/remote-ui`)}>{text.remoteUI}</Link></li>
        </ul>
      </nav>
    </aside>
  );
}
