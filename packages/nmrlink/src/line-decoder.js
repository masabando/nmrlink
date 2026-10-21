/**
 * Assemble ASCII protocol lines from arbitrary serial byte chunks.
 * Keeps only the incomplete line; complete lines are returned to the caller.
 */
export class LineDecoder {
  constructor({ maxLineBytes = 65536 } = {}) {
    if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1) {
      throw new RangeError("maxLineBytes must be a positive safe integer.");
    }
    this.maxLineBytes = maxLineBytes;
    this.partial = "";
    this.failed = false;
  }

  push(bytes) {
    if (this.failed) {
      throw new Error("Decoder failed; reset it only after communication is resynchronized.");
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("Serial input must be a Uint8Array.");
    }

    const lines = [];
    for (const byte of bytes) {
      if (byte > 0x7f) {
        this.failed = true;
        throw new Error("Non-ASCII byte in controller response.");
      }
      if (byte === 0x0a) {
        lines.push(this.partial.replace(/\r$/, ""));
        this.partial = "";
      } else {
        this.partial += String.fromCharCode(byte);
        if (this.partial.length > this.maxLineBytes) {
          this.failed = true;
          throw new Error("Controller response line exceeds maxLineBytes.");
        }
      }
    }
    return lines;
  }

  /** Call when the input stream ends, to detect truncated responses. */
  finish() {
    if (this.failed || this.partial.length !== 0) {
      this.failed = true;
      throw new Error("Input ended with an invalid or incomplete response.");
    }
  }

  /** Discard state only at a known protocol boundary, such as reconnection. */
  reset() {
    this.partial = "";
    this.failed = false;
  }
}
