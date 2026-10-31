/** Wire format used by the prototype controller. See docs/PROTOCOL.md. */
export const SAMPLE_COUNT = 2048;
export const SAMPLE_INTERVAL_MS = 0.02;
export const PARAMETER_BYTES = 18;

export const SERIAL_OPTIONS = Object.freeze({
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  flowControl: "none",
});

// These are PoC input/encoding limits, not certified hardware safety limits.
const INTEGER_RANGES = {
  frequencyHz: [1, 2147483647],
  pulse1Cycles: [0, 32767],
  pulse2Cycles: [0, 32767],
  pulseIntervalMs: [0, 32767],
  measurementIntervalMs: [1, 32767],
  scans: [1, 32767],
};

/**
 * @typedef {Object} MeasurementParameters
 * @property {number} frequencyHz Value sent unchanged to the controller.
 * @property {number} pulse1Cycles RF cycle count, not microseconds.
 * @property {number} phase1Degrees One of 0, 90, 180, 270.
 * @property {number} pulse2Cycles RF cycle count, not microseconds.
 * @property {number} phase2Degrees One of 0, 90, 180, 270.
 * @property {number} pulseIntervalMs Inter-pulse delay.
 * @property {number} measurementIntervalMs Controller interval setting.
 * @property {number} scans Acquisition count.
 */

/** Validate and copy only the supported fields. @param {MeasurementParameters} input */
export function validateParameters(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Measurement parameters must be an object.");
  }

  const parameters = {};
  for (const [name, [minimum, maximum]] of Object.entries(INTEGER_RANGES)) {
    const value = input[name];
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
    }
    parameters[name] = value;
  }

  for (const name of ["phase1Degrees", "phase2Degrees"]) {
    if (![0, 90, 180, 270].includes(input[name])) {
      throw new RangeError(`${name} must be 0, 90, 180, or 270.`);
    }
    parameters[name] = input[name];
  }
  return parameters;
}

/** Encode Python struct.pack('<i7h', ...), little endian. */
export function encodeParameters(input) {
  const parameters = validateParameters(input);
  const bytes = new Uint8Array(PARAMETER_BYTES);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, parameters.frequencyHz, true);

  // The firmware phase code advances in 45-degree units.
  const shortValues = [
    parameters.pulse1Cycles,
    parameters.phase1Degrees / 45,
    parameters.pulse2Cycles,
    parameters.phase2Degrees / 45,
    parameters.pulseIntervalMs,
    parameters.measurementIntervalMs,
    parameters.scans,
  ];
  shortValues.forEach((value, index) => {
    view.setInt16(4 + index * 2, value, true);
  });
  return bytes;
}

/** Return a fresh command buffer; parameter setup deliberately has no CRLF. */
export function encodeCommand(command) {
  const commands = {
    parameters: [0x50],
    single: [0x73, 0x0d, 0x0a],
    double: [0x64, 0x0d, 0x0a],
    read: [0x72, 0x0d, 0x0a],
  };
  if (!Object.hasOwn(commands, command)) {
    throw new RangeError(`Unsupported command: ${command}`);
  }
  return new Uint8Array(commands[command]);
}

/** Decode one complete channel-pair line. Invalid data is never replaced by zero. */
export function parseSampleLine(line) {
  if (typeof line !== "string" || !/^-?\d+,-?\d+$/.test(line.trim())) {
    throw new TypeError("Expected two comma-separated signed integers.");
  }
  const sample = line.trim().split(",").map(Number);
  if (!sample.every(Number.isSafeInteger)) {
    throw new RangeError("Sample exceeds the safe integer range.");
  }
  return sample;
}
