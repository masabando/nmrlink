# nmrlink

English | [日本語](https://github.com/masabando/nmrlink/blob/main/packages/nmrlink/README.ja.md)

A JavaScript library for the educational NMR apparatus developed by [Yasushi Kondo (Kindai University)](https://researchmap.jp/kondo_yasushi). Add Web Serial connectivity, measurement control, signal analysis, and graphs to your own Web UI.

[Documentation](https://masabando.github.io/nmrlink/en/) · [API](https://masabando.github.io/nmrlink/en/reference/api/) · [Standard Web UI](https://masabando.github.io/nmrlink/ui/?lang=en) · [GitHub](https://github.com/masabando/nmrlink)

## Hardware

Real measurements require the supported educational NMR apparatus. NMRLink is specific to this apparatus; it is not a universal interface for NMR instruments. You can try analysis and graph generation with simulated data without hardware.

Distribution of the apparatus through an educational equipment supplier is planned.

## Install

```sh
npm install nmrlink
```

Use package imports with a browser bundler such as Vite. For static HTML without a build step, use an import map or relative URLs to the source modules; see the [installation guide](https://masabando.github.io/nmrlink/en/guide/install/).

## Requirements

- Direct hardware access requires a desktop browser with Web Serial support, HTTPS or localhost on the same PC, and a USB serial connection. See [browser support and connection troubleshooting](https://masabando.github.io/nmrlink/en/guide/browsers/).
- The package provides ES modules, with no runtime dependencies. CommonJS builds and TypeScript declarations are not included.
- Analysis and SVG generation also work in Node.js without a DOM.
- The package includes readable, unminified `src/` files, English and Japanese READMEs, and the MIT license.

## Measure from your own Web UI

This example runs in a browser with a bundler. Add buttons, a status field, and two graph containers to your HTML:

```html
<button id="connect">Connect</button>
<button id="measure" disabled>Measure</button>
<button id="disconnect" disabled>Disconnect</button>
<button id="save" disabled>Save raw JSON</button>
<p id="status" role="status">Disconnected</p>
<div id="fid"></div>
<div id="fft"></div>
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";

const get = id => document.getElementById(id);
const controller = new NMRController();
const graphs = new NMRGraphs({ fid: get("fid"), fft: get("fft"), locale: "en" });

// Check these settings for your apparatus and sample. Use calibrated values.
const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90,
  pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
};

controller.onStateChange(state => {
  get("connect").disabled = !state.canConnect;
  get("measure").disabled = !state.canMeasure;
  get("disconnect").disabled = !state.canDisconnect;
});
controller.onError(error => { get("status").textContent = error.message; });
controller.onResult(record => {
  get("save").disabled = false;
  try {
    graphs.show(record, analyzeMeasurement(record));
    get("status").textContent = "Measurement complete.";
  } catch (error) {
    graphs.clear();
    get("status").textContent = `Analysis failed: ${error.message}`;
  }
});

// Request a port directly from a user click.
get("connect").onclick = () => controller.connect();
get("measure").onclick = () => controller.measure(parameters, { mode: "single" });
get("disconnect").onclick = () => controller.disconnect();
get("save").onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};
```

Connection and measurement errors are reported through `onError`; controller operations return `{ ok, value, error }`. The lower-level `NMRDevice` rejects on errors. Measurements are not automatically retried, and an active measurement cannot be stopped immediately. When removing the UI, wait for any operation to finish, disconnect, and call `graphs.dispose()` and `controller.dispose()` to release listeners.

## Analyze without hardware

Run this example in Node.js or a browser. The two channels form a complex signal.

```js
import { analyzeMeasurement } from "nmrlink";
import { createRecordPlots } from "nmrlink/graphs";

const record = {
  source: "demo", acquiredAt: new Date().toISOString(),
  mode: "single", parameters: null, points: 2048, sampleIntervalMs: 0.02,
  raw: Array.from({ length: 2048 }, (_, index) => {
    const t = index * 0.00002;
    const amplitude = 1000 * Math.exp(-t / 0.003);
    return [
      amplitude * Math.cos(2 * Math.PI * 1200 * t),
      amplitude * Math.sin(2 * Math.PI * 1200 * t),
    ];
  }),
};
const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
console.log(analysis.peak.hz); // Offset from the receive frequency [Hz], at an FFT bin.
const svg = createRecordPlots(record, { locale: "en" }); // { fid, fft, ... }
console.log(svg.fid); // SVG string; also works in Node.js.
```

## Graph language and labels

Graph APIs accept `locale: "ja"` (the default) or `"en"`. Override individual strings with `labels`; this does not convert numeric values or units.

```js
const graphs = new NMRGraphs({
  fid: fidElement, fft: fftElement,
  locale: "en",
  labels: { fid: { xLabel: "Time [ms]", yLabel: "Signal [a.u.]" } },
});
```

`NMRGraphs` and `createRecordPlots` use `labels.fid` and `labels.fft`. Curve functions accept `title`, `xLabel`, and `yLabel` directly within `labels`. Omitted labels use the selected language's defaults. See the [graph API](https://masabando.github.io/nmrlink/en/reference/api/graphs/) for all labels and templates.

## Entry points

| Import | Main features |
| --- | --- |
| `nmrlink` | NMRDevice, NMRController, parameter validation, baseline correction, FFT, sweeps, T1/T2 analysis, saved JSON parsing |
| `nmrlink/graphs` | NMRGraphs, createRecordPlots, frequency/pulse/T1/T2 SVG plots |
| `nmrlink/browser` | JSON/PNG downloads, measurement JSON loading, JST filename timestamps |

See the [graph examples](https://masabando.github.io/nmrlink/en/guide/graphs/) and [API reference](https://masabando.github.io/nmrlink/en/reference/api/) for examples you can copy.

## Errors and warnings

Library-generated exceptions have an English `message`, a stable `code`, and structured `details`. They retain their error types, such as `TypeError` or `RangeError`. Use `ERROR_CODES` exported from `nmrlink`, or code strings, for branching and UI translation; do not match message text. Browser or OS exceptions wrapped at operation boundaries are preserved as `cause`.

```js
try {
  analyzeMeasurement(record, { startMs: 5, endMs: 1 });
} catch (error) {
  if (error.code === "INVALID_FFT_RANGE") {
    // Show a message in the language of your UI.
  }
}
```

`analyzePulseCalibration`, `analyzeT1`, and `analyzeT2` return English strings in `warnings` and corresponding `{ code, message, details }` entries in `warningDetails`, in the same order. Use codes to translate warnings as well. Graph `locale` does not translate errors or warnings. See [error codes and warnings](https://masabando.github.io/nmrlink/en/reference/api/#error-codes).

## License

MIT. Author: Masamitsu Bando. See the LICENSE file included in the package.

The original Python program provided by Yasushi Kondo is also available under MIT in the repository's [`original/` directory](https://github.com/masabando/nmrlink/tree/main/original), with its own copyright notice. It is not included in this npm package.
