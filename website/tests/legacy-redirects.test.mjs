import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  legacyRedirects,
  legacyHomeSections,
} from "../lib/legacy-redirects.mjs";
import {
  redirectHTML,
  writeLegacyRedirects,
} from "../scripts/legacy-redirects.mjs";

function follow(entry, href) {
  const current = new URL(href);
  let destination;
  vm.runInNewContext(
    redirectHTML(entry).match(/<script>([\s\S]*?)<\/script>/)[1],
    {
      URL,
      location: {
        href,
        hash: current.hash,
        search: current.search,
        replace(value) {
          destination = value;
        },
      },
    },
  );
  return new URL(destination);
}
test("all old documentation and preview URLs redirect under either mount path", () => {
  assert.equal(
    new Set(legacyRedirects.map((entry) => entry.from)).size,
    legacyRedirects.length,
  );
  for (const entry of legacyRedirects) {
    assert.match(entry.from, /\.html$/);
    assert(!entry.from.includes(".."));
    for (const base of [
      "https://example.test/nmrlink/",
      "https://example.test/",
    ]) {
      const expected = new URL(entry.to.slice(1), base);
      const actual = follow(
        entry,
        new URL(entry.from, base).href + "?from=old%2Flink",
      );
      assert.equal(actual.pathname, expected.pathname);
      assert.equal(actual.hash, expected.hash);
      assert.equal(actual.search, "?from=old%2Flink");
      assert.equal(actual.origin, expected.origin);
      const html = redirectHTML(entry);
      assert.match(html, /<noscript><meta http-equiv="refresh"/);
      assert.match(html, /data-pagefind-ignore="all"/);
      assert.match(html, /name="robots" content="noindex"/);
      assert.match(html, /<a href=/);
    }
  }
});
test("old ordinal fragments map to the correct new pages, including split API sections", () => {
  for (const entry of legacyRedirects) {
    for (const [index, target] of (entry.sections ?? [entry.to]).entries()) {
      const expected = new URL(
        target.slice(1),
        "https://example.test/nmrlink/",
      );
      const actual = follow(
        entry,
        `https://example.test/nmrlink/${entry.from}#section-${index + 1}`,
      );
      assert.equal(
        actual.href,
        expected.href,
        `${entry.from}#section-${index + 1}`,
      );
    }
  }
  const api = legacyRedirects.find((entry) => entry.from === "docs/API.html");
  assert.equal(
    follow(api, "https://example.test/nmrlink/docs/API.html#section-20").hash,
    "#error-codes",
  );
  const entry = legacyRedirects.find(
    (entry) => entry.from === "guide/install.html",
  );
  assert.equal(
    follow(entry, "https://example.test/nmrlink/guide/install.html#static-html")
      .hash,
    "#static-html",
  );
  assert.equal(Object.keys(legacyHomeSections).length, 8);
});
test("generation never overwrites a current page and does not copy the old manual", async () => {
  const out = await mkdtemp(path.join(tmpdir(), "nmrlink-redirects-"));
  try {
    await writeFile(path.join(out, "index.html"), "current home");
    await writeLegacyRedirects(out);
    assert.equal(
      await readFile(path.join(out, "index.html"), "utf8"),
      "current home",
    );
    await assert.rejects(
      writeLegacyRedirects(out),
      /overwrite an existing page/,
    );
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
