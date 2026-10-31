import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "周波数走査・パルス校正 API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>周波数走査・パルス校正 API</h1>
      <p>import先はnmrlink。実機操作ではNMRControllerのsweep / pulseSweepを使い、記録の再解析は独立した同期関数で行えます。</p>
      <h2 id="planning">frequencySteps・pulseSteps</h2>
      <p>frequencySteps(startHz, endHz, stepHz)とpulseSteps(startCycles, endCycles, stepCycles)は昇順の整数グリッドを返します。開始≤終了、正の刻み幅、最大201点です。周波数は1〜2147483647 Hz、周期数は1〜32767。終了を超えず、刻みに合わない終点を付け足しません。不正な計画はRangeErrorです。</p>
      <h2 id="sweeps">controller.sweep・controller.pulseSweep</h2>
      <ReferenceTable headings={["操作", "必須option", "変える条件・返り値の追加項目"]} rows={[
        ["sweep(parameters, options)", "startHz、endHz、stepHz", "frequencyHz / frequencies"],
        ["pulseSweep(parameters, options)", "startCycles、endCycles、stepCycles", "pulse1Cycles / lengths"],
      ]} />
      <p>共通optionはanalysis={}、signal（AbortSignal）、onPoint(point, completed, total)です。Single測定を順番に実行し、走査全体で他の接続・切断・測定を拒否します。すべての条件と解析設定を、最初の命令送信前に検証します。</p>
      <CodeBlock language="js" code={`const abort = new AbortController();
const completedPoints = [];
const outcome = await controller.sweep(parameters, {
  startHz: 398000, endHz: 406000, stepHz: 1000,
  analysis: { startMs: 1, endMs: 5, minHz: -3000, maxHz: 3000 },
  signal: abort.signal,
  onPoint: point => { completedPoints.push(point); },
});
// 別の停止ボタンから abort.abort() を呼ぶ。現在の測定は完了を待つ。`} />
      <p>成功時valueはpoints・stopped・analysis・parametersとfrequencies / lengthsを持ちます。停止しても取得済みの点は返します。通信・解析・onPointの失敗では走査を中断し、ok:falseになります。onPointで通知済みの点は画面側で保持してください。onResultは呼ばれません。</p>
      <p>低水準のrunFrequencySweep(device, parameters, options) / runPulseSweep(...)は同じ値を直接返すPromiseで、失敗はrejectします。装置全体の排他制御は呼び出し元が行います。</p>
      <h2 id="evaluation">evaluateFrequency・evaluatePulse</h2>
      <p>evaluateFrequency(record, analysis={})はfrequencyHz・amplitude・peakHz・record、evaluatePulseはlength・amplitude・peakHz・recordを返します。この段階のamplitudeは非負のFFTピークです。</p>
      <p>analysisの既定はstartMs=1・endMs=5・tailPoints=100・window=hann・minHz=-3000・maxHz=3000です。探索帯域の上下限を含みます。帯域が不正、または該当するFFTビンがない場合は例外です。</p>
      <h2 id="analyzepulsecalibration">analyzePulseCalibration(records, options)</h2>
      <p>recordsは測定記録の配列です。analysis={}・referenceIndex=null（自動）・phaseDegrees=0が既定。全点のsource・Singleモード・サンプル間隔・第1パルス周期数以外の条件を揃えます。整数のreferenceIndexで位相基準の点を選び、phaseDegreesは全点へ共通に加えます。</p>
      <ReferenceTable headings={["戻り値", "内容"]} rows={[
        ["points", "length、amplitude（符号付き）、quadrature、magnitude、record"],
        ["reference", "hz、phaseRad、phaseDegrees、referenceIndex、coherence"],
        ["measured", "実測の山とゼロ交差からの候補。得られない場合null"],
        ["fit / magnitudeFit", "符号付き / 絶対値のサイン近似。計算できない場合null"],
        ["warnings", "位相不一致・外挿・近似の注意点などの文字列配列"],
      ]} />
      <p>全点で同じ周波数と位相を使い、符号反転を残します。各点ごとの位相合わせはしません。不一致な記録・不正な基準・共通基準に使える信号なしは例外です。山やゼロ交差の不足、位相不一致は近似を試みたうえでwarningsに返します。</p>
      <h2 id="fitpulsecalibration">signedPulseCandidates・fitPulseCalibration</h2>
      <p>signedPulseCandidates(points)はlength・符号付きamplitudeを持つ異なる5点以上から、正の山と正→負のゼロ交差を使ってp90・p180などを返します。条件を満たさなければ例外です。</p>
      <p>fitPulseCalibration(points, options={})は異なる正の周期数3点以上からサイン近似を試み、p90・p180・A・B・r2・rmse・from・to・n・modelを返します。モデルは<MathFormula tex={String.raw`A\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)+B`} />（ℓはlength）です。magnitude:trueならサインの絶対値で近似します。その場合も入力値はamplitudeへ渡します。ゼロ信号、不正値、近似計算の不成立は例外です。</p>
      <p>warningsは英語の文字列配列、warningDetailsは同じ順序のcode・message・detailsを持つ配列です。UIの翻訳はwarningDetailsのcodeで行います。</p>
      <p><Link href="/guide/graphs">グラフの表示例</Link> · <Link href="/reference/api/files#archives">JSONの復元</Link> · <Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
