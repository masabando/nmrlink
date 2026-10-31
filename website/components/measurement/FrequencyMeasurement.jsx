"use client";

import ConnectionPanel from "./ConnectionPanel";

import { useMemo, useRef } from "react";
import {
  analyzeMeasurement,
  parseFrequencySweep,
  MAX_FREQUENCY_JSON_BYTES,
} from "../../../packages/nmrlink/src/index.js";
import {
  saveMeasurement,
  saveGraphPng,
} from "../../../packages/nmrlink/src/browser.js";
import { diagnosticMessage } from "../../../examples/shared/diagnostics.js";
import MeasurementHeader from "./MeasurementHeader";
import MeasurementGraphs from "./MeasurementGraphs";
import NumberField from "./NumberField";
import FrequencyCurve from "./FrequencyCurve";
import { useInstrument, useSessionField } from "./InstrumentProvider";
import { messages } from "./messages";
import { frequencyMessages, interpolate } from "./frequency-messages";
import {
  initialFrequencyFields,
  emptyFrequencyResult,
  prepareFrequency,
  frequencySeconds,
  frequencyPointSeconds,
  bestFrequency,
  fieldsFromFrequency,
  frequencyDemoDevice,
  frequencyArchive,
  frequencyCsv,
  frequencyFilename,
} from "./frequency-model";

