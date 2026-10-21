import { formatFileTimestamp } from "../../packages/nmrlink/src/browser.js";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, setPersistence, inMemoryPersistence,
  GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "firebase/auth";
import * as firestore from "firebase/firestore";
import { RemoteClient } from "../../packages/nmrlink-server/browser/remote-client.js";
import { DEMO_PROJECT_ID, DEMO_DEVICE_ID, DEMO_AUTH_PORT, DEMO_FIRESTORE_PORT } from "../../scripts/demo/config.js";
import { analyzeRecord } from "./analysis.js";

// This entry point is bundled only for the local demo, never for the real UI.
if (!["127.0.0.1", "localhost"].includes(location.hostname)) throw new Error("Demo is localhost-only.");
const app = initializeApp({ projectId: DEMO_PROJECT_ID, apiKey: "demo-not-a-real-api-key", authDomain: "localhost" });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://127.0.0.1:${DEMO_AUTH_PORT}`, { disableWarnings: true });
await setPersistence(auth, inMemoryPersistence); // Demo users are isolated between tabs.
await signOut(auth); // A fresh demo page never reuses a token from a stopped emulator.
const db = firestore.getFirestore(app);
firestore.connectFirestoreEmulator(db, "127.0.0.1", DEMO_FIRESTORE_PORT);
const element = id => document.getElementById(id);
let result = null;
let analysis = null;
let busy = false;
let owned = false;
let online = false;
let unsubscribe;
let notice = "";
const client = new RemoteClient({ auth, db, deviceId: DEMO_DEVICE_ID, firestore, onClear: clearResult });

function clearResult() {
  result = null;
  analysis = null;
  owned = false;
  element("measurement").reset();
  element("result-panel").hidden = true;
  element("release-confirm").hidden = true;
  element("summary").textContent = "";
  element("analysis-form").reset();
  clearSpectrum();
  element("baseline-summary").textContent = "";
  const canvas = element("waveform");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  update();
}
function update() {
  const loggedIn = !!auth.currentUser;
  element("login").hidden = loggedIn;
  element("logout").hidden = !loggedIn;
  element("user").disabled = loggedIn || busy;
  element("login").disabled = busy;
  element("logout").disabled = busy;
  element("acquire").disabled = busy || !loggedIn || !online || owned;
  element("controls").hidden = !owned;
  element("settings").disabled = busy;
  element("release").disabled = busy;
  element("confirm-release").disabled = busy;
  element("cancel-release").disabled = busy;
  element("result-panel").hidden = !result || !owned;
}
async function operate(action) {
  if (busy) return;
  busy = true;
  notice = "";
  update();
  try { await action(); }
  catch (error) { notice = error.message; element("status").textContent = notice; }
  finally { busy = false; update(); }
}
const userFromUrl = new URLSearchParams(location.search).get("user");
if (["student-a", "student-b", "teacher", "visitor"].includes(userFromUrl)) element("user").value = userFromUrl;

onAuthStateChanged(auth, user => {
  unsubscribe?.();
  clearResult();
  element("account").textContent = user ? `デモ利用者：${user.email}` : "未ログイン";
  if (user) {
    unsubscribe = client.watchDevice(state => {
      owned = state.owned;
      online = state.online;
      if (!notice) element("status").textContent = !online ? "デモ装置の接続を確認してください。" :
        owned ? (state.state === "measuring" ? "模擬測定中…" : "あなたが利用中です。") :
          state.state === "idle" ? "利用可能です。" : "使用中です。ほかの利用者の操作・結果は表示しません。";
      update();
    }, error => { notice = error.message; element("status").textContent = notice; });
  } else {
    online = false;
    element("status").textContent = "利用者を選んでデモログインしてください。";
  }
  update();
});

