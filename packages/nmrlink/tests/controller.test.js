import test from "node:test";
import assert from "node:assert/strict";
import { NMRController } from "../src/controller.js";

test("controller starts connect synchronously and rejects overlapping work without replay", async () => {
  let finish;
  let connects = 0;
  const device = { state: "disconnected", connect() {
    connects++;
    return new Promise(resolve => { finish = () => { this.state = "connected"; resolve(); }; });
  }};
  const controller = new NMRController({ device });
  const errors = [];
  controller.onError(error => errors.push(error));
  const pending = controller.connect();
  assert.equal(connects, 1);
  assert.equal(controller.state.busy, true);
  assert.equal((await controller.connect()).ok, false);
  assert.equal(connects, 1);
  finish();
  assert.equal((await pending).ok, true);
  assert.equal(controller.state.canMeasure, true);
  assert.equal(errors.length, 1);
  controller.dispose();
});

test("controller retains successful raw results after device and UI failures", async () => {
  const record = { raw: [[1, 2]] };
  let fail = false;
  const device = { state: "connected", async measure() { if (fail) throw new Error("wire failure"); return record; } };
  const controller = new NMRController({ device });
  const errors = [];
  controller.onError(error => errors.push(error.message));
  const unsubscribe = controller.onResult(() => { throw new Error("plot failure"); });
  assert.equal((await controller.measure({})).ok, true);
  assert.equal(controller.result, record);
  unsubscribe();
  fail = true;
  assert.equal((await controller.measure({})).ok, false);
  assert.equal(controller.result, record);
  assert.deepEqual(errors, ["plot failure", "wire failure"]);
  device.state = "disconnected";
  assert.equal(controller.state.canConnect, true);
  controller.dispose();
  assert.equal(controller.state.canConnect, false);
});
