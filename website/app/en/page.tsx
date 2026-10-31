import { sitePath } from "@/lib/site-path";
/* eslint-disable @next/next/no-img-element -- Display Shields.io SVG badges directly. */
import type { Metadata } from "next";
import ApparatusViewer from "@/components/ApparatusViewer";
import Link from "next/link";

export const metadata: Metadata = { title: "Introduction" };

export default function Home() {
  return (
    <article className="space-y-10">
      <div className="grid items-center gap-8 xl:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Control NMR.<br />From your browser.</h1>
          <p className="max-w-2xl text-base-content/75">
            NMRLink is a JavaScript library for controlling the educational NMR apparatus developed by{' '}
            <a className="link" href="https://researchmap.jp/kondo_yasushi">Yasushi Kondo (Kindai University)</a>.
            It uses the Web Serial API to connect, acquire measurements, and display FID signals and FFT spectra.
          </p>
          <div className="flex flex-wrap items-center gap-2" aria-label="Package and development status">
            <a href="https://www.npmjs.com/package/nmrlink">
              <img src="https://img.shields.io/npm/dm/nmrlink?style=flat&logo=npm" alt="Monthly npm downloads" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/stargazers">
              <img src="https://img.shields.io/github/stars/masabando/nmrlink?style=flat&logo=github" alt="GitHub stars" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/commits/main/">
              <img src="https://img.shields.io/github/last-commit/masabando/nmrlink?style=flat" alt="Last commit" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/actions/workflows/pages.yml">
              <img src="https://img.shields.io/github/actions/workflow/status/masabando/nmrlink/pages.yml?branch=main&style=flat&label=docs" alt="Documentation build status" height={20} />
            </a>
          </div>
        </div>
        <ApparatusViewer locale="en" />
      </div>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <h2 className="text-2xl font-bold">Measure with the Web UI</h2>
        <p>The standard Web UI supports measurements, frequency tuning, pulse calibration, and T1 and T2 measurements. Actual measurements require compatible hardware and a USB-connected PC. Direct connection requires current desktop Chrome or Edge, or Firefox 151 or later. Safari does not support direct connection.</p>
        <a className="btn" href={sitePath("/ui/?lang=en")}>Open the Web UI ↗</a>
        <p><Link className="link" href="/en/guide/standard">Read the Web UI guide</Link> · <Link className="link" href="/en/guide/browsers">Browsers and troubleshooting</Link></p>
      </section>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <h2 className="text-2xl font-bold">Build your own Web UI</h2>
        <p>Use the library to build an interface for your experiments. Explore installation instructions, working previews, and code you can copy into your project.</p>
        <Link className="btn" href="/en/guide/install">Get started →</Link>
      </section>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <h2 className="text-2xl font-bold">About the compatible apparatus</h2>
        <p>This library targets a specific educational NMR apparatus; it is not a universal controller for arbitrary NMR instruments. Distribution through an educational equipment vendor is planned.</p>
        <p>NMRLink is based on the Python instrument-control program provided by Yasushi Kondo (Kindai University). The <a className="link" href="https://github.com/masabando/nmrlink/tree/main/original">original Python code</a> is also available.</p>
        <p>NMRLink and the original Python program are MIT licensed, with their respective copyright notices. <a className="link" href="https://github.com/masabando/nmrlink/blob/main/LICENSE">NMRLink license</a> · <a className="link" href="https://github.com/masabando/nmrlink/blob/main/original/LICENSE">Original Python license</a>. Third-party libraries and assets retain their own licenses.</p>
      </section>
    </article>
  );
}
