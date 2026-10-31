"use client";

import { useMemo, useRef } from "react";
import {
  analyzeMeasurement,
  parsePulseCalibration,
  MAX_PULSE_JSON_BYTES,
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
import PulseCurve from "./PulseCurve";
import { useInstrument, useSessionField } from "./InstrumentProvider";
import { messages } from "./messages";
import { pulseMessages, pulseText } from "./pulse-messages";
import {
  initialPulseFields,
  emptyPulseResult,
  preparePulse,
  pulseSeconds,
  pulsePointSeconds,
  bestPulse,
  fieldsFromPulse,
  recalibratePulse,
  pulseDemoDevice,
  pulseArchive,
  pulseCsv,
  pulseFilename,
} from "./pulse-model";

const emptyCandidates = { p90: "", p180: "" };

export default function PulseCalibration() {
  const {
    locale,
    state,
    activity,
    setActivity,
    scanPulse,
    stopScan,
    stopping,
    notice,
    setNotice,
  } = useInstrument();
  const text = { ...messages[locale], ...pulseMessages[locale] };
  const [fields, setFields] = useSessionField(
    "pulse",
    "fields",
    initialPulseFields,
  );
  const [result, setResult] = useSessionField(
    "pulse",
    "result",
    emptyPulseResult,
  );
  const [selectedLength, setSelectedLength] = useSessionField(
    "pulse",
    "selectedLength",
    null,
  );
  const [mode, setMode] = useSessionField("pulse", "mode", "magnitude");
  const [phaseInput, setPhaseInput] = useSessionField(
    "pulse",
    "phaseInput",
    "0",
  );
  const [chosen, setChosen] = useSessionField(
    "pulse",
    "chosen",
    emptyCandidates,
  );
  const fileInput = useRef(null),
    curve = useRef(null),
    fileLoading = useRef(false);
  const running = activity === "pulse",
    locked = state.busy || Boolean(activity);
  const selected = result.points.find(
    (point) => point.length === selectedLength,
  );
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
  const calibration = result.calibration,
    measured = calibration?.measured;
  const fit =
    mode === "magnitude" ? calibration?.magnitudeFit : calibration?.fit;
  let plan = null,
    planError = null;
  try {
    plan = preparePulse(fields);
  } catch (error) {
    planError = error;
  }

  function diagnostic(error) {
    if (error?.code === "NO_REFERENCE_SIGNAL") return text.noReferenceSignal;
    return (
      diagnosticMessage(error, locale) ??
      (locale === "en"
        ? "Check the scan settings, phase reference or file."
        : "走査条件・位相基準・ファイルを確認してください。")
    );
  }
  function updateField(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
  }
  function valid(form) {
    if (form.checkValidity()) return true;
    form.querySelector(":invalid")?.focus();
    setNotice({ key: "required" });
    return false;
  }
  async function start(demo) {
    if (locked || (!demo && !state.canMeasure)) return;
    let settings;
    try {
      settings = preparePulse(fields);
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
      ...emptyPulseResult,
      settings,
      source: demo ? "demo" : "instrument",
      acquiredAt: new Date().toISOString(),
      phaseDegrees,
    };
    const collected = [];
    setResult(base);
    setSelectedLength(null);
    setChosen(emptyCandidates);
    setNotice({ key: "started" });
    const response = await scanPulse(
      settings.parameters,
      {
        ...settings,
        onPoint(point, completed, total) {
          collected.push(point);
          setResult(recalibratePulse({ ...base, points: [...collected] }));
          setSelectedLength(point.length);
          setNotice({
            key: "progress",
            completed,
            total,
            length: point.length,
          });
        },
      },
      demo ? pulseDemoDevice() : null,
    );
    if (collected.length) setSelectedLength(bestPulse(collected).length);
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
  function applyReference(referenceIndex, phaseDegrees) {
    if (locked || !result.points.length) return;
    const updated = recalibratePulse(result, referenceIndex, phaseDegrees);
    setResult(updated);
    setChosen(emptyCandidates);
    setNotice(
      updated.calibrationError
        ? { key: "error", error: updated.calibrationError }
        : { key: "phaseApplied" },
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
    applyReference(result.referenceIndex, phaseDegrees);
  }
  function saveFile(body, extension, type) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = pulseFilename(result, extension);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function savePng() {
    const svg = curve.current?.querySelector("svg");
    if (!svg) return;
    try {
      await saveGraphPng(svg, { filename: pulseFilename(result, "png") });
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
      if (file.size > MAX_PULSE_JSON_BYTES) {
        const error = new Error(
          "Choose a scan JSON file no larger than 32 MiB.",
        );
        error.code = "ARCHIVE_TOO_LARGE";
        throw error;
      }
      const loaded = parsePulseCalibration(await file.text());
      // 原記録と位相・近似の再解析が成功してから画面を更新します。
      const restored = { ...loaded, calibrationError: null, fromFile: true };
      setResult(restored.calibration ? restored : recalibratePulse(restored));
      setFields(fieldsFromPulse(loaded.settings));
      setPhaseInput(String(loaded.phaseDegrees));
      setMode("magnitude");
      setChosen(emptyCandidates);
      setSelectedLength(bestPulse(loaded.points).length);
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
      : pulseText(text[notice.key] ?? text.error, notice) +
        (notice.error ? ` ${diagnostic(notice.error)}` : "");
  const warnings =
    calibration?.warningDetails?.map((warning) => diagnostic(warning)) ?? [];
  const reference = calibration?.reference;
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
              {field("startCycles", text.startCycles, 1)}
              {field("endCycles", text.endCycles, 1)}
              {field("stepCycles", text.stepCycles, 1)}
              <p className="text-xs">
                {plan
                  ? pulseText(text.plan, {
                      count: plan.lengths.length,
                      last: plan.lengths.at(-1),
                      scans: plan.parameters.scans,
                    })
                  : diagnostic(planError)}
              </p>
              <p role="status" className="text-xs">
                {plan
                  ? `${text.time}${pulseSeconds(plan)}${text.seconds} · ${pulseText(text.perPoint, { seconds: pulsePointSeconds(plan) })}`
                  : text.invalidTime}
              </p>
              {field("frequencyHz", text.fixedFrequency, 1, 2147483647)}
              <label className="fieldset gap-2">
                <span>{text.phase1}</span>
                <select
                  className="select w-full"
                  value={fields.phase1Degrees}
                  onChange={(event) =>
                    updateField("phase1Degrees", event.target.value)
                  }
                >
                  {[0, 90, 180, 270].map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </label>
              {field("measurementIntervalMs", text.repetition, 1)}
              {field("scans", text.scans, 1)}
              <h3 className="font-semibold">{text.commonAnalysis}</h3>
              {field("startMs", text.start, 0, 40.96, 0.02)}
              {field("endMs", text.end, 0, 40.96, 0.02)}
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
            <h1 className="text-2xl font-bold sm:text-3xl">{text.pulsePage}</h1>
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
                  <option value="magnitude">{text.magnitude}</option>
                  <option value="signed">{text.signed}</option>
                </select>
              </label>
              <p className="text-xs text-base-content/70">
                {mode === "magnitude" ? text.magnitudeHint : text.signedHint}
              </p>
              <PulseCurve
                result={result}
                mode={mode}
                locale={locale}
                empty={text.responseEmpty}
                plotRef={curve}
              />
              <p className="text-xs">
                {mode === "magnitude"
                  ? text.magnitudeLegend
                  : text.signedLegend}
              </p>
              <p>
                {measured
                  ? pulseText(text.measured, {
                      p90: measured.p90,
                      p180: measured.p180.toFixed(2),
                    })
                  : text.noMeasured}
              </p>
              <p>
                {fit
                  ? pulseText(text.fit, {
                      p90: fit.p90.toFixed(2),
                      p180: fit.p180.toFixed(2),
                      r2: fit.r2.toFixed(4),
                    })
                  : text.noFit}
              </p>
              {warnings.length > 0 && (
                <p className="text-xs text-base-content/70">
                  {warnings.join(" ")}
                </p>
              )}
              <button
                className="btn self-start h-auto min-h-10 max-w-full py-2 whitespace-normal"
                disabled={locked || !fit}
                onClick={() =>
                  setChosen({
                    p90: String(Math.round(fit.p90)),
                    p180: String(Math.round(fit.p180)),
                  })
                }
              >
                {text.adopt}
              </button>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["p90", text.chosen90],
                  ["p180", text.chosen180],
                ].map(([key, label]) => (
                  <label key={key} className="fieldset min-w-0 gap-2">
                    <span>{label}</span>
                    <input
                      className="input w-full min-w-0"
                      type="number"
                      readOnly
                      value={chosen[key]}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-base-content/70">
                {text.candidateHint}
              </p>
            </div>
          </section>
          <section className="card card-border bg-base-100">
            <div className="card-body min-w-0 gap-4">
              <h2 className="card-title">{text.reference}</h2>
              <p>
                {reference
                  ? pulseText(text.referenceSummary, {
                      kind:
                        result.referenceIndex === null
                          ? text.auto
                          : text.manual,
                      hz: reference.hz.toFixed(1),
                      coherence: reference.coherence.toFixed(3),
                      phase: result.phaseDegrees,
                    })
                  : result.calibrationError
                    ? diagnostic(result.calibrationError)
                    : text.noReference}
              </p>
              <form onSubmit={applyPhase} noValidate>
                <fieldset className="fieldset gap-4" disabled={locked}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!result.points.length}
                      onClick={() => applyReference(null, result.phaseDegrees)}
                    >
                      {text.autoReference}
                    </button>
                    <button
                      className="btn h-auto min-h-10 max-w-full py-2 whitespace-normal"
                      type="button"
                      disabled={!selected}
                      onClick={() =>
                        applyReference(
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
                      <th>{text.cycles}</th>
                      <th>{text.signal}</th>
                      <th>{text.magnitude}</th>
                      <th>{text.quadrature}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.points.map((point, index) => (
                      <tr
                        key={point.length}
                        className={
                          selectedLength === point.length ? "bg-base-200" : ""
                        }
                      >
                        <td>
                          <button
                            className="btn btn-sm"
                            aria-pressed={selectedLength === point.length}
                            onClick={() => setSelectedLength(point.length)}
                          >
                            {point.length}
                          </button>
                        </td>
                        {["amplitude", "magnitude", "quadrature"].map((key) => (
                          <td key={key}>
                            {calibration?.points[index]?.[key]?.toPrecision(
                              5,
                            ) ?? "—"}
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
              ? pulseText(text.selected, { length: selected.length })
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
                    saveFile(pulseArchive(result), "json", "application/json")
                  }
                >
                  {text.allJson}
                </button>
                <button
                  className="btn"
                  disabled={!result.points.length}
                  onClick={() =>
                    saveFile(pulseCsv(result), "csv", "text/csv;charset=utf-8")
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
