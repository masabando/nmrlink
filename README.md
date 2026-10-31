# NMRLink

English | [日本語](./README.ja.md)

[![version](https://img.shields.io/github/v/tag/masabando/nmrlink?style=flat&label=version)](https://github.com/masabando/nmrlink/tags)
[![GitHub stars](https://img.shields.io/github/stars/masabando/nmrlink?style=flat&logo=github)](https://github.com/masabando/nmrlink/stargazers)
[![last commit](https://img.shields.io/github/last-commit/masabando/nmrlink?style=flat)](https://github.com/masabando/nmrlink/commits/main/)
[![docs build](https://img.shields.io/github/actions/workflow/status/masabando/nmrlink/pages.yml?branch=main&style=flat&label=docs)](https://github.com/masabando/nmrlink/actions/workflows/pages.yml)

A JavaScript library for the educational NMR apparatus developed by [Yasushi Kondo (Kindai University)](https://researchmap.jp/kondo_yasushi). Build your own Web UI with Web Serial connectivity, measurement control, signal analysis, and graphs, or use the included standard Web UI.

[Documentation](https://masabando.github.io/nmrlink/en/) · [npm](https://www.npmjs.com/package/nmrlink) · [Standard Web UI](https://masabando.github.io/nmrlink/ui/?lang=en) · [Minimal example](./examples/direct/)

## Hardware

Real measurements require the supported educational NMR apparatus and a USB serial connection. NMRLink is specific to this apparatus; it is not a universal interface for NMR instruments. Simulated data lets you try the graphs and controls without hardware.

Distribution of the apparatus through an educational equipment supplier is planned.

## Use the Web UI

Open the [standard Web UI](https://masabando.github.io/nmrlink/ui/?lang=en) to use:

- Single/Double measurements, FID and FFT graphs, adjustable analysis ranges and window functions
- Frequency adjustment, pulse calibration, T1/T2 measurements and curve fitting
- JSON save/load, CSV export, and SVG/PNG graph downloads

Direct hardware access requires a desktop browser with Web Serial support and HTTPS or localhost on the same PC. Check the [browser and connection guide](https://masabando.github.io/nmrlink/en/guide/browsers/) before connecting. Confirm measurement settings for your apparatus and sample. An active measurement cannot be stopped immediately.

The Web UI supports Japanese and English and can be served as static files. Direct connection needs no Firebase configuration or persistent Node.js process.

## Build your own Web UI

```sh
npm install nmrlink
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";
```

Use a bundler such as Vite, or import the sources by relative URL in static HTML without a build step. See the [installation guide](https://masabando.github.io/nmrlink/en/guide/install/), [package README](./packages/nmrlink/README.md), and [minimal example](./examples/direct/).

NMRLink provides readable ES modules with no runtime dependencies. It does not include CommonJS builds or TypeScript declarations.

## Remote access — unverified

Remote access uses a Node.js program on the apparatus PC and Firebase. This configuration has not been verified in a real deployment; please avoid using it for now. See the [remote access guide](https://masabando.github.io/nmrlink/en/guide/remote/).

## Original program and license

NMRLink is based on the Python control program provided by [Yasushi Kondo (Kindai University)](https://researchmap.jp/kondo_yasushi). The [original Python program](./original/) is also available with permission.

NMRLink is distributed under the [MIT license](./LICENSE). The original Python program has its own [MIT license and copyright notice](./original/LICENSE). Third-party libraries and assets retain their respective licenses.
