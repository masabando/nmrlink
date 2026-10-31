import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "Administrator setup" };

export default function Page() {
  return (
    <DocumentationArticle locale="en">
      <h1>Administrator setup</h1>
      <RemoteNotice locale="en" />
      <p>These are configuration instructions, not confirmation of successful real-world remote operation. Do not put your Google password in configuration files.</p>
      <h2>Prepare Firebase</h2>
      <ol>
        <li>Create a dedicated Spark project without linking a billing account.</li>
        <li>Enable Google sign-in in Authentication and add the UI domain to authorized domains. Check localhost explicitly for local testing.</li>
        <li>Create the (default) Cloud Firestore database using Standard edition and Native mode. Do not use open test-mode rules.</li>
        <li>Register a Web app and obtain its public configuration.</li>
        <li>Create a service-account JSON key for the instrument PC. Grant IAM permissions for Firestore reads/writes and Firebase Authentication user lookup. The Admin SDK uses IAM and bypasses Security Rules.</li>
      </ol>
      <h2>Repository and private configuration</h2>
      <p>Install Node.js 22 or later and run these commands at the repository root. nmrlink-server is not published to npm.</p>
      <CodeBlock locale="en" language="bash" code={`git clone https://github.com/masabando/nmrlink.git
cd nmrlink
npm install
cp .env.example .env.local
cp access-policy.example.json access-policy.json
cp examples/remote/config.example.js examples/remote/config.js`} />
      <p>Save the private key as secrets/service-account.json and edit .env.local. Keep the key, .env.local and access-policy.json private. Paths are relative to .env.local.</p>
      <CodeBlock locale="en" language="dotenv" code={`NMRLINK_PROJECT_ID=your-firebase-project-id
NMRLINK_DEVICE_ID=nmr-01
NMRLINK_SERIAL_PORT=/dev/cu.YOUR_DEVICE
NMRLINK_CREDENTIALS=./secrets/service-account.json
NMRLINK_ACCESS_POLICY=./access-policy.json
NMRLINK_RECONNECT_GRACE_MS=180000
NMRLINK_CONFIRM_DEVICE_IDLE=false`} />
      <p>Set the project ID, device ID and actual serial-port path. The grace period is in milliseconds, with a minimum of 60000.</p>
      <h2>Allowed accounts</h2>
      <p>Example access-policy.json: domains match exactly. This allows students and staff with verified ktc.ac.jp addresses.</p>
      <CodeBlock locale="en" language="json" code={`{
  "allowedDomains": [
    "ktc.ac.jp"
  ],
  "allowedEmails": [],
  "allowedEmailPatterns": [],
  "deniedEmails": []
}`} />
      <p>deniedEmails takes priority. Matching any allowedDomains, allowedEmails or allowedEmailPatterns entry permits access, case-insensitively. Empty allowlists deny everyone. Invalid policies fail at startup.</p>
      <p>Regex patterns are supported. A JSON string in allowedEmailPatterns can be <code>{String.raw`"@ktc\\.ac\\.jp$"`}</code>. Prefer allowedDomains for simple domain matching. Apply changes by restarting the server after the current user finishes.</p>
      <p>This policy controls instrument use and is not mirrored into Firestore Rules. Current rules allow Google-authenticated users to get device information and results with known IDs. Hiding data in the normal UI is different from strict data access control.</p>
      <h2>Firestore rules and indexes</h2>
      <p>Use firebase/firestore.rules and firebase/firestore.indexes.json from the repository. The following commands deploy configuration to the specified cloud project.</p>
      <CodeBlock locale="en" language="bash" code={`npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`} />
      <h2>Separate the public UI and instrument PC</h2>
      <p>Put the Firebase Web app’s public configuration and deviceId in examples/remote/config.js. Match the project and device IDs in .env.local. A public Web API key is different from the private service-account key.</p>
      <CodeBlock locale="en" language="js" code={`export const firebaseConfig = {
  apiKey: "YOUR_PUBLIC_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_WEB_APP_ID",
};
export const deviceId = "nmr-01";`} />
      <CodeBlock locale="en" language="bash" code="npm run export:remote" />
      <p>Upload only the contents of dist/remote/ to an HTTPS static Web server. Firebase Hosting is optional. Never serve the repository root containing private configuration. The Firebase SDK is loaded over the network.</p>
      <p>Connect USB on the instrument PC and start the agent from the repository root. This does not start a Web server.</p>
      <CodeBlock locale="en" language="bash" code="npm start" />
      <h2>Shutdown, recovery and free quotas</h2>
      <p>Run only one agent per instrument. Ctrl+C waits for the current measurement, deletes data and disconnects. Cloud or cleanup failures block new users. Resolve the cause before restarting.</p>
      <p>If a crash left a measuring state, an administrator must verify that the hardware is idle before recovering with NMRLINK_CONFIRM_DEVICE_IDLE=true. Restore false afterwards. This flag does not stop the instrument.</p>
      <p>The design targets Spark without billing registration and uses neither Cloud Functions nor Cloud Storage. Free quotas are limited, and idle status updates and listeners also consume resources. Quota exhaustion or network failure can block operations and cleanup.</p>
      <p><a href="https://firebase.google.com/docs/projects/billing/firebase-pricing-plans">Firebase pricing plans</a> · <a href="https://firebase.google.com/docs/firestore/quotas">Firestore quotas</a></p>
      <p><Link href="/en/guide/remote">Architecture and user workflow</Link> · <Link href="/en/guide/remote-ui">Custom UI integration</Link></p>
    </DocumentationArticle>
  );
}
