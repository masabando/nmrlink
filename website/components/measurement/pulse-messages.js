export const pulseMessages = {
  ja: {
    pulseIdle:
      "第1パルスの周期数を変えてSingle測定し、ラビ振動から90°・180°パルスを推定します。",
    sweep: "パルス走査",
    startCycles: "開始 [周期数]",
    endCycles: "終了 [周期数]",
    stepCycles: "刻み幅 [周期数]",
    fixedFrequency: "固定周波数 [Hz]",
    commonAnalysis: "全点共通の解析条件",
    minKHz: "ピーク探索下限 [kHz]",
    maxKHz: "ピーク探索上限 [kHz]",
    perPoint: "1点あたり約{seconds}秒",
    plan: "{count}点 · 最終点 {last}周期 · 各点 {scans}回積算",
    startScan: "走査開始",
    stop: "現在の測定後に停止",
    stopping: "停止を要求しました。現在の測定完了を待っています。",
    scanHint:
      "第1パルスを変えてSingle測定します。停止は現在の測定完了を待ちます。新しい走査では前回の記録を置き換えます。",
    demoScan: "パルス走査デモ",
    openScan: "全データJSONを開く",
    openScanHint:
      "再測定せずに曲線・近似・各点のFIDとFFTを確認できます。読み込み成功時に現在の記録と走査条件を置き換えます。",
    curve: "ラビ振動・パルス周期数と信号",
    responseEmpty: "走査すると結果を表示します。",
    view: "表示する信号",
    magnitude: "絶対値",
    signed: "符号付き信号",
    magnitudeHint:
      "絶対値では山と谷を確認できます。符号反転は折り返して表示します。",
    signedHint: "全点に共通の位相基準を使い、信号の符号反転を残します。",
    magnitudeLegend: "● 信号の絶対値　— |sin|近似",
    signedLegend: "● 符号付き信号　— サイン近似",
    measured: "実測の候補：90° {p90}周期 · 180° {p180}周期（ゼロ交差の補間）",
    noMeasured:
      "実測候補は未確定です。短いパルスから180°の先まで測定してください。",
    fit: "サイン近似：90° {p90}周期 · 180° {p180}周期 · R² {r2}",
    noFit: "近似候補は未確定です。",
    adopt: "近似値を候補欄へ",
    chosen90: "90°候補 [周期数]",
    chosen180: "180°候補 [周期数]",
    candidateHint:
      "候補は整数に丸めて表示します。装置への送信や他の画面への自動反映は行いません。標準測定へ切り替え、候補を確認して入力してください。接続はそのまま使えます。",
    reference: "共通位相基準",
    auto: "自動基準",
    manual: "選択点の基準",
    referenceSummary:
      "{kind} · {hz} Hz · 共通方向の一致度 {coherence} · 追加補正 {phase}°",
    autoReference: "自動基準に戻す",
    selectedReference: "選択点を位相基準にする",
    phase: "追加位相補正 [°]",
    reanalyzeAll: "全点を再解析",
    referenceHint:
      "各点別の位相合わせはせず、符号反転を残します。自動基準では短い周期数の強い信号を正方向に揃えます。",
    noReferenceSignal: "位相基準に使える信号がありません。",
    noReference: "取得点から共通位相基準を解析します。",
    invalidPhase: "位相補正には有限の数値を入力してください。",
    phaseApplied: "共通位相基準で全点を再解析しました。",
    measuredPoints: "測定点",
    pointHint: "周期数のボタンを押すと、その点のFID・FFTを確認できます。",
    cycles: "周期数",
    signal: "符号付き信号",
    quadrature: "直交成分",
    selected: "{length}周期 のFID・FFT",
    selectedEmpty: "選択点のFID・FFT",
    bandHint:
      "FFT図は±10 kHzを表示します。走査の評価には入力したピーク探索帯域を使います。",
    selectedJson: "選択点の生データJSON",
    saveScan: "走査データを保存",
    allJson: "全データJSON",
    scanCsv: "校正CSV",
    archiveHint:
      "全データJSONには各点の生データ・走査条件・位相基準を保存します。選択点のJSONは標準測定でも開けます。ページを閉じる前に保存してください。",
    started: "走査を開始しました。第1点の測定完了を待っています。",
    progress: "{completed} / {total}点完了 · {length}周期",
    complete: "走査が完了しました：{count}点。必要なデータを保存してください。",
    stopped: "走査を停止しました：{count}点。取得済みの記録は保持しています。",
    scanFailed:
      "走査を中断しました。取得済みの記録は保持しています。自動再送は行いません。",
    scanLoaded:
      "保存データを読み込みました：{count}点。装置への命令は送っていません。",
    demoScanSource: "模擬走査 · DEMO",
    scanSource: "実機走査",
  },
  en: {
    pulseIdle:
      "Vary the first pulse in Single measurements and estimate 90°/180° pulses from Rabi oscillations.",
    sweep: "Pulse scan",
    startCycles: "Start [RF cycles]",
    endCycles: "End [RF cycles]",
    stepCycles: "Step [RF cycles]",
    fixedFrequency: "Fixed frequency [Hz]",
    commonAnalysis: "Analysis settings for all points",
    minKHz: "Peak search minimum [kHz]",
    maxKHz: "Peak search maximum [kHz]",
    perPoint: "About {seconds} s per point",
    plan: "{count} points · Last {last} RF cycles · {scans} scans per point",
    startScan: "Start scan",
    stop: "Stop after current measurement",
    stopping: "Stop requested. Waiting for the current measurement to finish.",
    scanHint:
      "Single measurements with varying first-pulse cycles. Stop waits for the current measurement. A new scan replaces the previous records.",
    demoScan: "Pulse scan demo",
    openScan: "Open full scan JSON",
    openScanHint:
      "Inspect curves, fits and each point's FID/FFT without measuring again. A successful import replaces current records and scan settings.",
    curve: "Rabi oscillations and pulse cycles",
    responseEmpty: "Run a scan to display the response.",
    view: "Signal to display",
    magnitude: "Magnitude",
    signed: "Signed signal",
    magnitudeHint:
      "Inspect peaks and valleys in the magnitude. Negative signals are folded upward.",
    signedHint:
      "A common phase reference for all points preserves signal sign reversals.",
    magnitudeLegend: "● Signal magnitude — |sin| fit",
    signedLegend: "● Signed signal — Sine fit",
    measured:
      "Measured candidates: 90° {p90} cycles · 180° {p180} cycles (interpolated zero crossing)",
    noMeasured:
      "Measured candidates are not yet available. Measure from short pulses to beyond 180°.",
    fit: "Sine fit: 90° {p90} cycles · 180° {p180} cycles · R² {r2}",
    noFit: "A fitted candidate is not yet available.",
    adopt: "Copy fitted values to candidates",
    chosen90: "90° candidate [RF cycles]",
    chosen180: "180° candidate [RF cycles]",
    candidateHint:
      "Candidates are rounded to integers. No command is sent and no other page's settings are changed automatically. Switch to Measurement and enter the values after checking them. The connection remains available.",
    reference: "Common phase reference",
    auto: "Automatic reference",
    manual: "Selected-point reference",
    referenceSummary:
      "{kind} · {hz} Hz · Direction coherence {coherence} · Additional phase {phase}°",
    autoReference: "Use automatic reference",
    selectedReference: "Use selected point as phase reference",
    phase: "Additional phase correction [°]",
    reanalyzeAll: "Reanalyze all points",
    referenceHint:
      "Do not align points individually: sign reversals are retained. The automatic reference aligns strong signals at short pulse lengths in the positive direction.",
    noReferenceSignal: "No usable signal is available for a phase reference.",
    noReference:
      "The common phase reference will be analyzed from acquired points.",
    invalidPhase: "Enter a finite number for phase correction.",
    phaseApplied: "Reanalyzed all points using the common phase reference.",
    measuredPoints: "Measured points",
    pointHint: "Select a pulse length to inspect that point's FID and FFT.",
    cycles: "RF cycles",
    signal: "Signed signal",
    quadrature: "Quadrature",
    selected: "FID and FFT at {length} RF cycles",
    selectedEmpty: "Selected point's FID and FFT",
    bandHint:
      "The FFT graph displays ±10 kHz. Scan evaluation uses the peak search band entered in the form.",
    selectedJson: "Selected point raw JSON",
    saveScan: "Save scan data",
    allJson: "Full scan JSON",
    scanCsv: "Calibration CSV",
    archiveHint:
      "Full scan JSON contains raw data for every point, scan settings and the phase reference. A selected point's JSON can also be opened in Measurement. Save before closing the page.",
    started: "Scan started. Waiting for the first measurement.",
    progress: "{completed} / {total} points complete · {length} RF cycles",
    complete: "Scan complete: {count} points. Save any data you need.",
    stopped: "Scan stopped: {count} points. Acquired records are preserved.",
    scanFailed:
      "Scan interrupted. Acquired records are preserved. No automatic retry is performed.",
    scanLoaded:
      "Loaded scan data: {count} points. No commands were sent to the apparatus.",
    demoScanSource: "Simulated scan · DEMO",
    scanSource: "Hardware scan",
  },
};
export function pulseText(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
