import { createError, normalizeError } from "./errors.js";
import { parseMeasurement, MAX_MEASUREMENT_JSON_BYTES } from "./record.js";

/** Format an acquisition instant in Japan time, independent of the browser's timezone. */
export function formatFileTimestamp(acquiredAt) {
  const date = new Date(acquiredAt);
  if (typeof acquiredAt !== "string" || !Number.isFinite(date.getTime())) {
    throw createError(TypeError, "INVALID_FILENAME_TIME");
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}-${milliseconds}_JST`;
}

/** Download an unmodified record as readable JSON. Browser-only utility. */
export function saveMeasurement(record) {
  if (!record) throw createError(TypeError, "RECORD_REQUIRED");
  const blob = new Blob([JSON.stringify(record, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nmrlink-${formatFileTimestamp(record.acquiredAt)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Save an NMRGraphs SVG as an opaque PNG, at twice its SVG resolution by default. */
export async function saveGraphPng(svg, { filename = "nmrlink-graph.png", scale = 2 } = {}) {
  if (svg?.localName !== "svg" || svg.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw createError(TypeError, "SVG_REQUIRED");
  }
  if (!Number.isFinite(scale) || scale <= 0 || scale > 4) {
    throw createError(RangeError, "INVALID_PNG_SCALE");
  }
  const bounds = svg.viewBox.baseVal;
  const width = Math.round(bounds.width * scale);
  const height = Math.round(bounds.height * scale);
  if (width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 16777216) {
    throw createError(RangeError, "INVALID_PNG_DIMENSIONS");
  }

  // Snapshot the current plot before awaiting image decoding or any later UI updates.
  const copy = svg.cloneNode(true);
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.style.fontFamily = getComputedStyle(svg).fontFamily;
  const source = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" });
  const sourceUrl = URL.createObjectURL(source);
  let png;
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(createError(Error, "PNG_IMAGE_LOAD_FAILED"));
      image.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw createError(Error, "PNG_CANVAS_UNAVAILABLE");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    png = await new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(createError(Error, "PNG_ENCODING_FAILED")), "image/png",
    ));
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  const url = URL.createObjectURL(png);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Read a local file only; parsing never opens a serial port or sends a command. */
export async function readMeasurement(file) {
  if (!file || typeof file.text !== "function" || !Number.isFinite(file.size)) {
    throw createError(TypeError, "INVALID_RECORD_FILE");
  }
  if (file.size > MAX_MEASUREMENT_JSON_BYTES) throw createError(RangeError, "RECORD_TOO_LARGE");
  let text;
  try { text = await file.text(); }
  catch (error) { throw normalizeError(error); }
  return parseMeasurement(text);
}
