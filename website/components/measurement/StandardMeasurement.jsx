"use client";

import ConnectionPanel from "./ConnectionPanel";

import { useEffect, useRef, useState } from "react";
import {
  saveMeasurement,
  readMeasurement,
} from "../../../packages/nmrlink/src/browser.js";
import { diagnosticMessage } from "../../../examples/shared/diagnostics.js";
import NumberField from "./NumberField";
import MeasurementHeader from "./MeasurementHeader";
import MeasurementGraphs from "./MeasurementGraphs";
import { useInstrument, useSessionField } from "./InstrumentProvider";
import { messages } from "./messages";
import {
  initialParameters,
  initialAnalysis,
  numericParameters,
  estimatedSeconds,
  prepare,
  createDemoRecord,
  fidCsv,
  fftCsv,
  download,
} from "./model";

export default function StandardMeasurement() {
  const {
    locale,
    state,
    record,
    setRecord,
    notice,
    setNotice,
    run,
    activity,
    setActivity,
  } = useInstrument();
  const text = messages[locale];
  const [parameters, setParameters] = useSessionField(
    "standard",
    "parameters",
    initialParameters,
  );
  const [mode, setMode] = useSessionField("standard", "mode", "single");
  const [settings, setSettings] = useSessionField(
    "standard",
    "settings",
    initialAnalysis,
  );
  const [prepared, setPrepared] = useSessionField("standard", "prepared", null);
  const [analyzedRecord, setAnalyzedRecord] = useSessionField(
    "standard",
    "analyzedRecord",
    null,
  );
  const [loading, setLoading] = useState(false);
  const fileInput = useRef(null),
    settingsRef = useRef(settings),
    loadingRef = useRef(false),
    alive = useRef(true);
  const locked = state.busy || loading || Boolean(activity);
  const value = record?.value;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!record || record === analyzedRecord) return;
    // 測定結果の到着時だけ解析。フォームの編集中は再解析ボタンで確定します。
    try {
      setPrepared(prepare(record.value, settingsRef.current));
    } catch (error) {
      setPrepared(null);
      setNotice({ key: "newRecordAnalysisError", error });
    }
    setAnalyzedRecord(record);
  }, [record, analyzedRecord, setPrepared, setAnalyzedRecord, setNotice]);

  function updateParameter(name, val) {
    setParameters((current) => ({ ...current, [name]: val }));
  }
  function updateSetting(name, val) {
    setSettings((current) => {
      const next = { ...current, [name]: val };
      settingsRef.current = next;
      return next;
    });
  }
  function valid(form) {
    if (form.checkValidity()) return true;
    form.querySelector(":invalid")?.focus();
    setNotice({ key: "required" });
    return false;
  }
  function measure(event) {
    event.preventDefault();
    if (locked || !state.canMeasure || !valid(event.currentTarget)) return;
    run("measure", numericParameters(parameters), { mode });
  }
  function reanalyze(event) {
    event.preventDefault();
    if (!value || !valid(event.currentTarget)) return;
    try {
      setPrepared(prepare(value, settings));
      setNotice({ key: "analysisHint" });
    } catch (error) {
      setNotice({ key: "analysisError", error });
    }
  }
  async function openFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || locked || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setActivity("loading");
    setNotice({ key: "loading" });
    try {
      const loaded = await readMeasurement(file);
      if (!alive.current) return;
      setRecord({ value: loaded, fromFile: true });
      setNotice({ key: "loaded", filename: file.name });
    } catch (error) {
      if (alive.current) setNotice({ key: "loadFailed", error });
    } finally {
      loadingRef.current = false;
      setActivity(null);
      if (alive.current) setLoading(false);
    }
  }
  function save(kind) {
    if (!value) return;
    try {
      if (kind === "json") saveMeasurement(value);
      else if (prepared)
        download(
          kind === "fid"
            ? fidCsv(prepared.record, prepared.analysis)
            : fftCsv(prepared.record, prepared.analysis),
          prepared.record,
          `${kind}.csv`,
        );
    } catch (error) {
      setNotice({ key: "error", error });
    }
  }

  let estimate;
  try {
    estimate = `${text.time}${estimatedSeconds(parameters, mode)}${text.seconds}`;
  } catch {
    estimate = text.invalidTime;
  }
  let detail = "";
  if (notice.error)
    detail =
      notice.error.code === "UI_DISPLAY_RANGE"
        ? text.displayError
        : (diagnosticMessage(notice.error, locale) ??
          (locale === "en"
            ? "Check the input or file and try again."
            : "入力内容やファイルを確認してください。"));
  const operationMessage =
    state.operation === "measure"
      ? text.measuringMessage
      : state.operation === "connect"
        ? text.connectingMessage
        : null;
  const p = value?.parameters;
  const spectrum = prepared?.analysis.spectrum;
  const diagnostic =
    Boolean(notice.error) ||
    ["required", "navigateBlocked"].includes(notice.key);

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
            onSubmit={measure}
            noValidate
          >
            <fieldset className="card-body gap-4" disabled={locked}>
              <legend className="sr-only">{text.parameters}</legend>
              <h2 className="card-title">{text.parameters}</h2>
              <NumberField
                label={text.frequency}
                name="frequencyHz"
                value={parameters.frequencyHz}
                onChange={updateParameter}
                min={1}
                max={2147483647}
              />
              {[1, 2].map((index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_100px] items-end gap-3"
                >
                  <NumberField
                    label={text[`pulse${index}`]}
                    name={`pulse${index}Cycles`}
                    value={parameters[`pulse${index}Cycles`]}
                    onChange={updateParameter}
                  />
                  <label className="fieldset gap-2">
                    <span>{text[`phase${index}`]}</span>
                    <select
                      className="select w-full"
                      value={parameters[`phase${index}Degrees`]}
                      onChange={(event) =>
                        updateParameter(
                          `phase${index}Degrees`,
                          event.target.value,
                        )
                      }
                    >
                      {[0, 90, 180, 270].map((phase) => (
                        <option key={phase} value={phase}>
                          {phase}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
              <p className="text-xs text-base-content/70">{text.pulseHint}</p>
              <NumberField
                label={text.interval}
                name="pulseIntervalMs"
                value={parameters.pulseIntervalMs}
                onChange={updateParameter}
              />
              <NumberField
                label={text.repetition}
                name="measurementIntervalMs"
                value={parameters.measurementIntervalMs}
                onChange={updateParameter}
                min={1}
              />
              <NumberField
                label={text.scans}
                name="scans"
                value={parameters.scans}
                onChange={updateParameter}
                min={1}
              />
              <label className="fieldset gap-2">
                <span>{text.mode}</span>
                <select
                  className="select w-full"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                </select>
              </label>
              <p role="status" className="text-xs">
                {estimate}
              </p>
              <button
                className="btn btn-primary w-full"
                disabled={!state.canMeasure || locked}
              >
                {text.measure}
              </button>
              <p className="text-xs text-base-content/70">{text.noStop}</p>
            </fieldset>
          </form>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-3">
              <h2 className="card-title">{text.tryDemo}</h2>
              <p>{text.demoHint}</p>
              <button
                className="btn"
                disabled={locked}
                onClick={() => {
                  setRecord({ value: createDemoRecord(), fromFile: false });
                  setNotice({ key: "demoDone" });
                }}
              >
                {text.demo}
              </button>
            </div>
          </section>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-3">
              <h2 className="card-title">{text.openTitle}</h2>
              <p>{text.openHint}</p>
              <button
                className="btn"
                disabled={locked}
                onClick={() => fileInput.current.click()}
              >
                {text.open}
              </button>
              <input
                ref={fileInput}
                type="file"
                hidden
                accept=".json,application/json"
                aria-label={text.open}
                onChange={openFile}
              />
            </div>
          </section>
        </aside>
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-base-content/60">{text.results}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{text.heading}</h1>
            </div>
            <span className="badge badge-outline">
              {value
                ? `${record.fromFile ? `${text.file} · ` : ""}${value.source === "demo" ? text.demoSource : text.instrumentSource}`
                : text.notMeasured}
            </span>
          </div>
          <p
            role={diagnostic ? "alert" : "status"}
            className={`rounded-box border p-4 ${diagnostic ? "border-error/40 text-error" : "border-base-300 bg-base-100"}`}
          >
            {operationMessage ??
              `${text[notice.key] ?? text.error}${notice.filename ?? ""}${detail ? ` ${detail}` : ""}`}
          </p>
          <div className="space-y-2 text-xs text-base-content/70">
            <p>
              {value &&
                `${new Date(value.acquiredAt).toLocaleString(locale === "en" ? "en-US" : "ja-JP")} · ${value.mode === "double" ? "Double" : "Single"} · ${value.points} ${text.points} · ${value.sampleIntervalMs} ${text.sampling}`}
            </p>
            {value && (
              <p>
                {p
                  ? `${text.acquired}: ${p.frequencyHz} Hz · ${text.pulse1} ${p.pulse1Cycles} / ${p.phase1Degrees}° · ${text.pulse2} ${p.pulse2Cycles} / ${p.phase2Degrees}° · ${text.interval} ${p.pulseIntervalMs} · ${text.repetition} ${p.measurementIntervalMs} · ${text.scans} ${p.scans}`
                  : text.noParameters}
              </p>
            )}
            <p>{text.keep}</p>
          </div>
          <MeasurementGraphs
            prepared={prepared}
            locale={locale}
            onError={setNotice}
          >
            <section className="card card-border bg-base-100">
              <div className="card-body gap-4">
                <form onSubmit={reanalyze} noValidate>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="card-title">{text.analysis}</h2>
                    <button className="btn btn-sm" disabled={!value}>
                      {text.reanalyze}
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <NumberField
                      label={text.start}
                      name="startMs"
                      value={settings.startMs}
                      onChange={updateSetting}
                      max={40.96}
                      step={0.02}
                    />
                    <NumberField
                      label={text.end}
                      name="endMs"
                      value={settings.endMs}
                      onChange={updateSetting}
                      max={40.96}
                      step={0.02}
                    />
                    <label className="fieldset gap-2">
                      <span>{text.window}</span>
                      <select
                        className="select w-full"
                        value={settings.window}
                        onChange={(event) =>
                          updateSetting("window", event.target.value)
                        }
                      >
                        <option value="hann">Hann</option>
                        <option value="rect">{text.rect}</option>
                      </select>
                    </label>
                    <NumberField
                      label={text.tail}
                      name="tailPoints"
                      value={settings.tailPoints}
                      onChange={updateSetting}
                      min={1}
                      max={2048}
                    />
                    <NumberField
                      label={text.displayEnd}
                      name="displayEndMs"
                      value={settings.displayEndMs}
                      onChange={updateSetting}
                      min={0.02}
                      max={40.96}
                      step={0.02}
                    />
                    <NumberField
                      label={text.frequencyLimit}
                      name="frequencyLimitKHz"
                      value={settings.frequencyLimitKHz}
                      onChange={updateSetting}
                      min={0.1}
                      max={25}
                      step={0.1}
                    />
                  </div>
                </form>
                <p className="text-xs text-base-content/70">
                  {spectrum
                    ? `${spectrum.count} ${text.count} · FFT ${spectrum.size} · ${text.resolution} ${spectrum.resolutionHz.toFixed(1)} Hz · ${text.spacing} ${spectrum.spacingHz.toFixed(1)} Hz`
                    : text.analysisHint}
                </p>
              </div>
            </section>
          </MeasurementGraphs>
          <section className="card card-border bg-base-100">
            <div className="card-body gap-4">
              <h2 className="card-title">{text.save}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn"
                  disabled={!value}
                  onClick={() => save("json")}
                >
                  {text.raw}
                </button>
                <button
                  className="btn"
                  disabled={!prepared}
                  onClick={() => save("fid")}
                >
                  FID CSV
                </button>
                <button
                  className="btn"
                  disabled={!prepared}
                  onClick={() => save("fft")}
                >
                  FFT CSV
                </button>
              </div>
              <p className="text-xs text-base-content/70">{text.saveHint}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