element("login").onclick = () => operate(async () => {
  const user = element("user").value;
  const email = user === "visitor" ? "visitor@example.com" : `${user}@ktc.ac.jp`;
  // Authentication emulator accepts a local fake Google credential; no Google popup.
  const token = JSON.stringify({ sub: `nmrlink-demo-${user}`, email, email_verified: true, name: user });
  await signInWithCredential(auth, GoogleAuthProvider.credential(token));
});
element("logout").onclick = () => operate(async () => {
  if (owned) await client.release();
  client.clearLocal();
  await signOut(auth);
});
element("acquire").onclick = () => operate(() => client.acquire());
element("measurement").onsubmit = event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const mode = fields.get("mode");
  fields.delete("mode");
  const parameters = Object.fromEntries([...fields].map(([key, value]) => [key, Number(value)]));
  operate(async () => {
    element("status").textContent = "模擬測定要求を送っています…";
    result = await client.measure(parameters, { mode });
    if (result.source !== "demo") throw new Error("Unexpected non-demo result.");
    element("summary").textContent = `${result.points}点 × 2チャンネル ／ ${mode} ／ 合成データ`;
    runAnalysis();
    element("result-panel").hidden = false;
    element("status").textContent = "模擬測定が完了しました。保存または利用終了できます。";
  });
};
element("release").onclick = () => { element("release-confirm").hidden = false; };
element("cancel-release").onclick = () => { element("release-confirm").hidden = true; };
element("confirm-release").onclick = () => operate(() => client.release());
function renderWaveform(record, data = record.raw) {
  const canvas = element("waveform");
  const context = canvas.getContext("2d");
  const width = canvas.width, height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#dce2e7";
  context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
  const maximum = Math.max(1, ...data.flat().map(Math.abs));
  for (const [channel, color] of [[0, "#2672a6"], [1, "#c77628"]]) {
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    data.forEach((pair, index) => {
      const x = index / (data.length - 1) * width;
      const y = height / 2 - pair[channel] / maximum * height * 0.45;
      if (index) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.stroke();
  }
}
function clearSpectrum() {
  const canvas = element("spectrum");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  element("analysis-status").textContent = "";
  element("download-spectrum").disabled = true;
}

function runAnalysis() {
  if (!result || !owned) return;
  analysis = null;
  clearSpectrum();
  try {
    const fields = new FormData(element("analysis-form"));
    const minimumHz = Number(fields.get("minimumHz"));
    const maximumHz = Number(fields.get("maximumHz"));
    if (![minimumHz, maximumHz].every(Number.isFinite) || minimumHz >= maximumHz) {
      throw new Error("周波数の表示範囲は、下限 < 上限にしてください。");
    }
    const next = analyzeRecord(result, {
      baselineEnabled: fields.has("baselineEnabled"), tailPoints: Number(fields.get("tailPoints")),
      startMs: Number(fields.get("startMs")), endMs: Number(fields.get("endMs")), window: fields.get("window"),
    });
    const visible = next.spectrum.bins.filter(bin => bin.hz >= minimumHz && bin.hz <= maximumHz);
    if (visible.length < 2) throw new Error("表示範囲にFFTの点が2点以上入るよう指定してください。");
    renderWaveform(result, next.data);
    renderSpectrum(visible, minimumHz, maximumHz);
    analysis = next;
    const fft = analysis.spectrum;
    const peak = fft.bins.reduce((a, b) => a.amplitude > b.amplitude ? a : b);
    element("baseline-summary").textContent = analysis.base ?
      `末尾${analysis.settings.tailPoints}点の平均：ch1 ${analysis.base[0].toFixed(3)} / ch2 ${analysis.base[1].toFixed(3)}。差し引いてゼロ方向へ整数化。` : "ベースライン補正なし。生データを解析しています。";
    element("waveform-description").textContent = `青：チャンネル1 ／ 橙：チャンネル2。${analysis.base ? "補正後" : "補正前"}の合成データ（実測値ではありません）。`;
    element("analysis-status").textContent =
      `解析完了：${fft.actualStartMs.toFixed(2)}〜${fft.actualEndExclusiveMs.toFixed(2)} ms（終了排他）、${fft.count}点 → FFT ${fft.size}点。` +
      `観測時間による分解能 ${fft.resolutionHz.toFixed(2)} Hz ／ ビン間隔 ${fft.spacingHz.toFixed(2)} Hz。` +
      `全範囲の最大ビン ${peak.hz.toFixed(2)} Hz、振幅 ${peak.amplitude.toFixed(3)}。`;
    element("download-spectrum").disabled = false;
  } catch (error) {
    // A failed analysis must not discard a successfully acquired raw measurement.
    renderWaveform(result);
    element("waveform-description").textContent = "青：チャンネル1 ／ 橙：チャンネル2。補正前の合成データを保持しています。";
    element("baseline-summary").textContent = "";
    element("analysis-status").textContent = `解析できません：${error.message} 生データは保持しています。`;
  }
}

function renderSpectrum(bins, minimumHz, maximumHz) {
  const canvas = element("spectrum");
  const context = canvas.getContext("2d");
  const left = 65, right = canvas.width - 15, top = 15, bottom = canvas.height - 45;
  const maximumAmplitude = Math.max(1e-12, ...bins.map(bin => bin.amplitude)) * 1.05;
  const x = hz => left + (hz - minimumHz) / (maximumHz - minimumHz) * (right - left);
  const y = amplitude => bottom - amplitude / maximumAmplitude * (bottom - top);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "14px sans-serif";
  for (let index = 0; index <= 4; index++) {
    const hz = minimumHz + (maximumHz - minimumHz) * index / 4;
    const amplitude = maximumAmplitude * index / 4;
    context.strokeStyle = "#dce2e7";
    context.beginPath(); context.moveTo(x(hz), top); context.lineTo(x(hz), bottom); context.stroke();
    context.beginPath(); context.moveTo(left, y(amplitude)); context.lineTo(right, y(amplitude)); context.stroke();
    context.fillStyle = "#52616c";
    context.textAlign = "center"; context.fillText(hz.toFixed(0), x(hz), bottom + 21);
    context.textAlign = "right"; context.fillText(amplitude.toFixed(1), left - 7, y(amplitude) + 5);
  }
  context.textAlign = "center";
  context.fillText("受信基準からの相対周波数 [Hz]", (left + right) / 2, canvas.height - 3);
  context.strokeStyle = "#2672a6";
  context.lineWidth = 2;
  context.beginPath();
  bins.forEach((bin, index) => {
    if (index) context.lineTo(x(bin.hz), y(bin.amplitude)); else context.moveTo(x(bin.hz), y(bin.amplitude));
  });
  context.stroke();
}
element("analysis-form").onsubmit = event => { event.preventDefault(); runAnalysis(); };
function download(extension, content, type) {
  if (!owned || !result) return;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `nmrlink-DEMO-${formatFileTimestamp(result.acquiredAt)}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element("download-json").onclick = () => download("json", JSON.stringify({ ...result, analysis }, null, 2), "application/json");
element("download-csv").onclick = () => {
  if (!result) return;
  const rows = ["source,time_ms,ch1,ch2", ...result.raw.map((pair, index) => `demo,${index * result.sampleIntervalMs},${pair[0]},${pair[1]}`)];
  download("csv", rows.join("\n") + "\n", "text/csv;charset=utf-8");
};
element("download-spectrum").onclick = () => {
  if (!result || !analysis) return;
  const { window, startMs, endMs, bins } = analysis.spectrum;
  const rows = ["source,window,start_ms,end_exclusive_ms,frequency_hz,real,imaginary,amplitude,phase_radians",
    ...bins.map(bin => `${result.source},${window},${startMs},${endMs},${bin.hz},${bin.real},${bin.imaginary},${bin.amplitude},${bin.phaseRadians}`)];
  download("fft.csv", rows.join("\n") + "\n", "text/csv;charset=utf-8");
};
