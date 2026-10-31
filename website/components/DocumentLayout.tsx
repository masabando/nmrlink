import { Noto_Sans_JP } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteSidebar from "@/components/SiteSidebar";
import SiteFooter from "@/components/SiteFooter";
import { messages, type Locale } from "@/lib/languages";
import "@/app/globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
});

// 日英で同じ配置を使い、HTMLのlang属性は初回表示から正しく設定します。
export default function DocumentLayout({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const text = messages[locale];
  return (
    <html lang={locale}>
      <body className={notoSansJP.className}>
        <a href="#main-content" className="btn fixed -top-20 left-4 z-50 focus:top-2">{text.skip}</a>
        <div className="drawer pt-16 lg:drawer-open">
          <input id="site-menu" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content flex min-h-[calc(100dvh-4rem)] min-w-0 flex-col">
            <SiteHeader locale={locale} />
            <main data-pagefind-body id="main-content" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 text-sm leading-5 sm:px-10 lg:px-16 lg:py-16">
              {children}
            </main>
            <SiteFooter locale={locale} />
          </div>
          <SiteSidebar locale={locale} />
        </div>
      </body>
    </html>
  );
}
