import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "How remote operation works" };

export default function Page() {
  return (
    <DocumentationArticle locale="en">
      <h1>How remote operation works</h1>
      <RemoteNotice locale="en" />
      <p>Run nmrlink-server on the PC connected to the instrument, and sign in with a Google account from a browser elsewhere. The instrument does not need to be connected to the user’s PC.</p>
      <h2>Three parts</h2>
      <CodeBlock locale="en" language="text" code={`User browser (static Web UI)
        ↕ Firebase Authentication and Firestore
Instrument PC (Node.js and nmrlink-server)
        ↕ USB serial
      NMR instrument`} />
      <ul>
        <li>The Web server serves HTML and JavaScript; it does not run Node.js.</li>
        <li>Firebase handles sign-in and relays requests and results.</li>
        <li>The instrument PC handles serial communication. The remote user’s browser does not use Web Serial API.</li>
      </ul>
      <p>The two PCs need not share a LAN. Both need access to Firebase. This design does not require a public HTTP server on the instrument PC or router port forwarding.</p>
      <h2>What the administrator prepares</h2>
      <ol>
        <li>Compatible hardware, its USB connection, and an instrument PC with Node.js 22 or later.</li>
        <li>A Firebase project on the Spark plan without billing registration, with Google sign-in and Firestore configured.</li>
        <li>Private instrument-PC configuration and an account allowlist.</li>
        <li>An HTTPS static Web server for the public UI.</li>
      </ol>
      <p>Follow <Link href="/en/guide/remote-admin">Administrator setup</Link>. nmrlink-server is not currently published to npm; use the GitHub repository.</p>
      <h2>User workflow</h2>
      <ol>
        <li>Open the UI and sign in with Google.</li>
        <li>Choose “利用開始・再開” (start/resume). Access is denied if the local policy rejects the account or another session owns the instrument.</li>
        <li>Check the settings and run a Single or Double measurement.</li>
        <li>Download the results you need.</li>
        <li>Choose “利用終了・データ削除” (end session/delete data). The next user can start after cleanup completes.</li>
      </ol>
      <p>Only one session can use the instrument at a time. There is no queue or reservation system. Another tab is a different session even with the same account. After reloading the same tab, use start/resume to reconnect.</p>
      <h2>Disconnection and data</h2>
      <p>Losing the connection does not immediately stop a physical measurement. The default reconnect grace period is three minutes; if disconnected during measurement, it starts after measurement finishes. Never automatically resend a measurement whose outcome is unknown.</p>
      <p>Cloud results and requests are deleted when a session ends or expires before handing over to another user. Failed cleanup blocks handover. Downloaded files and other local copies are outside this cleanup.</p>
      <p>The normal UI hides results from other users and rejected accounts. The instrument PC’s allowlist is not mirrored into Firestore Security Rules. This is not strict data confidentiality; do not use it for confidential records.</p>
      <h2>Build your own screen</h2>
      <p>Use RemoteClient for communication and NMRLink for analysis, graphs and files. Continue to <Link href="/en/guide/remote-ui">Custom UI integration</Link>.</p>
      <h2 id="local-demo">Try without hardware or Firebase setup</h2>
      <p>Clone the repository and run these commands at its root. The local demo needs no apparatus, Google account, Firebase configuration or billing registration.</p>
      <CodeBlock locale="en" language="sh" code={`npm install
npm run demo`} />
      <p>Open the displayed localhost URL to try demo login, session ownership, simulated measurements, deletion and handover. The first run may download emulators and Java. Press Ctrl+C in the terminal to stop. See the <a href="https://github.com/masabando/nmrlink/tree/main/examples/demo">local demo instructions</a> for details. A successful simulated session does not validate real remote operation.</p>
    </DocumentationArticle>
  );
}
