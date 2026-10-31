import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "APIリファレンス" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>APIリファレンス</h1>
      <p>NMRLinkを組み込むときの引数・戻り値・既定値・エラーをまとめています。使い方から知りたい場合は<Link href="/guide/first">最初のWeb UI</Link>から始めてください。</p>
      <h2>機能から探す</h2>
      <ul>
        <li><Link href="/reference/api/measurement">接続・測定</Link>：NMRController、NMRDevice、測定条件・記録、時間の見積もり</li>
        <li><Link href="/reference/api/analysis">信号解析</Link>：analyzeMeasurement、correctBaseline、computeSpectrum</li>
        <li><Link href="/reference/api/graphs">グラフ</Link>：NMRGraphs、SVG生成、言語・ラベル・色</li>
        <li><Link href="/reference/api/files">保存・読み込み</Link>：JSON、PNG、取得日時、走査JSONの復元</li>
        <li><Link href="/reference/api/sweeps">周波数走査・パルス校正</Link>：走査計画、停止、共通位相とサイン近似</li>
        <li><Link href="/reference/api/relaxation">T1・T2</Link>：パルス条件、τ走査、エコー窓、指数近似</li>
      </ul>
      <h2>読み込み先</h2>
      <ReferenceTable headings={["import先", "内容", "実行環境"]} rows={[
        ["nmrlink", "制御・解析・走査・JSON検証", "ブラウザ / Node.js。実機接続はtransportに依存"],
        ["nmrlink/graphs", "NMRGraphs、SVG生成関数", "NMRGraphsはブラウザ。SVG生成はNode.jsでも利用可能"],
        ["nmrlink/browser", "保存・File読み込み・PNG・日時", "保存・File読み込み・PNGはブラウザ。日時整形はNode.jsでも利用可能"],
      ]} />
      <CodeBlock language="js" code={`import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement, readMeasurement } from "nmrlink/browser";`} />
      <p>静的HTMLでは<Link href="/guide/install#static-html">ライブラリの配置</Link>に合わせ、import先を./nmrlink/index.js・./nmrlink/graphs.js・./nmrlink/browser.jsにします。TypeScript型定義は含みません。</p>
      <h2>エラーの共通ルール</h2>
      <ul>
        <li>NMRControllerの操作はPromiseで成功・失敗を返します。失敗はonErrorにも通知します。</li>
        <li>NMRDeviceや低水準の走査関数のPromiseは、失敗時にrejectします。</li>
        <li>同期の解析・検証・SVG生成関数は、不正な入力で例外を投げます。</li>
        <li>測定の自動再送は行いません。走査の停止は現在の測定完了を待ちます。</li>
      </ul>
      <p>ライブラリが生成するエラー・警告の文は英語に統一し、識別用のcodeを付けています。UIはmessageの文章ではなくcodeで翻訳してください。グラフのlocaleはエラーを翻訳しません。ブラウザ・OS由来の操作失敗は、元の例外をcauseに残します。</p>
      <h2 id="error-codes">エラーコードとUIの翻訳</h2>
      <p>TypeError・RangeError・AggregateErrorなどの例外の種類は維持します。codeはERROR_CODES定数からも参照でき、detailsにはパラメータ名や範囲などの値が入ります。英語のmessageは説明改善で変わることがあるため、条件分岐には使わないでください。causeには元の例外がある場合だけ値が入ります。</p>
      <CodeBlock language="js" code={`import { ERROR_CODES, analyzeMeasurement } from "nmrlink";

try {
  const analysis = analyzeMeasurement(record, { startMs: 5, endMs: 1 });
  graphs.show(record, analysis);
} catch (error) {
  if (error.code === ERROR_CODES.INVALID_FFT_RANGE) {
    status.textContent = "FFT終了を開始より後にし、取得範囲内で指定してください。";
  } else {
    status.textContent = "解析できませんでした。入力を確認してください。";
    console.error(error);
  }
}`} />
      <ReferenceTable headings={["codeの例", "意味・details"]} rows={[
        ["INVALID_PARAMETER_RANGE", "測定条件の範囲外。name・minimum・maximum"],
        ["INVALID_FFT_RANGE / INSUFFICIENT_FFT_SAMPLES", "FFT区間の不正 / 選択点数不足"],
        ["INVALID_JSON / RECORD_TOO_LARGE", "JSON構文不正 / 測定JSONの容量超過"],
        ["NO_REFERENCE_SIGNAL", "共通基準に使える信号がない"],
        ["DEVICE_NOT_CONNECTED / DEVICE_BUSY", "未接続 / 別の装置操作中"],
        ["WEB_SERIAL_UNAVAILABLE / RESPONSE_TIMEOUT", "ブラウザAPI非対応 / 装置応答待ちの時間超過"],
        ["PORT_SELECTION_CANCELLED / SERIAL_PERMISSION_DENIED", "ポート選択キャンセル / アクセス拒否"],
      ]} />
      <p>コードの一覧は<code>Object.keys(ERROR_CODES)</code>で取得できます。未知のcodeには選択言語の一般的な案内を表示し、詳細をコンソールへ残します。ユーザーのコールバックや差し替えた通信部品が投げた未知の例外も、操作境界でコード付きのエラーに包みます。</p>
      <h2 id="warnings">警告のコード</h2>
      <p>analyzePulseCalibration・analyzeT1・analyzeT2は、warningsの配列形式を保ち、文は英語で返します。追加のwarningDetailsは同じ順序の<code>{"{ code, message, details }"}</code>配列です。警告の翻訳もcodeを使います。保存済みの派生値は読み込み時に再計算するため、古いJSONにwarningDetailsがなくても復元できます。</p>
      <CodeBlock language="js" code={`for (const warning of result.warningDetails) {
  console.log(warning.code, warning.message, warning.details);
}
// result.warnings === the same messages as strings (in the same order).`} />

      <p><Link href="/reference/analysis">解析の仕様</Link>では、FFTの規約・正規化・位相と近似モデルを説明します。</p>
      <p>別パッケージnmrlink-serverの遠隔接続APIは、<Link href="/guide/remote-ui">遠隔UIへの組み込み</Link>を参照してください。遠隔接続は実環境で未検証です。</p>
    </DocumentationArticle>
  );
}