export default function FrequencyMeasurement() {
  const {
    locale,
    state,
    activity,
    setActivity,
    scanFrequency,
    stopScan,
    stopping,
    notice,
    setNotice,
  } = useInstrument();
  const text = { ...messages[locale], ...frequencyMessages[locale] };
  const [fields, setFields] = useSessionField(
    "frequency",
    "fields",
    initialFrequencyFields,
  );
  const [result, setResult] = useSessionField(
    "frequency",
    "result",
    emptyFrequencyResult,
  );
  const [selectedHz, setSelectedHz] = useSessionField(
    "frequency",
    "selectedHz",
    null,
  );
  const [chosen, setChosen] = useSessionField("frequency", "chosen", "");
  const fileInput = useRef(null),
    curve = useRef(null),
    fileLoading = useRef(false);
  const running = activity === "frequency",
    locked = state.busy || Boolean(activity);
  const best = bestFrequency(result.points);
  const selected = result.points.find(
    (point) => point.frequencyHz === selectedHz,
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
  let plan = null,
    planError = null;
  try {
    plan = prepareFrequency(fields);
  } catch (error) {
    planError = error;
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
      settings = prepareFrequency(fields);
    } catch (error) {
      setNotice({ key: "error", error });
      return;
    }
    const source = demo ? "demo" : "instrument",
      collected = [];
    setResult({
      settings,
      points: [],
      source,
      acquiredAt: new Date().toISOString(),
      fromFile: false,
    });
    setSelectedHz(null);
    setChosen("");
    setNotice({ key: "started" });
    const response = await scanFrequency(
      settings.parameters,
      {
        ...settings,
        onPoint(point, completed, total) {
          collected.push(point);
          setResult((current) => ({ ...current, points: [...collected] }));
          setSelectedHz(point.frequencyHz);
          setNotice({
            key: "progress",
            completed,
            total,
            frequency: point.frequencyHz,
          });
        },
      },
      demo ? frequencyDemoDevice(settings) : null,
    );
    if (collected.length) setSelectedHz(bestFrequency(collected).frequencyHz);
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
  function saveFile(body, extension, type) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = frequencyFilename(result, extension);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function savePng() {
    const svg = curve.current?.querySelector("svg");
    if (!svg) return;
    try {
      await saveGraphPng(svg, { filename: frequencyFilename(result, "png") });
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
      if (file.size > MAX_FREQUENCY_JSON_BYTES) {
        const error = new Error(
          "Choose a scan JSON file no larger than 32 MiB.",
        );
        error.code = "ARCHIVE_TOO_LARGE";
        throw error;
      }
      const loaded = parseFrequencySweep(await file.text());
      // 原記録の再解析まで成功してから、記録と走査条件をまとめて置き換えます。
      setResult({ ...loaded, fromFile: true });
      setFields(fieldsFromFrequency(loaded.settings));
      setSelectedHz(bestFrequency(loaded.points).frequencyHz);
      setChosen("");
      setNotice({ key: "scanLoaded", count: loaded.points.length });
    } catch (error) {
      setNotice({ key: "loadFailed", error });
    } finally {
      fileLoading.current = false;
      setActivity(null);
    }
  }
  function diagnostic(error) {
    return (
      diagnosticMessage(error, locale) ??
      (locale === "en"
        ? "Check the scan settings or file."
        : "走査条件やファイルを確認してください。")
    );
  }
  const message = stopping
    ? text.stopping
    : state.operation === "connect"
      ? text.connectingMessage
      : interpolate(text[notice.key] ?? text.error, notice) +
        (notice.error ? ` ${diagnostic(notice.error)}` : "");
  const atEdge =
    best &&
    (best.frequencyHz === result.settings.frequencies[0] ||
      best.frequencyHz === result.settings.frequencies.at(-1));
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
              {field("startHz", text.startHz, 1, 2147483647)}
              {field("endHz", text.endHz, 1, 2147483647)}
              {field("stepHz", text.stepHz, 1, 2147483647)}
              <p className="text-xs">
                {plan
                  ? interpolate(text.plan, {
                      count: plan.frequencies.length,
                      last: plan.frequencies.at(-1),
                      scans: plan.parameters.scans,
                    })
                  : diagnostic(planError)}
              </p>
              <p role="status" className="text-xs">
                {plan
                  ? `${text.time}${frequencySeconds(plan)}${text.seconds} · ${interpolate(text.perPoint, { seconds: frequencyPointSeconds(plan) })}`
                  : text.invalidTime}
              </p>
              {field("pulse1Cycles", text.pulse1)}
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
            <h1 className="text-2xl font-bold sm:text-3xl">
              {text.frequencyTitle}
            </h1>
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
                <h2 className="card-title">{text.response}</h2>
                <button
                  className="btn btn-sm"
                  disabled={!result.points.length}
                  onClick={savePng}
                >
                  PNG
                </button>
              </div>
              <FrequencyCurve
                points={result.points}
                locale={locale}
                empty={text.responseEmpty}
                plotRef={curve}
              />
              <p>
                {text.best}
                {best
                  ? `${best.frequencyHz} Hz · ${best.amplitude.toPrecision(5)} a.u.`
                  : text.notMeasured}
              </p>
              {best && (
                <p className="text-xs">
                  {best.amplitude <= 0
                    ? text.zero
                    : atEdge
                      ? text.edge
                      : text.bestHint}
                </p>
              )}
              <button
                className="btn self-start whitespace-normal"
                disabled={!best || best.amplitude <= 0}
                onClick={() => setChosen(String(best.frequencyHz))}
              >
                {text.adopt}
              </button>
              <label className="fieldset gap-2">
                <span>{text.chosen}</span>
                <input
                  className="input w-full"
                  type="number"
                  readOnly
                  value={chosen}
                />
              </label>
              <p className="text-xs text-base-content/70">
                {text.candidateHint}
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
                      <th>{text.setHz}</th>
                      <th>{text.amplitude}</th>
                      <th>{text.peakHz}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.points.map((point) => (
                      <tr
                        key={point.frequencyHz}
                        className={
                          selectedHz === point.frequencyHz ? "bg-base-200" : ""
                        }
                      >
                        <td>
                          <button
                            className="btn btn-sm"
                            aria-pressed={selectedHz === point.frequencyHz}
                            onClick={() => setSelectedHz(point.frequencyHz)}
                          >
                            {point.frequencyHz}
                          </button>
                        </td>
                        <td>{point.amplitude.toPrecision(5)}</td>
                        <td>{point.peakHz.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <h2 className="text-lg font-semibold">
            {selected
              ? interpolate(text.selected, { frequency: selected.frequencyHz })
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
                    saveFile(
                      frequencyArchive(result),
                      "json",
                      "application/json",
                    )
                  }
                >
                  {text.allJson}
                </button>
                <button
                  className="btn"
                  disabled={!result.points.length}
                  onClick={() =>
                    saveFile(
                      frequencyCsv(result),
                      "csv",
                      "text/csv;charset=utf-8",
                    )
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
