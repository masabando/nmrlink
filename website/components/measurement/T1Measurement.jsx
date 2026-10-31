"use client";

import { useMemo, useRef } from "react";
import {
  analyzeMeasurement,
  parseT1Measurement,
  MAX_T1_JSON_BYTES,
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
import T1Curve from "./T1Curve";
import { useInstrument, useSessionField } from "./InstrumentProvider";
import { messages } from "./messages";
import { t1Messages, t1Text } from "./t1-messages";
import {
  initialT1Fields,
  initialT1Fit,
  emptyT1Result,
  prepareT1,
  prepareT1FitRange,
  t1Seconds,
  t1PointSeconds,
  bestT1,
  fieldsFromT1,
  reanalyzeT1,
  t1DemoDevice,
  t1Archive,
  t1Csv,
  t1Filename,
} from "./t1-model";

export default function T1Measurement() {
  const {
    locale,
    state,
    activity,
    setActivity,
    scanT1,
    stopScan,
    stopping,
    notice,
    setNotice,
  } = useInstrument();
  const text = { ...messages[locale], ...t1Messages[locale] };
  const [fields, setFields] = useSessionField("t1", "fields", initialT1Fields);
  const [result, setResult] = useSessionField("t1", "result", emptyT1Result);
  const [selectedTau, setSelectedTau] = useSessionField(
    "t1",
    "selectedTau",
    null,
  );
  const [mode, setMode] = useSessionField("t1", "mode", "signed");
  const [phaseInput, setPhaseInput] = useSessionField("t1", "phaseInput", "0");
  const [fitFields, setFitFields] = useSessionField(
    "t1",
    "fitFields",
    initialT1Fit,
  );
  const fileInput = useRef(null),
    curve = useRef(null),
    fileLoading = useRef(false);
  const running = activity === "t1",
    locked = state.busy || Boolean(activity);
  const selected = result.points.find((point) => point.tau === selectedTau);
  const prepared = useMemo(
    () =>
      selected
        ? {
            record: selected.record,
            analysis: analyzeMeasurement(
              selected.record,
              result.settings.analysis,
            ),
            displayEndMs: 10,
            frequencyLimitHz: 10000,
          }
        : null,
    [selected, result.settings],
  );
  const recovery = result.recovery,
    fit = recovery?.fit,
    reference = recovery?.reference;
  let plan = null,
    planError = null;
  try {
    plan = prepareT1(fields);
  } catch (error) {
    planError = error;
  }

  function diagnostic(error) {
    if (error?.code === "NO_REFERENCE_SIGNAL") return text.noReferenceSignal;
    if (error?.code === "UI_T1_FIT_RANGE") return text.fitRangeError;
    return (
      diagnosticMessage(error, locale) ??
      (locale === "en"
        ? "Check the scan settings, fit range, phase reference or file."
        : "走査条件・近似範囲・位相基準・ファイルを確認してください。")
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
      settings = prepareT1(fields);
      range = prepareT1FitRange(fitFields);
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    const phaseDegrees = Number(phaseInput);
    if (!phaseInput.trim() || !Number.isFinite(phaseDegrees)) {
      setNotice({ key: "invalidPhase" });
      return;
    }
    const base = {
      ...emptyT1Result,
      settings,
      source: demo ? "demo" : "instrument",
      acquiredAt: new Date().toISOString(),
      phaseDegrees,
      ...range,
    };
    const collected = [];
    setResult(base);
    setSelectedTau(null);
    setNotice({ key: "started" });
    const response = await scanT1(
      settings.parameters,
      {
        ...settings,
        onPoint(point, completed, total) {
          collected.push(point);
          setResult(reanalyzeT1({ ...base, points: [...collected] }));
          setSelectedTau(point.tau);
          setNotice({ key: "progress", completed, total, tau: point.tau });
        },
      },
      demo ? t1DemoDevice() : null,
    );
    if (collected.length) setSelectedTau(bestT1(collected).tau);
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
  function applyAnalysis(referenceIndex, phaseDegrees, key = "phaseApplied") {
    if (locked || !result.points.length) return;
    let range;
    try {
      range = prepareT1FitRange(fitFields);
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    const updated = reanalyzeT1(result, referenceIndex, phaseDegrees, range);
    setResult(updated);
    setNotice(
      updated.analysisError
        ? { key: "error", error: updated.analysisError }
        : { key },
    );
  }
  function applyPhase(event) {
    event.preventDefault();
    if (!valid(event.currentTarget)) return;
    const phaseDegrees = Number(phaseInput);
    if (!Number.isFinite(phaseDegrees)) {
      setNotice({ key: "invalidPhase" });
      return;
    }
    applyAnalysis(result.referenceIndex, phaseDegrees);
  }
  function updateFit(event) {
    event.preventDefault();
    if (valid(event.currentTarget))
      applyAnalysis(result.referenceIndex, result.phaseDegrees, "fitApplied");
  }
  function saveFile(body, extension, type) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t1Filename(result, extension);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function savePng() {
    const svg = curve.current?.querySelector("svg");
    if (!svg) return;
    try {
      await saveGraphPng(svg, { filename: t1Filename(result, "png") });
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
      if (file.size > MAX_T1_JSON_BYTES) {
        const error = new Error(
          "Choose a scan JSON file no larger than 32 MiB.",
        );
        error.code = "ARCHIVE_TOO_LARGE";
        throw error;
      }
      const loaded = parseT1Measurement(await file.text());
      // 原記録・位相・近似範囲の再解析が成功してから記録と入力欄を更新します。
      const restored = {
        ...loaded,
        recovery: loaded.result,
        analysisError: null,
        fromFile: true,
      };
      // ゼロ信号の記録も表示し、位相基準を得られない理由を残します。
      setResult(restored.recovery ? restored : reanalyzeT1(restored));
      setFields(fieldsFromT1(loaded.settings));
      setPhaseInput(String(loaded.phaseDegrees));
      setFitFields({
        fromMs: String(loaded.fromMs),
        toMs: String(loaded.toMs),
      });
      setMode("signed");
      setSelectedTau(bestT1(loaded.points).tau);
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
      : t1Text(text[notice.key] ?? text.error, notice) +
        (notice.error ? ` ${diagnostic(notice.error)}` : "");
  const warnings =
    recovery?.warningDetails?.map((warning) => diagnostic(warning)) ?? [];
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
                  ? t1Text(text.plan, {
                      count: plan.delays.length,
                      last: plan.delays.at(-1),
                      scans: plan.parameters.scans,
                    })
                  : diagnostic(planError)}
              </p>
              <p role="status" className="text-xs">
                {plan
                  ? `${text.time}${t1Seconds(plan)}${text.seconds} · ${t1Text(text.perPoint, t1PointSeconds(plan))}`
                  : text.invalidTime}
              </p>
              {field("frequencyHz", text.fixedFrequency, 1, 2147483647)}
              {field("p90Cycles", text.p90, 1)}
              {field("p180Cycles", text.p180, 1)}
              {field("measurementIntervalMs", text.repetition, 1)}
              {field("scans", text.scans, 1)}
              <h3 className="font-semibold">{text.commonAnalysis}</h3>
              {field("fftStartMs", text.start, 0, 40.96, 0.02)}
              {field("fftEndMs", text.end, 0, 40.96, 0.02)}
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
            <h1 className="text-2xl font-bold sm:text-3xl">{text.t1Page}</h1>
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
              <label className="fieldset gap-2">
                <span>{text.view}</span>
                <select
                  className="select w-full sm:w-56"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="signed">{text.signed}</option>
                  <option value="magnitude">{text.magnitude}</option>
                  <option value="quadrature">{text.quadrature}</option>
                </select>
              </label>
              <p className="text-xs text-base-content/70">{text.viewHint}</p>
              <T1Curve
                result={result}
                mode={mode}
                locale={locale}
                empty={text.responseEmpty}
                plotRef={curve}
              />
              <p className="text-xs">
                {mode === "magnitude"
                  ? text.magnitudeLegend
                  : mode === "quadrature"
                    ? text.quadratureLegend
                    : text.signedLegend}
              </p>
              <p className="font-semibold">
                {fit
                  ? t1Text(text.fitValue, {
                      T: fit.T.toFixed(2),
                      r2: fit.r2.toFixed(4),
                    })
                  : text.noFit}
              </p>
              {fit && (
                <p className="text-xs">
                  {t1Text(text.fitDetails, {
                    A: fit.A.toPrecision(5),
                    B: fit.B.toPrecision(5),
                    ratio: (fit.B / fit.A).toFixed(3),
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
                  ? t1Text(text.referenceSummary, {
                      kind:
                        result.referenceIndex === null
                          ? text.auto
                          : text.manual,
                      hz: reference.hz.toFixed(1),
                      coherence: reference.coherence.toFixed(3),
                      phase: result.phaseDegrees,
                    })
                  : result.analysisError
                    ? diagnostic(result.analysisError)
                    : text.noReference}
              </p>
              <form onSubmit={applyPhase} noValidate>
                <fieldset className="fieldset gap-4" disabled={locked}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!result.points.length}
                      onClick={() => applyAnalysis(null, result.phaseDegrees)}
                    >
                      {text.autoReference}
                    </button>
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!selected}
                      onClick={() =>
                        applyAnalysis(
                          result.points.indexOf(selected),
                          result.phaseDegrees,
                        )
                      }
                    >
                      {text.selectedReference}
                    </button>
                  </div>
                  <label className="fieldset gap-2">
                    <span>{text.phase}</span>
                    <input
                      className="input w-full"
                      name="phaseDegrees"
                      type="number"
                      step="any"
                      required
                      value={phaseInput}
                      onChange={(event) => setPhaseInput(event.target.value)}
                    />
                  </label>
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
                      <th>{text.magnitude}</th>
                      <th>{text.quadrature}</th>
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
                        {["signal", "magnitude", "quadrature"].map((key) => (
                          <td key={key}>
                            {recovery?.points[index]?.[key]?.toPrecision(5) ??
                              "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <h2 className="text-lg font-semibold">
            {selected
              ? t1Text(text.selected, { tau: selected.tau })
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
                    saveFile(t1Archive(result), "json", "application/json")
                  }
                >
                  {text.allJson}
                </button>
                <button
                  className="btn"
                  disabled={!result.points.length}
                  onClick={() =>
                    saveFile(t1Csv(result), "csv", "text/csv;charset=utf-8")
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
