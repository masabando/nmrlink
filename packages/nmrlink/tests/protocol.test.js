import test from "node:test";
import assert from "node:assert/strict";
import { packParams, parsePair } from "../../../tests/fixtures/poc/protocol.js";
import { encodeParameters, encodeCommand, parseSampleLine, LineDecoder } from "../src/index.js";

const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 60,
  phase1Degrees: 0,
  pulse2Cycles: 120,
  phase2Degrees: 90,
  pulseIntervalMs: 5,
  measurementIntervalMs: 200,
  scans: 128,
};

function pocParameters(p) {
  return {
    frequency: p.frequencyHz,
    width1: p.pulse1Cycles,
    phase1: p.phase1Degrees,
    width2: p.pulse2Cycles,
    phase2: p.phase2Degrees,
    pulseInterval: p.pulseIntervalMs,
    measureInterval: p.measurementIntervalMs,
    count: p.scans,
  };
}

test("parameter packet matches the Python <i7h reference vector", () => {
  assert.deepEqual([...encodeParameters(parameters)], [
    80, 34, 6, 0, 60, 0, 0, 0, 120, 0, 2, 0, 5, 0, 200, 0, 128, 0,
  ]);
});

test("phase codes and encoding boundaries agree with the PoC", () => {
  for (const phase of [0, 90, 180, 270]) {
    for (const maximum of [false, true]) {
      const input = {
        ...parameters,
        frequencyHz: maximum ? 2147483647 : 1,
        pulse1Cycles: maximum ? 32767 : 0,
        pulse2Cycles: maximum ? 32767 : 0,
        pulseIntervalMs: maximum ? 32767 : 0,
        measurementIntervalMs: maximum ? 32767 : 1,
        scans: maximum ? 32767 : 1,
        phase1Degrees: phase,
        phase2Degrees: phase,
      };
      assert.deepEqual(encodeParameters(input), packParams(pocParameters(input)));
    }
  }
});

test("invalid parameters fail before generating a packet", () => {
  for (const change of [
    { frequencyHz: 2147483648 }, { pulse1Cycles: -1 },
    { pulse2Cycles: 32768 }, { phase1Degrees: 45 },
    { phase2Degrees: "90" }, { pulseIntervalMs: NaN },
    { measurementIntervalMs: 0 }, { scans: 1.5 },
  ]) {
    assert.throws(() => encodeParameters({ ...parameters, ...change }));
  }
  assert.throws(() => encodeParameters(null));
  assert.throws(() => encodeParameters({}));
});

test("wire commands preserve case and terminators; stop is not invented", () => {
  const decoder = new TextDecoder();
  for (const [name, wire] of Object.entries({
    parameters: "P", single: "s\r\n", double: "d\r\n", read: "r\r\n",
  })) {
    assert.equal(decoder.decode(encodeCommand(name)), wire);
  }
  assert.throws(() => encodeCommand("stop"));
  assert.throws(() => encodeCommand("toString"));
});

test("a response split at every byte boundary gives the same sample pairs", () => {
  const bytes = new TextEncoder().encode("CMD_P_OK\r\n1,2\r\n-3,4\n");
  for (let split = 0; split <= bytes.length; split++) {
    const decoder = new LineDecoder();
    const lines = [...decoder.push(bytes.slice(0, split)), ...decoder.push(bytes.slice(split))];
    decoder.finish();
    assert.equal(lines[0], "CMD_P_OK");
    for (const line of lines.slice(1)) {
      assert.deepEqual(parseSampleLine(line), parsePair(line));
    }
  }
});

test("corrupt samples, oversized lines, and truncated streams fail explicitly", () => {
  for (const line of ["", "1", "1,2,3", "nan,1", "1.2,3", "9007199254740992,0"]) {
    assert.throws(() => parseSampleLine(line));
  }
  const decoder = new LineDecoder({ maxLineBytes: 3 });
  assert.throws(() => decoder.push(new TextEncoder().encode("1234\n")));
  assert.throws(() => decoder.push(new Uint8Array()));
  decoder.reset();
  assert.deepEqual(decoder.push(new TextEncoder().encode("1,2\n")), ["1,2"]);
  decoder.push(new TextEncoder().encode("1,"));
  assert.throws(() => decoder.finish());
  decoder.reset();
  assert.throws(() => decoder.push(new Uint8Array([255])));
});
