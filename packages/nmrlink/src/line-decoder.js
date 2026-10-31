import { createError } from "./errors.js";
/**
 * Assemble ASCII protocol lines from arbitrary serial byte chunks.
 * Keeps only the incomplete line; complete lines are returned to the caller.
 */
export class LineDecoder {
  constructor({ maxLineBytes = 65536 } = {}) {
    if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1) {
      throw createError(RangeError, "INVALID_MAX_LINE_BYTES");
    }
    this.maxLineBytes = maxLineBytes;
    this.partial = "";
    this.failed = false;
  }

  push(bytes) {
    if (this.failed) {
      throw createError(Error, "DECODER_FAILED");
    }
    if (!(bytes instanceof Uint8Array)) {
      throw createError(TypeError, "INVALID_SERIAL_BYTES");
    }

    const lines = [];
    for (const byte of bytes) {
      if (byte > 0x7f) {
        this.failed = true;
        throw createError(Error, "NON_ASCII_RESPONSE");
      }
      if (byte === 0x0a) {
        lines.push(this.partial.replace(/\r$/, ""));
        this.partial = "";
      } else {
        this.partial += String.fromCharCode(byte);
        if (this.partial.length > this.maxLineBytes) {
          this.failed = true;
          throw createError(Error, "RESPONSE_LINE_TOO_LONG");
        }
      }
    }
    return lines;
  }

  /** Call when the input stream ends, to detect truncated responses. */
  finish() {
    if (this.failed || this.partial.length !== 0) {
      this.failed = true;
      throw createError(Error, "INCOMPLETE_RESPONSE");
    }
  }

  /** Discard state only at a known protocol boundary, such as reconnection. */
  reset() {
    this.partial = "";
    this.failed = false;
  }
}
