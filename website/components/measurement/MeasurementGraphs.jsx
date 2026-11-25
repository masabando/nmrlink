"use client";

import { useEffect, useRef, useState } from "react";
import { NMRGraphs } from "../../../packages/nmrlink/src/graphs.js";
import { saveGraphPng } from "../../../packages/nmrlink/src/browser.js";
import { download } from "./model";
import { messages } from "./messages";

// Reactは外枠、ライブラリはSVGとResizeObserverを担当します。
export default function MeasurementGraphs({
  prepared,
  locale,
  onError,
  children,
}) {
  const fid = useRef(null),
    fft = useRef(null),
    peak = useRef(null),
    status = useRef(null);
  const text = messages[locale];
  const [hidden, setHidden] = useState(["1000", "500", "200", "100"]);
  useEffect(() => {
    if (!prepared) {
      fid.current.textContent = text.empty;
      fft.current.textContent = text.empty;
      peak.current.textContent = status.current.textContent = "";
      return;
    }
    const graphs = new NMRGraphs({
      fid: fid.current,
      fft: fft.current,
      peak: peak.current,
      status: status.current,
      locale,
      fftSeries: prepared.comparison?.map(line => ({
        ...line,
        label: line.key === "none" ? text.lowpassNone : `${line.key} Hz`,
        hidden: hidden.includes(line.key),
      })),
      displayEndMs: prepared.displayEndMs,
      frequencyLimitHz: prepared.frequencyLimitHz,
    });
    graphs.show(prepared.record, prepared.analysis);
    return () => graphs.dispose();
  }, [prepared, locale, text.empty, text.lowpassNone, hidden]);

  async function save(kind, format) {
    const svg = (kind === "fid" ? fid : fft).current.querySelector("svg");
    if (!svg || !prepared) return;
    try {
      if (format === "png")
        await saveGraphPng(svg, {
          filename: download(null, prepared.record, `${kind}.png`),
        });
      else
        download(
          new XMLSerializer().serializeToString(svg),
          prepared.record,
          `${kind}.svg`,
          "image/svg+xml;charset=utf-8",
        );
    } catch (error) {
      onError({ key: "pngError", error });
    }
  }

  return (
    <>
      <section className="card card-border bg-base-100">
        <div className="card-body min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="card-title">{text.fid}</h2>
            <div className="flex gap-2">
              {["svg", "png"].map((format) => (
                <button
                  key={format}
                  className="btn btn-sm"
                  disabled={!prepared}
                  onClick={() => save("fid", format)}
                  aria-label={`${text.fid} ${format.toUpperCase()}`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-base-content/70">{text.legend}</p>
          <div ref={fid} className="min-h-[280px] min-w-0"></div>
        </div>
      </section>
      {children}
      <section className="card card-border bg-base-100">
        <div className="card-body min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="card-title">{text.fft}</h2>
            <div className="flex gap-2">
              {["svg", "png"].map((format) => (
                <button
                  key={format}
                  className="btn btn-sm"
                  disabled={!prepared}
                  onClick={() => save("fft", format)}
                  aria-label={`${text.fft} ${format.toUpperCase()}`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {prepared?.comparison && <>
            <div className="flex flex-wrap gap-x-5 gap-y-3" role="group" aria-label={text.lowpassComparison}>
              {prepared.comparison.map(line => <label key={line.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="checkbox checkbox-sm" checked={!hidden.includes(line.key)}
                  onChange={() => setHidden(current => current.includes(line.key) ? current.filter(key => key !== line.key) : [...current, line.key])} />
                <span aria-hidden="true" style={{ color: line.color }}>━</span>
                {line.key === "none" ? text.lowpassNone : `${line.key} Hz`}
              </label>)}
            </div>
            <p className="text-xs text-base-content/70">{text.lowpassComparisonHint}</p>
          </>}
          <p ref={peak} className="text-sm" />
          <div ref={fft} className="min-h-[280px] min-w-0"></div>
          {prepared?.settings && <p className="text-xs text-base-content/70">{text.lowpassApplied}：{prepared.analysis.lowpass ? `${prepared.analysis.lowpass.cutoffHz} Hz (−3 dB), t ≥ ${prepared.analysis.lowpass.startMs} ms` : text.lowpassNone}</p>}
          <p
            ref={status}
            className="text-xs leading-relaxed text-base-content/70"
          />
        </div>
      </section>
    </>
  );
}
