import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "Custom UI integration" };

export default function Page() {
  return (
    <DocumentationArticle locale="en">
      <h1>Custom UI integration</h1>
      <RemoteNotice locale="en" />
      <p>Use RemoteClient from nmrlink-server for remote communication. It is not a transport passed into the direct-connection NMRController. Returned measurement records work with the same NMRLink analysis, graph and file APIs as direct measurements.</p>
      <h2>Arrange the files</h2>
      <p>Start with examples/remote in the repository. npm run export:remote copies remote-client.js into dist/remote/ and updates the sample import. For a custom UI, also provide any NMRLink browser modules you need.</p>
      <p>This example places remote-client.js and config.js beside the screen’s JavaScript. Prepare public Firebase configuration using <Link href="/en/guide/remote-admin">Administrator setup</Link>. Never pass a service-account key to a browser.</p>
      <h2>Initialize the client</h2>
      <CodeBlock locale="en" language="js" code={`import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { RemoteClient } from "./remote-client.js";
import { firebaseConfig, deviceId } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firestore.getFirestore(app);
let record = null;

const client = new RemoteClient({
  auth, db, deviceId, firestore,
  onClear() {
    record = null;
    // Reset results, graphs, inputs and the save button.
  },
});`} />
      <p>Do not enable persistent Firestore caching. onClear also runs when ownership is lost. Clear visible results and saved-data references as well as record.</p>
      <h2>Sign in and watch state</h2>
      <p>Continue after initialization with these action functions. Connect login, measureSingle and finish to button clicks. Implement renderState to update the screen and disable actions while busy. Enable measurement only when owned and online.</p>
      <CodeBlock locale="en" language="js" code={`let state = { owned: false, online: false, state: "offline" };
let busy = false;
let unwatch;

function renderState() {
  // Update status and button states in your own UI.
}

async function operate(action) {
  if (busy) return;
  busy = true;
  renderState();
  try {
    await action();
  } catch (error) {
    console.error(error); // Also show the message in your UI.
  } finally {
    busy = false;
    renderState();
  }
}

async function login() {
  await operate(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
    unwatch?.();
    unwatch = client.watchDevice(next => {
      state = next;
      renderState();
    }, error => {
      state = { ...state, online: false };
      console.error(error);
      renderState();
    });
    await client.acquire();
  });
}

async function measureSingle(parameters) {
  if (!state.owned || !state.online) return;
  await operate(async () => {
    record = await client.measure(parameters, { mode: "single" });
    // Analyze, display and enable saving of record here.
  });
}

async function finish() {
  await operate(async () => {
    await client.release();
    // Only sign out after release succeeds.
    unwatch?.();
    unwatch = undefined;
    client.clearLocal();
    state = { owned: false, online: false, state: "offline" };
    await signOut(auth);
  });
}`} />
      <p>This excerpt shows where to connect your UI. Handle restored sign-in with onAuthStateChanged and require an explicit action to acquire the instrument even when already signed in. See the full <a href="https://github.com/masabando/nmrlink/blob/main/examples/remote/app.js">remote sample app.js</a> for authentication, buttons and downloads.</p>
      <p>Prompt users to save before ending a session. If release fails, do not show successful completion or hand over to another user. clearLocal alone does not release cloud ownership.</p>
      <h2>RemoteClient operations</h2>
      <ul>
        <li><code>watchDevice(onState, onError)</code>: reports state, owned and online; returns an unsubscribe function. Does not deliver measurement results.</li>
        <li><code>acquire()</code>: starts or resumes ownership and starts heartbeats. Google sign-in is required.</li>
        <li><code>measure(parameters, options)</code>: returns a measurement record. mode is single or double; timeoutMs defaults to 600000.</li>
        <li><code>release()</code>: requests session termination and data deletion.</li>
        <li><code>clearLocal()</code>: clears tab session information and heartbeats and calls onClear. Does not stop hardware or release cloud ownership.</li>
      </ul>
      <p>The constructor accepts auth, db, deviceId and firestore. storage defaults to sessionStorage; onClear resets your screen. deviceId must contain 1–80 letters, digits, hyphens or underscores.</p>
      <h2>Reuse analysis, graphs and files</h2>
      <p>Use the returned record just like a direct measurement. This example assumes a browser app with nmrlink installed from npm. For static HTML, replace imports with relative paths to the modules you serve.</p>
      <CodeBlock locale="en" language="js" code={`import { analyzeMeasurement } from "nmrlink";

// record is returned by await client.measure(...).
const analysis = analyzeMeasurement(record, {
  startMs: 1,
  endMs: 5,
  tailPoints: 100,
  window: "hann",
});
console.log(analysis);`} />
      <p>See <Link href="/en/guide/analysis">Analyze a signal</Link>, <Link href="/en/guide/graphs">Display graphs</Link> and <Link href="/en/guide/save">Save and load</Link> for arguments and display/file examples. Choose analysis ranges appropriate to the hardware and measurement.</p>
      <h2>If the connection is lost</h2>
      <p>A measure timeout does not immediately stop hardware or end ownership. Do not automatically retry after failure or timeout; check instrument state. The default reconnect grace period is three minutes, starting after measurement finishes if disconnected during measurement.</p>
      <p>Resume with the same tab’s session information. A new tab or clearLocal may leave you with a different session. Complete release before leaving, then unsubscribe from state updates. Do not assume an asynchronous release will complete in a page-unload event.</p>
      <p><Link href="/en/guide/remote">Architecture and workflow</Link> · <Link href="/en/guide/remote-admin">Administrator setup</Link></p>
    </DocumentationArticle>
  );
}
