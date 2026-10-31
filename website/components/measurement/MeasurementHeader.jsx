"use client";

import { useRouter } from "next/navigation";
import { sitePath } from "@/lib/site-path";
import { useInstrument } from "./InstrumentProvider";
import { messages } from "./messages";

export default function MeasurementHeader() {
  const router = useRouter();
  const { locale, changeLocale, state, setNotice, activity, page } =
    useInstrument();
  const text = messages[locale];
  function navigate(event) {
    const destination = event.target.value;
    event.target.value = page;
    if (destination === page) return;
    if (state.busy || activity) {
      setNotice({ key: "switchBusy" });
      return;
    }
    if (["standard", "frequency", "pulse", "t1", "t2"].includes(destination)) {
      router.push(
        `${destination === "standard" ? "/ui/" : `/ui/${destination}/`}?lang=${locale}`,
      );
      return;
    }
  }
  return (
    <>
      <a
        href="#measurement-content"
        className="btn fixed -top-20 left-4 z-50 focus:top-2"
      >
        {text.skip}
      </a>
      <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/85 backdrop-blur-xl">
        <nav
          className="navbar mx-auto max-w-[1500px] flex-wrap gap-2 px-4 sm:px-6"
          aria-label={text.page}
        >
          <a
            className="text-xl font-bold tracking-tight"
            href={sitePath(locale === "en" ? "/en/" : "/")}
            target="_blank"
            rel="noreferrer"
          >
            NMRLink
          </a>
          <span className="badge badge-outline text-xs">
            {text[state.connection] ?? state.connection}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              className="select select-sm w-36 sm:w-44"
              aria-label={text.page}
              value={page}
              onChange={navigate}
            >
              <option value="standard">{text.title}</option>
              <option value="frequency">{text.frequencyPage}</option>
              <option value="pulse">{text.pulsePage}</option>
              <option value="t1">{text.t1Page}</option>
              <option value="t2">{text.t2Page}</option>
            </select>
            <select
              className="select select-sm w-24"
              aria-label={text.language}
              value={locale}
              onChange={(event) => changeLocale(event.target.value)}
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
            <a
              className="btn btn-ghost btn-sm"
              href={sitePath(`${locale === "en" ? "/en" : ""}/guide/${page}/`)}
              target="_blank"
              rel="noreferrer"
            >
              {text.guide}
            </a>
          </div>
        </nav>
      </header>
    </>
  );
}
