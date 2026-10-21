import { SerialPortMock } from "serialport";
import { NMRDevice, SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "nmrlink";
import { NodeSerialTransport } from "nmrlink-server";

/** Illustrative damped quadrature waveform. This is not a physical simulator. */
export function demoSamples(parameters, mode) {
  const samples = [];
  const phase = parameters.phase1Degrees * Math.PI / 180;
  const amplitude = 1200 * Math.sin(parameters.pulse1Cycles * Math.PI / 120);
  const offsetHz = parameters.frequencyHz - 402000;
  for (let index = 0; index < SAMPLE_COUNT; index++) {
    const timeMs = index * SAMPLE_INTERVAL_MS;
    const envelope = mode === "double" ? Math.exp(-(((timeMs - parameters.pulseIntervalMs) / 4) ** 2)) : Math.exp(-timeMs / 12);
    const angle = 2 * Math.PI * (125 + offsetHz) * timeMs / 1000 + phase;
    const noise = 12 / Math.sqrt(parameters.scans);
    samples.push([
      Math.round(30 + amplitude * envelope * Math.cos(angle) + noise * Math.sin(index * 2.31)),
      Math.round(-20 + amplitude * envelope * Math.sin(angle) + noise * Math.cos(index * 1.73)),
    ].map(value => Object.is(value, -0) ? 0 : value));
  }
  return samples;
}

export function createDemoDevice() {
  const path = "/dev/NMRLINK-DEMO-ONLY";
  SerialPortMock.binding.createPort(path, { maxReadSize: 37 });
  class DemoController extends SerialPortMock {
    constructor(options) {
      super(options);
      this.parameters = null;
      this.mode = "single";
    }
    emitResponse(text) { if (this.isOpen) this.port.emitData(text); }
    write(bytes, callback) {
      return super.write(bytes, error => {
        if (!error) {
          const command = bytes.toString();
          if (command === "P") this.emitResponse("CMD_P_OK\r\n");
          else if (bytes.length === 18) {
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            this.parameters = {
              frequencyHz: view.getInt32(0, true), pulse1Cycles: view.getInt16(4, true), phase1Degrees: view.getInt16(6, true) * 45,
              pulse2Cycles: view.getInt16(8, true), phase2Degrees: view.getInt16(10, true) * 45,
              pulseIntervalMs: view.getInt16(12, true), measurementIntervalMs: view.getInt16(14, true), scans: view.getInt16(16, true),
            };
            this.emitResponse("PARAMETERS_OK\r\n");
          } else if (["s\r\n", "d\r\n"].includes(command)) {
            this.mode = command[0] === "s" ? "single" : "double";
            this.emitResponse("START\r\n");
            this.timer = setTimeout(() => this.emitResponse("DONE\r\n"), 1500);
          } else if (command === "r\r\n") {
            this.emitResponse(demoSamples(this.parameters, this.mode).map(pair => pair.join(",")).join("\r\n") + "\r\n");
          }
        }
        callback(error);
      });
    }
    close(callback) { clearTimeout(this.timer); return super.close(callback); }
  }
  const device = new NMRDevice({ transport: new NodeSerialTransport({ path, SerialPortClass: DemoController }) });
  const measure = device.measure.bind(device);
  device.measure = async (...args) => ({ ...await measure(...args), source: "demo", simulation: "illustrative mock waveform; not a physical measurement" });
  return device;
}
