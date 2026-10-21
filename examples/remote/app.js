import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { RemoteClient } from "../../packages/nmrlink-server/browser/remote-client.js";

const element = id => document.getElementById(id);
const defaults = {
  frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0,
  pulse2Cycles: 120, phase2Degrees: 90, pulseIntervalMs: 5,
  measurementIntervalMs: 200, scans: 1,
};
const clear = () => {
  result = null;
  element("result").textContent = "";
  element("parameters").value = JSON.stringify(defaults, null, 2);
  element("download").disabled = true;
};
let result = null;
let busy = false;
let owned = false;
let client;
let unsubscribe;
function update() {
  element("controls").hidden = !owned;
  for (const id of ["login", "logout", "acquire", "measure", "release"]) element(id).disabled = busy;
}
async function operate(action) {
  busy = true;
  update();
  try { await action(); }
  catch (error) { element("status").textContent = error.message; }
  finally { busy = false; update(); }
}
try {
  const { firebaseConfig, deviceId } = await import("./config.js");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = firestore.getFirestore(app); // Memory cache only; no IndexedDB persistence.
  client = new RemoteClient({ auth, db, deviceId, firestore, onClear: () => {
    owned = false;
    clear();
    update();
  } });
  clear();
  onAuthStateChanged(auth, user => {
    unsubscribe?.();
    owned = false;
    clear();
    element("account").textContent = user?.email ?? "未ログイン";
    element("login").hidden = !!user;
    element("logout").hidden = !user;
    element("acquire").hidden = !user;
    if (user) {
      unsubscribe = client.watchDevice(state => {
        owned = state.owned;
        element("status").textContent = !state.online ? "装置の接続を確認してください。" :
          owned ? `利用中：${state.state}` : state.state === "idle" ? "利用可能" : "使用中";
        update();
      }, error => { element("status").textContent = error.message; });
    }
    update();
  });
  element("login").onclick = () => operate(() => signInWithPopup(auth, new GoogleAuthProvider()));
  element("logout").onclick = () => operate(async () => {
    if (owned) await client.release();
    client.clearLocal();
    await signOut(auth);
  });
  element("acquire").onclick = () => operate(() => client.acquire());
  element("measure").onclick = () => operate(async () => {
    const parameters = JSON.parse(element("parameters").value);
    element("status").textContent = "測定中…";
    result = await client.measure(parameters, { mode: element("mode").value });
    element("result").textContent = `${result.points}点取得\n${JSON.stringify(result.raw.slice(0, 5), null, 2)}`;
    element("download").disabled = false;
  });
  element("release").onclick = () => {
    if (confirm("必要な結果は保存しましたか？利用データを削除して終了します。")) operate(() => client.release());
  };
  element("download").onclick = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nmrlink-result.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
} catch (error) {
  element("status").textContent = `設定できません：config.example.jsをconfig.jsへコピーし、Firebaseの公開設定を入力してください。\n${error.message}`;
}
