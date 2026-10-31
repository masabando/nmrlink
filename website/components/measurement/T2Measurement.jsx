"use client";

import { useMemo, useRef } from "react";
import {
  parseT2Measurement,
  evaluateT2,
  MAX_T2_JSON_BYTES,
} from "../../../packages/nmrlink/src/index.js";
import {
  saveMeasurement,
  saveGraphPng,
} from "../../../packages/nmrlink/src/browser.js";
import { diagnosticMessage } from "../../../examples/shared/diagnostics.js";
import ConnectionPanel from "./ConnectionPanel";
import MeasurementHeader from "./MeasurementHeader";
import MeasurementGraphs from "./MeasurementGraphs";
import NumberField from "./NumberField";
import T2Curve from "./T2Curve";
import { useInstrument, useSessionField } from "./InstrumentProvider";
import { messages } from "./messages";
import { t2Messages, t2Text } from "./t2-messages";
import {
  initialT2Fields,
  initialT2Fit,
  emptyT2Result,
  prepareT2,
  prepareT2FitRange,
  t2Seconds,
  t2PointSeconds,
  bestT2,
  fieldsFromT2,
  reanalyzeT2,
  t2DemoDevice,
  t2Archive,
  t2Csv,
  t2Filename,
  prepareT2Point,
} from "./t2-model";

