import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "T1・T2 API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>T1・T2 API</h1>
      <p>import先はnmrlink。T1は反転回復、T2はスピンエコーを使います。測定・再解析・近似は別の関数です。</p>
      <h2 id="parameters">t1Parameters・t2Parameters</h2>
      <CodeBlock language="js" code={`const calibrated = {
  frequencyHz: 402000, p90Cycles: 21, p180Cycles: 42,
  measurementIntervalMs: 200, scans: 64,
};
const t1 = t1Parameters(calibrated, 5);
const t2 = t2Parameters(calibrated, 5);`} />
      <p>t1Parameters(settings, tauMs)は180°(0°) → τ → 90°(0°)、t2Parametersは90°(0°) → τ → 180°(90°)の装置パラメータを返します。上の校正値は例です。0 &lt; p90Cycles &lt; p180Cyclesの整数、τは1〜32767 ms。繰り返し間隔はτ＋40.96 msより長くします。不正な条件は例外です。</p>
      <h2 id="sweeps">τの計画と走査</h2>
      <p>t1Delays / t2Delays(startMs, endMs, stepMs)は、1〜32767 msの整数τグリッドを返します。昇順、最大201点で、終了値を超えません。</p>
      <p>controller.t1Sweep / controller.t2Sweep(parameters, options)はDouble測定を順番に実行します。必須のstartMs・endMs・stepMs、任意のanalysis={}・signal・onPointを渡します。parametersは上で作った通常の装置パラメータです。</p>
      <p>戻り値は成功時ok:trueのvalueにpoints・stopped・analysis・parameters・delays、失敗時はok:falseのerrorです。現在の測定完了後に停止し、onPointで取得済みの点を通知します。低水準のrunT1Sweep / runT2Sweep(device, parameters, options)は同じvalueを返すPromiseで、失敗はrejectします。</p>
      <h2 id="t2window">t2Window(tauMs, analysis)</h2>
      <p>T2のanalysis.startMs / endMsはエコー中心からの相対値で、既定は−4 / +4 msです。取得は第2パルス後から始まるため、中心は取得時刻τです。返り値のstartMs / endMsは取得開始からの絶対時刻になります。</p>
      <CodeBlock language="js" code={`const window = t2Window(10, { startMs: -4, endMs: 4 });
// window.startMs === 6, window.endMs === 14`} />
      <p>開始オフセットは負、終了オフセットは正で、中心を含む窓が0〜40.96 ms内に収まり、4点以上必要です。走査は全点の移動窓を事前検証します。T1の解析範囲は通常の取得開始からの絶対時刻です。</p>
      <h2 id="evaluation">evaluateT1・evaluateT2</h2>
      <p>evaluateT1(record, analysis={})はtau・amplitude・peakHz・recordを返します。evaluateT2は移動窓windowも返します。amplitudeは帯域内の非負のFFTピークです。解析の既定値は<Link href="/reference/api/sweeps#evaluation">周波数評価</Link>と同じで、T2の開始・終了だけ上記の相対窓です。</p>
      <h2 id="analysis">analyzeT1・analyzeT2</h2>
      <p>recordsは全測定記録の配列です。全点のsource・Doubleモード・サンプル間隔・τ以外の測定条件を揃えます。optionsはanalysis={}・referenceIndex=null・fromMs・toMs。T1のみphaseDegrees=0も受け取ります。</p>
      <ReferenceTable headings={["項目", "T1", "T2"]} rows={[
        ["信号評価", "共通周波数・共通位相の符号付き成分", "共通周波数での複素振幅の絶対値"],
        ["基準", "自動または選択点の位相基準", "自動では強い点、または選択点の周波数"],
        ["points", "tau・signal・magnitude・quadrature・record", "tau・signal・magnitude・amplitude・peakHz・window・record"],
        ["近似範囲の単位", "τ [ms]。省略時は測定τの最小〜最大", "2τ [ms]。省略時は測定2τの最小〜最大"],
      ]} />
      <p>戻り値はpoints・reference・fit・warnings・fromMs・toMs。不正な条件や基準に使える信号なしは例外です。近似の不成立はfit:nullとwarningsで返します。T1は共通方向の一致度が0.85未満でも近似を行いません。T2は位相合わせをせず絶対値で評価します。</p>
      <h2 id="fits">fitT1・fitT2</h2>
      <p>fitT1 / fitT2(points, {"{ fromMs, toMs }"})へtau・signalを持つ配列を渡します。範囲は必須、両端を含みます。同じτの値は平均します。</p>
      <ReferenceTable headings={["項目", "T1", "T2"]} rows={[
        ["モデル", <MathFormula key="t1-model" tex={String.raw`A-Be^{-\tau/T}`} />, <><MathFormula tex={String.raw`Ae^{-2\tau/T}`} />、背景は0固定</>],
        ["最小点数", "異なるτが5点", "異なるτが3点"],
        ["信号条件", "負と正の信号が必要", "非負のエコー振幅"],
        ["不成立の例", <>ゼロ・平坦・<MathFormula tex={String.raw`R^2<0.95`} />・<MathFormula tex={String.raw`\Delta t/T<0.8`} />・最適値が探索端</>, "ゼロ・平坦・負値・最適値が探索端"],
      ]} />
      <p>結果にはT [ms]・A・B・C・sse・r2・rmse・n・from・to・modelがあります。T2はB:null・C:0です。関数単独では近似できなければ例外です。analyzeT1 / analyzeT2はその例外をwarningsへ変換します。</p>
      <p>最大τが推定T1の3倍未満でも、それだけで近似を止めず警告にします。T2も短い測定範囲や低い一致度は警告として扱います。推定値は測定条件・範囲とともに評価してください。</p>
      <p>warningsは英語の文字列配列、warningDetailsは同じ順序のcode・message・detailsを持つ配列です。UIの翻訳はwarningDetailsのcodeで行います。</p>
      <p><Link href="/reference/analysis#relaxation">近似の仕様</Link> · <Link href="/reference/api/files#archives">保存JSONの復元</Link> · <Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
