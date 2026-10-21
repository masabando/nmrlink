import test from "node:test";
import assert from "node:assert/strict";
import { formatFileTimestamp } from "../src/browser.js";

test("download timestamps use JST, including milliseconds and date rollover", () => {
  assert.equal(formatFileTimestamp("2026-10-21T06:46:56.123Z"), "2026-10-21_15-46-56-123_JST");
  assert.equal(formatFileTimestamp("2026-12-31T15:00:00.000Z"), "2027-01-01_00-00-00-000_JST");
  assert.equal(formatFileTimestamp("2026-10-21T15:46:56.123+09:00"), "2026-10-21_15-46-56-123_JST");
});
test("invalid filename timestamps are rejected", () => {
  for (const value of [undefined, null, "not-a-date", 0]) assert.throws(() => formatFileTimestamp(value));
});