export default function T2Measurement() {
  const {
    locale,
    state,
    activity,
    setActivity,
    scanT2,
    stopScan,
    stopping,
    notice,
    setNotice,
  } = useInstrument();
  const text = { ...messages[locale], ...t2Messages[locale] };
  const [fields, setFields] = useSessionField("t2", "fields", initialT2Fields);
  const [result, setResult] = useSessionField("t2", "result", emptyT2Result);
  const [selectedTau, setSelectedTau] = useSessionField(
    "t2",
    "selectedTau",
    null,
  );
  const [fitFields, setFitFields] = useSessionField(
    "t2",
    "fitFields",
    initialT2Fit,
  );
  const fileInput = useRef(null),
    curve = useRef(null),
    fileLoading = useRef(false);
  const running = activity === "t2",
    locked = state.busy || Boolean(activity);
  const selected = result.points.find((point) => point.tau === selectedTau);
  const prepared = useMemo(
    () => (selected ? prepareT2Point(selected, result.settings) : null),
    [selected, result.settings],
  );
  const decay = result.decay,
    fit = decay?.fit,
    reference = decay?.reference;
  let plan = null,
    planError = null;
  try {
    plan = prepareT2(fields);
  } catch (error) {
    planError = error;
  }

  function diagnostic(error) {
    if (error?.code === "NO_REFERENCE_SIGNAL") return text.noReferenceSignal;
    if (error?.code === "UI_T2_FIT_RANGE") return text.fitRangeError;
    return (
      diagnosticMessage(error, locale) ??
      (locale === "en"
        ? "Check the scan settings, fit range, frequency reference or file."
        : "走査条件・近似範囲・周波数基準・ファイルを確認してください。")
    );
  }
  function updateField(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
  }
  function updateFitField(name, value) {
    setFitFields((current) => ({ ...current, [name]: value }));
  }
  function valid(form) {
    if (form.checkValidity()) return true;
    form.querySelector(":invalid")?.focus();
    setNotice({ key: "required" });
    return false;
  }
  async function start(demo) {
    if (locked || (!demo && !state.canMeasure)) return;
    let settings, range;
    try {
      settings = prepareT2(fields);
      range = prepareT2FitRange(fitFields);
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    const base = {
      ...emptyT2Result,
      settings,
      source: demo ? "demo" : "instrument",
      acquiredAt: new Date().toISOString(),
      ...range,
    };
    const collected = [];
    setResult(base);
    setSelectedTau(null);
    setNotice({ key: "started" });
    const response = await scanT2(
      settings.parameters,
      {
        ...settings,
        onPoint(point, completed, total) {
          collected.push(point);
          setResult(reanalyzeT2({ ...base, points: [...collected] }));
          setSelectedTau(point.tau);
          setNotice({ key: "progress", completed, total, tau: point.tau });
        },
      },
      demo ? t2DemoDevice() : null,
    );
    if (collected.length) setSelectedTau(bestT2(collected).tau);
    if (response.ok)
      setNotice({
        key: response.value.stopped ? "stopped" : "complete",
        count: collected.length,
      });
    else setNotice({ key: "scanFailed", error: response.error });
  }
  function submit(event) {
    event.preventDefault();
    if (valid(event.currentTarget)) start(false);
  }
  function applyAnalysis(
    referenceIndex,
    analysis = result.settings.analysis,
    key = "analysisApplied",
  ) {
    if (locked || !result.points.length) return;
    let range;
    try {
      range = prepareT2FitRange(fitFields);
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    // 解析条件が不正なら現在の記録・解析結果は変更しません。
    let updated;
    try {
      for (const point of result.points) evaluateT2(point.record, analysis);
      updated = reanalyzeT2(
        { ...result, settings: { ...result.settings, analysis } },
        referenceIndex,
        range,
      );
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    setResult(updated);
    setNotice(
      updated.analysisError
        ? { key: "error", error: updated.analysisError }
        : { key },
    );
  }
  function applyAnalysisFields(event) {
    event.preventDefault();
    if (!valid(event.currentTarget)) return;
    try {
      const analysis = {
        startMs: Number(fields.fftStartMs),
        endMs: Number(fields.fftEndMs),
        tailPoints: 100,
        window: fields.window,
        minHz: Number(fields.minKHz) * 1000,
        maxHz: Number(fields.maxKHz) * 1000,
      };
      if (
        [fields.fftStartMs, fields.fftEndMs, fields.minKHz, fields.maxKHz].some(
          (value) => !String(value).trim(),
        )
      )
        throw new Error("Empty analysis field");
      applyAnalysis(result.referenceIndex, analysis);
    } catch (error) {
      setNotice({ key: "error", error });
    }
  }
  function updateFit(event) {
    event.preventDefault();
    if (valid(event.currentTarget))
      applyAnalysis(
        result.referenceIndex,
        result.settings.analysis,
        "fitApplied",
      );
  }
  function saveFile(body, extension, type) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t2Filename(result, extension);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function savePng() {
    const svg = curve.current?.querySelector("svg");
    if (!svg) return;
    try {
      await saveGraphPng(svg, { filename: t2Filename(result, "png") });
    } catch (error) {
      setNotice({ key: "pngError", error });
    }
  }
  async function openFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || locked || fileLoading.current) return;
    fileLoading.current = true;
    setActivity("loading");
    setNotice({ key: "loading" });
    try {
      if (file.size > MAX_T2_JSON_BYTES) {
        const error = new Error(
          "Choose a scan JSON file no larger than 32 MiB.",
        );
        error.code = "ARCHIVE_TOO_LARGE";
        throw error;
      }
      const loaded = parseT2Measurement(await file.text());
      // 原記録・周波数・近似範囲の再解析が成功してから記録と入力欄を更新します。
      const restored = {
        ...loaded,
        decay: loaded.result,
        analysisError: null,
        fromFile: true,
      };
      // ゼロ信号の記録も表示し、周波数基準を得られない理由を残します。
      setResult(restored.decay ? restored : reanalyzeT2(restored));
      setFields(fieldsFromT2(loaded.settings));
      setFitFields({
        fromMs: String(loaded.fromMs),
        toMs: String(loaded.toMs),
      });
      setSelectedTau(bestT2(loaded.points).tau);
      setNotice({ key: "scanLoaded", count: loaded.points.length });
    } catch (error) {
      setNotice({ key: "loadFailed", error });
    } finally {
      fileLoading.current = false;
      setActivity(null);
    }
  }
  const message = stopping
    ? text.stopping
    : state.operation === "connect"
      ? text.connectingMessage
      : t2Text(text[notice.key] ?? text.error, notice) +
        (notice.error ? ` ${diagnostic(notice.error)}` : "");
  const warnings =
    decay?.warningDetails?.map((warning) => diagnostic(warning)) ?? [];
  const field = (name, label, min = 0, max = 32767, step = 1) => (
    <NumberField
      key={name}
      name={name}
      label={label}
      value={fields[name]}
      onChange={updateField}
      min={min}
      max={max}
      step={step}
    />
  );

  return (
    <div
      data-pagefind-ignore
      className="min-h-screen bg-base-200/50 text-sm leading-relaxed"
    >
      <MeasurementHeader />
      <main
        id="measurement-content"
        tabIndex={-1}
        className="mx-auto grid grid-cols-1 max-w-[1500px] items-start gap-6 p-4 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-8"
      >
        <aside className="grid min-w-0 grid-cols-1 gap-5">
          <ConnectionPanel />
          <form
            className="card card-border bg-base-100"
            onSubmit={submit}
            noValidate
          >
            <fieldset className="card-body gap-4" disabled={locked}>
              <legend className="sr-only">{text.sweep}</legend>
              <h2 className="card-title">{text.sweep}</h2>
              {field("startMs", text.startMs, 1)}
              {field("endMs", text.endMs, 1)}
              {field("stepMs", text.stepMs, 1)}
              <p className="text-xs">
                {plan
                  ? t2Text(text.plan, {
                      count: plan.delays.length,
                      last: plan.delays.at(-1),
                      scans: plan.parameters.scans,
                    })
                  : diagnostic(planError)}
              </p>
              <p role="status" className="text-xs">
                {plan
                  ? `${text.time}${t2Seconds(plan)}${text.seconds} · ${t2Text(text.perPoint, t2PointSeconds(plan))}`
                  : text.invalidTime}
              </p>
              {field("frequencyHz", text.fixedFrequency, 1, 2147483647)}
              {field("p90Cycles", text.p90, 1)}
              {field("p180Cycles", text.p180, 1)}
              {field("measurementIntervalMs", text.repetition, 1)}
              {field("scans", text.scans, 1)}
              <h3 className="font-semibold">{text.commonAnalysis}</h3>
              {field("fftStartMs", text.echoStart, -40.96, 0, 0.02)}
              {field("fftEndMs", text.echoEnd, 0, 40.96, 0.02)}
              <label className="fieldset gap-2">
                <span>{text.window}</span>
                <select
                  className="select w-full"
                  value={fields.window}
                  onChange={(event) =>
                    updateField("window", event.target.value)
                  }
                >
                  <option value="hann">Hann</option>
                  <option value="rect">{text.rect}</option>
                </select>
              </label>
              {field("minKHz", text.minKHz, -25, 25, 0.1)}
              {field("maxKHz", text.maxKHz, -25, 25, 0.1)}
              <button
                className="btn btn-primary w-full"
                disabled={locked || !state.canMeasure}
              >
                {text.startScan}
              </button>
            </fieldset>
            <div className="px-6 pb-6">
              <button
                className="btn w-full"
                type="button"
                disabled={!running || stopping}
                onClick={stopScan}
              >
                {text.stop}
              </button>
              <p className="mt-3 text-xs text-base-content/70">
                {text.scanHint}
              </p>
            </div>
          </form>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-3">
              <h2 className="card-title">{text.tryDemo}</h2>
              <button
                className="btn"
                disabled={locked}
                onClick={() => start(true)}
              >
                {text.demoScan}
              </button>
              <p>{text.demoHint}</p>
            </div>
          </section>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-3">
              <h2 className="card-title">{text.openTitle}</h2>
              <button
                className="btn"
                disabled={locked}
                onClick={() => fileInput.current.click()}
              >
                {text.openScan}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={openFile}
              />
              <p>{text.openScanHint}</p>
            </div>
          </section>
        </aside>
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{text.t2Page}</h1>
            <span className="badge badge-outline">
              {result.source
                ? `${result.fromFile ? `${text.file} · ` : ""}${result.source === "demo" ? text.demoScanSource : text.scanSource}`
                : text.notMeasured}
            </span>
          </div>
          <p
            role={notice.error ? "alert" : "status"}
            className={`rounded-box border p-4 ${notice.error ? "border-error/40 text-error" : "border-base-300 bg-base-100"}`}
          >
            {message}
          </p>
          <section className="card card-border bg-base-100">
            <div className="card-body min-w-0 gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="card-title">{text.curve}</h2>
                <button
                  className="btn btn-sm"
                  disabled={!result.points.length}
                  onClick={savePng}
                  aria-label={`${text.curve} PNG`}
                >
                  PNG
                </button>
              </div>
              <T2Curve
                result={result}
                locale={locale}
                empty={text.responseEmpty}
                plotRef={curve}
              />
              <p className="text-xs">{text.curveLegend}</p>
              <p className="font-semibold">
                {fit
                  ? t2Text(text.fitValue, {
                      T: fit.T.toFixed(2),
                      r2: fit.r2.toFixed(4),
                    })
                  : text.noFit}
              </p>
              {fit && (
                <p className="text-xs">
                  {t2Text(text.fitDetails, {
                    A: fit.A.toPrecision(5),
                    rmse: fit.rmse.toPrecision(4),
                    count: fit.n,
                    from: fit.from,
                    to: fit.to,
                  })}
                </p>
              )}
              {warnings.length > 0 && (
                <p className="text-xs text-base-content/70">
                  {warnings.join(" ")}
                </p>
              )}
              <form onSubmit={updateFit} noValidate>
                <fieldset className="fieldset gap-4" disabled={locked}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label={text.fitFrom}
                      name="fromMs"
                      value={fitFields.fromMs}
                      onChange={updateFitField}
                      min={1}
                      max={32767}
                      step="any"
                    />
                    <NumberField
                      label={text.fitTo}
                      name="toMs"
                      value={fitFields.toMs}
                      onChange={updateFitField}
                      min={1}
                      max={32767}
                      step="any"
                    />
                  </div>
                  <button
                    className="btn justify-self-start"
                    disabled={!result.points.length}
                  >
                    {text.updateFit}
                  </button>
                </fieldset>
              </form>
            </div>
          </section>
          <section className="card card-border bg-base-100">
            <div className="card-body min-w-0 gap-4">
              <h2 className="card-title">{text.reference}</h2>
              <p>
                {reference
                  ? t2Text(text.referenceSummary, {
                      kind:
                        result.referenceIndex === null
                          ? text.auto
                          : text.manual,
                      hz: reference.hz.toFixed(1),
                    })
                  : result.analysisError
                    ? diagnostic(result.analysisError)
                    : text.noReference}
              </p>
              <form onSubmit={applyAnalysisFields} noValidate>
                <fieldset className="fieldset gap-4" disabled={locked}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!result.points.length}
                      onClick={() => applyAnalysis(null)}
                    >
                      {text.autoReference}
                    </button>
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!selected}
                      onClick={() =>
                        applyAnalysis(result.points.indexOf(selected))
                      }
                    >
                      {text.selectedReference}
                    </button>
                  </div>
                  <button
                    className="btn justify-self-start"
                    disabled={!result.points.length}
                  >
                    {text.reanalyzeAll}
                  </button>
                </fieldset>
              </form>
              <p className="text-xs text-base-content/70">
                {text.referenceHint}
              </p>
            </div>
          </section>
          <section className="card card-border bg-base-100">
            <div className="card-body min-w-0 gap-4">
              <h2 className="card-title">{text.measuredPoints}</h2>
              <p>{text.pointHint}</p>
              <div className="min-w-0 max-h-96 overflow-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{text.tau}</th>
                      <th>{text.signal}</th>
                      <th>{text.twoTau}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.points.map((point, index) => (
                      <tr
                        key={point.tau}
                        className={
                          selectedTau === point.tau ? "bg-base-200" : ""
                        }
                      >
                        <td>
                          <button
                            className="btn btn-sm"
                            aria-pressed={selectedTau === point.tau}
                            onClick={() => setSelectedTau(point.tau)}
                          >
                            {point.tau}
                          </button>
                        </td>
                        <td>
                          {(
                            decay?.points[index]?.signal ?? point.amplitude
                          ).toPrecision(5)}
                        </td>
                        <td>{2 * point.tau}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <h2 className="text-lg font-semibold">
            {selected
              ? t2Text(text.selected, { tau: selected.tau })
              : text.selectedEmpty}
          </h2>
          <MeasurementGraphs
            prepared={prepared}
            locale={locale}
            onError={setNotice}
          />
          <p className="text-xs text-base-content/70">{text.bandHint}</p>
          <button
            className="btn justify-self-start"
            disabled={!selected}
            onClick={() => saveMeasurement(selected.record)}
          >
            {text.selectedJson}
          </button>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-4">
              <h2 className="card-title">{text.saveScan}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn"
                  disabled={!result.points.length}
                  onClick={() =>
                    saveFile(t2Archive(result), "json", "application/json")
                  }
                >
                  {text.allJson}
                </button>
                <button
                  className="btn"
                  disabled={!result.points.length}
                  onClick={() =>
                    saveFile(t2Csv(result), "csv", "text/csv;charset=utf-8")
                  }
                >
                  {text.scanCsv}
                </button>
              </div>
              <p className="text-xs text-base-content/70">{text.archiveHint}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
