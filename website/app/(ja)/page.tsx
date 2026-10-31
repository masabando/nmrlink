import { sitePath } from "@/lib/site-path";
/* eslint-disable @next/next/no-img-element -- Shields.ioのSVGバッジをそのまま表示します。 */
import LegacyHomeAnchors from "@/components/LegacyHomeAnchors";
import ApparatusViewer from "@/components/ApparatusViewer";
import Link from "next/link";

export default function Home() {
  return (
    <article className="space-y-10">
      <div className="grid items-center gap-8 xl:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">NMR装置を、<br />ブラウザから。</h1>
          <p className="max-w-2xl text-base-content/75">
            NMRLinkは、<a className="link" href="https://researchmap.jp/kondo_yasushi">近藤 康 (近畿大学)</a> が開発を進めてきた学生実験用のNMR装置を制御するJavaScriptライブラリです。
            Web Serial APIを使い、接続から測定、FID・FFTの表示までを扱えます。
          </p>
          <div className="flex flex-wrap items-center gap-2" aria-label="パッケージと開発状況">
            <a href="https://www.npmjs.com/package/nmrlink">
              <img src="https://img.shields.io/npm/dm/nmrlink?style=flat&logo=npm" alt="npm月間ダウンロード数" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/stargazers">
              <img src="https://img.shields.io/github/stars/masabando/nmrlink?style=flat&logo=github" alt="GitHubスター数" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/commits/main/">
              <img src="https://img.shields.io/github/last-commit/masabando/nmrlink?style=flat" alt="最終コミット" height={20} />
            </a>
            <a href="https://github.com/masabando/nmrlink/actions/workflows/pages.yml">
              <img src="https://img.shields.io/github/actions/workflow/status/masabando/nmrlink/pages.yml?branch=main&style=flat&label=docs" alt="ドキュメントのビルド状況" height={20} />
            </a>
          </div>
        </div>
        <ApparatusViewer />
      </div>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <LegacyHomeAnchors section="web-ui" />
        <h2 id="web-ui" className="text-2xl font-bold">Web UIで測定する</h2>
        <p>標準Web UIから、測定・周波数調整・パルス校正・T1測定・T2測定を行えます。実際の測定には対応する装置とUSB接続したPCが必要です。直接接続にはPC版Chrome・Edgeの最新版、またはFirefox 151以降を使います。Safariは直接接続に対応していません。</p>
        <a className="btn" href={sitePath("/ui/?lang=ja")}>標準Web UIを開く ↗</a>
        <p><Link className="link" href="/guide/standard">Web UIの使い方を読む</Link> · <Link className="link" href="/guide/browsers">対応ブラウザ・接続トラブル</Link></p>
      </section>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <LegacyHomeAnchors section="build-ui" />
        <h2 id="build-ui" className="text-2xl font-bold">自分のWeb UIを作る</h2>
        <p>ライブラリを組み込んで、用途に合う操作画面を作れます。導入方法や表示例、コピーして使えるコードを紹介します。</p>
        <Link className="btn" href="/guide/install">導入する →</Link>
      </section>
      <section className="space-y-3 border-t border-base-300 pt-8">
        <LegacyHomeAnchors section="hardware" />
        <h2 id="hardware" className="text-2xl font-bold">対応する装置について</h2>
        <p>特定の学生実験用NMR装置のためのライブラリです。一般のNMR装置を共通に操作するものではありません。装置は教材販売会社を通じての販売が計画されています。</p>
        <p>近藤 康（近畿大学）から提供されたPythonの装置制御プログラムをもとに開発しています。<a className="link" href="https://github.com/masabando/nmrlink/tree/main/original">Pythonの原本</a>も公開しています。</p>
        <LegacyHomeAnchors section="license" />
        <p id="license">NMRLink本体と原本のPythonプログラムは、それぞれの著作権表示を付したMITライセンスです。<a className="link" href="https://github.com/masabando/nmrlink/blob/main/LICENSE">NMRLinkのライセンス</a> · <a className="link" href="https://github.com/masabando/nmrlink/blob/main/original/LICENSE">Python原本のライセンス</a>。第三者のライブラリ・素材には、それぞれのライセンスが適用されます。</p>
      </section>
    </article>
  );
}
