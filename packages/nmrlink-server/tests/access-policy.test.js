import test from "node:test";
import assert from "node:assert/strict";
import { createAccessPolicy } from "../src/access-policy.js";
const user = email => ({ email, emailVerified: true, disabled: false, providerData: [{ providerId: "google.com" }] });

test("local policy supports domains, individual addresses, patterns and denial priority", () => {
  const allow = createAccessPolicy({
    allowedDomains: ["ktc.ac.jp"], allowedEmails: ["guest@example.com"],
    allowedEmailPatterns: ["^teacher[0-9]+@example\\.org$"], deniedEmails: ["blocked@ktc.ac.jp"],
  });
  for (const email of ["student@ktc.ac.jp", "STAFF@KTC.AC.JP", "guest@example.com", "teacher12@example.org"]) assert.equal(allow(user(email)), true);
  for (const email of ["blocked@ktc.ac.jp", "a@evilktc.ac.jp", "a@ktcXacYjp", "a@other.example"]) assert.equal(allow(user(email)), false);
  assert.equal(allow({ ...user("a@ktc.ac.jp"), emailVerified: false }), false);
  assert.equal(allow({ ...user("a@ktc.ac.jp"), disabled: true }), false);
  assert.equal(allow({ ...user("a@ktc.ac.jp"), providerData: [] }), false);
  assert.equal(createAccessPolicy({})(user("a@ktc.ac.jp")), false);
  assert.throws(() => createAccessPolicy({ allowedEmailPatterns: ["["] }));
  assert.throws(() => createAccessPolicy({ allowdDomains: ["ktc.ac.jp"] }));
});
