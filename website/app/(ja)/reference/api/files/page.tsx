import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "保存・読み込み API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>保存・読み込み API</h1>
      <p>生データを残すJSONと、見た目を残す画像を使い分けます。<Link href="/guide/save">保存・読み込みガイド</Link>に操作例があります。</p>
      <h2 id="savemeasurement">saveMeasurement(record)</h2>
      <p>import先はnmrlink/browser。測定記録を改行・インデント付きJSONとしてダウンロードし、戻り値はありません。元の記録は変更しません。利用者のクリックから呼んでください。</p>
      <p>ファイル名はnmrlink-取得日時_JST.jsonで、時刻は日本時間です。記録内のacquiredAtは変更しません。表示範囲で生データを切り詰めず、渡した記録全体を保存します。</p>
      <h2 id="parsemeasurement">parseMeasurement(text)・readMeasurement(file)</h2>
      <p>parseMeasurementはnmrlinkの同期関数、readMeasurementはnmrlink/browserの非同期関数です。文字列 / Fileを読み、検証済みの<Link href="/reference/api/measurement#record">測定記録</Link>を返します。通信・装置操作は行いません。</p>
      <ReferenceTable headings={["検証項目", "条件"]} rows={[
        ["容量", "UTF-8で2 MiB以下"],
        ["source / mode", "instrumentまたはdemo / singleまたはdouble"],
        ["points / sampleIntervalMs", "2048 / 0.02"],
        ["raw", "2048組の有限数値2つ。数値文字列は拒否"],
        ["acquiredAt / parameters", "有効な取得日時 / 測定条件。demoのみparameters:nullを許可"],
      ]} />
      <p>未知のフィールドや保存された解析結果は戻り値に含めません。parseMeasurementは例外を投げ、readMeasurementは読み込み・検証失敗でrejectします。解析も成功した後に、現在の記録・表示を置き換えてください。</p>
      <CodeBlock language="js" code={`const file = fileInput.files[0];
if (file) {
  try {
    const record = await readMeasurement(file);
    const analysis = analyzeMeasurement(record);
    graphs.show(record, analysis);
  } catch (error) {
    status.textContent = error.message;
  }
}`} />
      <h2 id="savegraphpng">saveGraphPng(svg, options)</h2>
      <p>import先はnmrlink/browser。SVG要素を白背景のPNGにしてダウンロードするPromiseです。filenameはnmrlink-graph.png、scaleは2が既定です。scaleは0より大きく4以下。各辺8192 px以下、合計16メガピクセル以下の出力に限ります。</p>
      <p>表示中の軸・ラベル・波形・色・解析範囲を保存します。元のSVGや測定記録は変更しません。SVG以外、不正なscale、画像変換の失敗は例外またはrejectです。自作UIから渡すSVGはNMRLinkで生成したものを使ってください。</p>
      <h2 id="formatfiletimestamp">formatFileTimestamp(acquiredAt)</h2>
      <p>import先はnmrlink/browser。端末のタイムゾーンに依存せず、日時文字列からファイル名用の日本時間を返します。不正な日時はTypeErrorです。</p>
      <CodeBlock language="js" code={`const name = formatFileTimestamp("2026-10-21T06:00:00.000Z");
// "2026-10-21_15-00-00-000_JST"`} />
      <h2 id="archives">走査全体のJSONを復元する</h2>
      <p>import先はnmrlink。以下は同期関数で、各Web UIの「全データJSON」の文字列を受け取ります。保存済みの振幅・近似値は使わず、生データから再計算します。</p>
      <ReferenceTable headings={["関数", "主な戻り値"]} rows={[
        ["parseFrequencySweep(text)", "source、acquiredAt、settings、points"],
        ["parsePulseCalibration(text)", "上記＋calibration、referenceIndex、phaseDegrees"],
        ["parseT1Measurement(text)", "基本4項目＋result、referenceIndex、phaseDegrees、fromMs、toMs"],
        ["parseT2Measurement(text)", "基本4項目＋result、referenceIndex、fromMs、toMs"],
      ]} />
      <p>上限は32 MiB、1〜201点。途中停止した走査の記録にも対応します。条件・測定点・基準点・近似範囲の不整合は例外です。有効な無信号のパルス・T1・T2走査は波形確認用に開けますが、calibrationまたはresultがnullになります。</p>
      <p>MAX_FREQUENCY_JSON_BYTES・MAX_PULSE_JSON_BYTES・MAX_T1_JSON_BYTES・MAX_T2_JSON_BYTESは、それぞれ32 × 1024 × 1024です。走査全体の保存専用関数はなく、Web UIが各形式のJSONを組み立てています。</p>
      <p><Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
