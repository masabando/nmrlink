import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import SavePreview from "@/components/SavePreview";

export const metadata: Metadata = { title: "データの保存・読み込み" };

export default function SavePage() {
  return (
    <DocumentationArticle>
      <h1>データの保存・読み込み</h1>
      <p>補正前の生データと測定条件をJSONで保存し、再測定せずに読み込んで解析できます。グラフを画像で保存する方法も紹介します。</p>
      <h2>保存して開いてみる</h2>
      <p>模擬データのJSONを保存し、「測定JSONを開く」で同じファイルを選んでください。ファイルはブラウザ内で読み込み、サーバーへのアップロードや装置への命令は行いません。実機の測定記録1件も開けます。</p>
      <SavePreview />
      <h2>生データJSONを保存する</h2>
      <p>以下は<Link href="/guide/first">最初のWeb UI</Link>に追加するコードです。controller・graphsと、各ボタン・入力・状態表示の要素は作成済みとします。</p>
      <CodeBlock language="js" code={`import { saveMeasurement } from "./nmrlink/browser.js";

saveButton.onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};`} />
      <p>npmではimport先を<code>nmrlink/browser</code>にします。全2048点・2チャンネルの生データを、読みやすいインデント付きJSONとして保存します。FIDの表示範囲やFFT範囲では切り詰めません。</p>
      <p>ファイル名は<code>nmrlink-2026-10-21_15-46-56-000_JST.json</code>のように取得時刻を日本時間で示します。JSON内の<code>acquiredAt</code>はUTCのISO形式のままです。</p>
      <p>自動保存はしません。ページを再読み込みしたり閉じたりする前に、必要な記録を保存してください。</p>
      <h2>JSONを開いて再解析する</h2>
      <CodeBlock language="html" code={`<label for="open">測定JSONを開く</label>
<input id="open" type="file" accept=".json,application/json">
<p id="status" role="status"></p>`} />
      <CodeBlock language="js" code={`import { readMeasurement } from "./nmrlink/browser.js";
import { analyzeMeasurement } from "./nmrlink/index.js";

const fileInput = document.querySelector("#open");
const status = document.querySelector("#status");
let currentRecord = controller.result;
const unsubscribeRecord = controller.onResult(record => {
  currentRecord = record; // 新しい測定に成功したときも、保存対象を更新する。
});

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.disabled = true;
  try {
    const record = await readMeasurement(file);
    const analysis = analyzeMeasurement(record);
    graphs.show(record, analysis);
    currentRecord = record; // 読み込み・解析が成功してから置き換える
    status.textContent = "読み込みました：" + file.name;
  } catch (error) {
    status.textContent = error.message; // 直前の記録とグラフを保持
  } finally {
    fileInput.disabled = false;
    fileInput.value = ""; // 同じファイルを再選択できるようにする
  }
};

// 読み込み後の記録を保存する場合：
saveButton.onclick = () => {
  const record = currentRecord;
  if (record) saveMeasurement(record);
};
// 画面を取り除くとき：unsubscribeRecord();`} />
      <p>2 MiB以下、2048点、0.02 ms間隔、各点2つの有限数値、取得日時・測定条件などを検証します。保存済みの派生した解析値は使わず、FFTなどを再計算します。模擬データの<code>{'source: "demo"'}</code>はそのまま残ります。</p>
      <p>このAPIは測定記録1件用です。周波数調整・パルス校正・T1・T2の「全データJSON」は、それぞれのWeb UIで読み込んでください。</p>
      <h2>グラフをPNGで保存する</h2>
      <CodeBlock language="js" code={`import { saveGraphPng } from "./nmrlink/browser.js";

savePngButton.onclick = async () => {
  const svg = fidElement.querySelector("svg");
  if (!svg) return;
  try {
    await saveGraphPng(svg, { filename: "fid.png", scale: 2 });
  } catch (error) {
    status.textContent = error.message;
  }
};`} />
      <p><code>fidElement</code>はNMRGraphsに渡したFIDの表示先です。FFTや走査曲線にも、表示中のSVG要素を渡せます。白背景で、既定ではSVGの2倍の解像度にします。scaleは0より大きく4以下です。</p>
      <p>線色・表示範囲・FFTの帯も画像に反映します。PNGは見た目の記録で、再解析に使う生データは含みません。再解析用にはJSONも保存してください。標準Web UIではSVG・CSVの保存も選べます。</p>
      <p><Link href="/guide/ai">次へ：AIと一緒に作る</Link></p>
    </DocumentationArticle>
  );
}
