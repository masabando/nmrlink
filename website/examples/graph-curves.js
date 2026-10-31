// コピー用HTMLに含める模擬データと近似処理。
export const curveExamples = {
  frequency: {
    graph: "createFrequencyPlot",
    code: `const points = Array.from({ length: 9 }, (_, i) => {
  const frequencyHz = 398000 + i * 1000;
  return { frequencyHz, amplitude: 1000 * Math.exp(-(((frequencyHz - 402000) / 1800) ** 2)) };
});
const options = {};`,
  },
  pulse: {
    graph: "createPulsePlot", fit: "fitPulseCalibration",
    code: `const points = Array.from({ length: 16 }, (_, i) => {
  const length = 5 + i * 5;
  return { length, amplitude: 1000 * Math.sin(Math.PI * length / (2 * 21)) };
});
const options = { fit: fitPulseCalibration(points) };`,
  },
  t1: {
    graph: "createT1Plot", fit: "fitT1",
    code: `const points = Array.from({ length: 20 }, (_, i) => {
  const tau = 5 + i * 5;
  return { tau, signal: 1000 * (1 - 2 * Math.exp(-tau / 20)) };
});
const options = { fit: fitT1(points, { fromMs: 5, toMs: 100 }) };`,
  },
  t2: {
    graph: "createT2Plot", fit: "fitT2",
    code: `const points = Array.from({ length: 16 }, (_, i) => {
  const tau = 5 + i * 2;
  return { tau, signal: 1000 * Math.exp(-2 * tau / 22) };
});
const options = { fit: fitT2(points, { fromMs: 10, toMs: 70 }) };`,
  },
};

export function curveHTML(kind, locale = "ja") {
  const example = curveExamples[kind];
  return `<div id="curve"></div>
<script type="module">
import { ${example.graph} } from "./nmrlink/graphs.js";
${example.fit ? `import { ${example.fit} } from "./nmrlink/index.js";\n` : ""}
${example.code}

const element = document.querySelector("#curve");
function draw() {
  const width = Math.max(160, Math.floor(element.clientWidth));
  element.innerHTML = ${example.graph}(points, { ...options, width, locale: "${locale}" });
}
const observer = new ResizeObserver(draw);
observer.observe(element);
draw();

// Call observer.disconnect() when removing this view.
</script>`;
}
