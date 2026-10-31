import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "Supported browsers and connection troubleshooting" };

export default function BrowsersPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Supported browsers and connection troubleshooting</h1>
      <p>For direct hardware access, we recommend the latest Chrome or Edge on a PC connected to the device by USB.</p>

      <h2>Which browser should I use?</h2>
      <p>This table describes Web Serial API support. Hardware-tested NMRLink configurations are listed separately below.</p>
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th scope="col">OS</th><th scope="col">Browsers for direct connection</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            <tr><td>macOS</td><td>Latest Chrome or Edge; Firefox 151 or later</td><td>Safari cannot connect directly.</td></tr>
            <tr><td>Windows</td><td>Latest Chrome or Edge; Firefox 151 or later</td><td>Organization policies may restrict access.</td></tr>
            <tr><td>Linux</td><td>Latest Chrome or Edge; Firefox 151 or later</td><td>Check port permissions and browser packaging.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Firefox may prompt you to install an add-on when first authorizing device access. For older releases or ESR, check that your version supports the API.</p>
      <p>Phones, tablets, and Safari can display documentation and simulated graphs, and view or analyze saved data. Use a PC with a supported browser for direct hardware access.</p>

      <h2>Hardware-tested configurations</h2>
      <ul>
        <li><strong>Standard NMRLink Web UI:</strong> measurement, frequency tuning, pulse calibration, and T1 and T2 measurements have been tested with Chrome on macOS.</li>
        <li><strong>Other configurations:</strong> browser API support does not mean every combination has been tested with NMRLink hardware.</li>
      </ul>
      <p>The successful report for Firefox on Debian 13 concerns the earlier browser control program, before it became this library.</p>

      <h2>Connection checklist</h2>
      <ol>
        <li>
          <strong>Check the browser and URL.</strong>
          {' '}Use a supported browser over HTTPS or localhost on the PC connected to the device.
          Direct access is unavailable from a file: URL or an ordinary HTTP LAN address.
        </li>
        <li>
          <strong>Check the USB connection.</strong>
          {' '}Check device power and the USB data cable, then confirm that the OS recognizes a serial port.
        </li>
        <li>
          <strong>Check whether another app or tab is using the port.</strong>
          {' '}Wait for any measurement to finish, then disconnect Python control programs, serial monitors, and other measurement screens.
        </li>
        <li>
          <strong>Click Connect, select the device port, and grant access.</strong>
          {' '}If the port is missing, check OS permissions and packaging restrictions.
          If permission is denied, check browser site settings and organization policies.
        </li>
      </ol>
      <p>
        In a custom UI, request port access directly from the Connect button click.
        See <Link href="/en/guide/measurement">Control measurements</Link> for API details.
      </p>

      <h2 id="linux">Linux-specific checks</h2>
      <h3>OS serial port permissions</h3>
      <p>
        The user running the browser needs read and write access to the device port.
        On Debian-based systems, the port may belong to the <code>dialout</code> group.
        After adding group membership, log out of the desktop and log in again.
      </p>
      <p>Replace /dev/ttyACM0 with the actual port. Check its group and the current user’s group membership.</p>
      <CodeBlock locale="en" language="sh" code={`ls -l /dev/ttyACM0
id -nG`} />
      <p>If the port belongs to dialout and your user is not a member, ask the administrator to add you. An administrator can add their own account with the following command. Log out of the desktop and back in afterwards.</p>
      <CodeBlock locale="en" language="sh" code={`sudo usermod -aG dialout "$USER"`} />
      <h3>Snap and other packaging restrictions</h3>
      <p>
        Snap-packaged Chromium may require connecting its <code>raw-usb</code> interface in addition to OS permissions.
      </p>
      <p>
        Snap-packaged Firefox has a <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=2038075">known issue</a> where ports do not appear.
        Do not apply Chromium commands by simply replacing its name with Firefox.
        Check the <a href="https://support.mozilla.org/en-US/kb/install-firefox-linux">official Mozilla guide</a> for non-Snap installation options.
      </p>
      <CodeBlock locale="en" language="sh" code={`snap list chromium
snap connections chromium`} />
      <p>If raw-usb is listed with “-” in the Slot column, it is disconnected. An administrator can grant Chromium USB access with:</p>
      <CodeBlock locale="en" language="sh" code="sudo snap connect chromium:raw-usb" />
      <p>Fully quit and reopen Chromium. This permission is not limited to the NMR instrument, and OS port permissions are still needed. It does not apply to packages without a raw-usb plug and does not guarantee a successful connection. See the <a href="https://snapcraft.io/docs/reference/interfaces/raw-usb-interface/">Snap raw-usb specification</a>.</p>

      <h2>If the issue persists</h2>
      <p>Collect these details to help narrow down the cause:</p>
      <ul>
        <li>OS and browser names and versions. On Linux, include how the browser was installed.</li>
        <li>Whether the port picker opens, whether the device appears, and whether connection succeeds after selecting it.</li>
        <li>The error message shown on screen.</li>
      </ul>
      <p><Link href="/en/guide/install">Back to Installation</Link></p>
      <p>
        References: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility">MDN Web Serial API compatibility</a>
        {' '}and <a href="https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/">Mozilla’s Firefox announcement</a>.
      </p>
    </DocumentationArticle>
  );
}
