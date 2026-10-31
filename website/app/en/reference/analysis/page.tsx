import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import MathFormula from "@/components/MathFormula";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "Analysis specifications" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Analysis specifications</h1>
      <p>How NMRLink corrects, transforms and fits measurement values. See the <Link href="/en/reference/api/analysis">signal analysis API</Link> for arguments and results, or the <Link href="/en/guide/analysis">analysis guide</Link> for examples.</p>
      <h2 id="baseline">Baseline correction</h2>
      <p>Each channel uses the mean of its final tailPoints samples as the baseline, subtracting it from every sample. Defaults: 100 samples and truncate:true, applying Math.trunc toward zero after subtraction. Use false to retain fractional values.</p>
      <p>The corrected array is new; raw is unchanged. A remaining signal in the tail contributes to the mean. This is not an automatic separation of device offsets from physical signal.</p>
      <MathFormula block tex={String.raw`b_c=\frac{1}{K}\sum_{n=L-K}^{L-1}x_{n,c},\qquad y_{n,c}=x_{n,c}-b_c`} />
      <p>L is the total sample count, K is tailPoints and c is the channel. Truncation, when enabled, is applied to the corrected values.</p>
      <h2 id="complex-fft">Complex FFT convention</h2>
      <MathFormula block tex={String.raw`z_j=I_j+iQ_j`} />
      <MathFormula block tex={String.raw`X_k=\frac{\displaystyle\sum_{j=0}^{N-1} w_jz_j\,e^{-i2\pi kj/M}}{\displaystyle\sum_{j=0}^{N-1} w_j}`} />
      <MathFormula block tex={String.raw`A_k=|X_k|,\qquad \phi_k=\operatorname{atan2}\!\left(\operatorname{Im}X_k,\operatorname{Re}X_k\right)`} />
      <p>I and Q denote Data 1 and Data 2. N is the selected sample count; j starts at zero at the beginning of that interval. M is the padded FFT size. A and φ correspond to amplitude and phaseRadians. The forward exponent is negative. This is a two-sided complex spectrum, not a one-sided real-signal spectrum; amplitudes are not doubled.</p>
      <p>hz is relative to the receiver frequency. Bins run in ascending order from negative Nyquist to the positive side, excluding positive Nyquist. At the usual 0.02 ms interval, the sampling frequency is 50 kHz and Nyquist is 25 kHz. Reversing the sign of Data 2 reverses the complex frequency direction.</p>
      <h2 id="window">Interval, window and normalization</h2>
      <p>The FFT interval is [startMs, endMs). Both endpoints are converted to sample indexes using the following expression, capping the end index at the total sample count. Δt is the sample interval. At least four selected samples are required; actualStartMs and actualEndExclusiveMs describe the resulting interval.</p>
      <MathFormula block tex={String.raw`n(t)=\left\lceil\frac{t}{\Delta t}-10^{-9}\right\rceil`} />
      <p>hann uses the following symmetric N-sample window. The rectangular window rect uses <MathFormula tex={String.raw`w_j=1`} />. Windowed data is padded to the next power of two M. Real, imaginary and amplitude values are normalized by the sum of window weights rather than the padded length.</p>
      <MathFormula block tex={String.raw`w_j=\frac{1}{2}\left(1-\cos\frac{2\pi j}{N-1}\right),\qquad 0\le j<N`} />
      <ReferenceTable headings={["Typical default analysis", "Value"]} rows={[
        ["Acquisition", "2048 samples, 0.02 ms spacing, 0–40.96 ms (end excluded)"],
        ["FFT interval", "1–5 ms (end excluded), 200 samples"],
        ["FFT size", "256 points after padding"],
        ["Bin spacing, spacingHz", <MathFormula key="spacing" tex={String.raw`\frac{1000}{256\times0.02}=195.3125\,\mathrm{Hz}`} />],
        ["Resolution estimate, resolutionHz", <MathFormula key="resolution" tex={String.raw`\frac{1000}{200\times0.02}=250\,\mathrm{Hz}`} />],
      ]} />
      <p>Zero padding refines frequency sampling without improving observation-time resolution. Window choice changes spectral broadening and leakage. Frequency display limits are separate from the time interval used for computation.</p>
      <h2 id="phase">Peak, amplitude and phase</h2>
      <p>analyzeMeasurement selects the maximum-amplitude FFT bin across all frequencies; ties choose the first bin in ascending order. evaluateFrequency and related functions restrict the search to a specified band. Reported peak frequencies are bin values, without interpolation.</p>
      <p>Phase uses the start of the selected interval as the time origin, without compensation to absolute acquisition time. Do not interpret phase at nearly zero amplitude. Amplitudes are arbitrary units; physical calibration depends on the apparatus.</p>
      <h2 id="common-phase">Common frequency and phase</h2>
      <p>Pulse calibration and T1 evaluate a complex component at one shared frequency, then subtract a common phase to obtain a signed real projection. They do not align every point independently, retaining pulse sign reversals and negative-to-positive T1 recovery. magnitude is phase-independent magnitude; quadrature is the orthogonal component.</p>
      <p>The automatic frequency maximizes summed squared FFT amplitudes, adjusting weights for duplicate scan values. Phase comes from strong points; the pulse sign is oriented positive at short lengths and T1 toward a positive recovery slope. Manual referenceIndex changes the phase reference only; frequency still comes from all points.</p>
      <h2 id="pulse">Pulse sine fitting</h2>
      <p>The signed and magnitude models are shown below. Here ℓ is length, the RF cycle count, and <MathFormula tex={String.raw`p_{180}=2p_{90}`} />. Candidates from measured peaks and crossings are distinct from least-squares estimates. Fitting is attempted from at least three points; candidates outside the measured range are extrapolations. Incoherent phase and low agreement produce warnings.</p>
      <MathFormula block tex={String.raw`S(\ell)=A\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)+B`} />
      <MathFormula block tex={String.raw`S_{\mathrm{mag}}(\ell)=A\left|\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)\right|+B`} />
      <h2 id="relaxation">T1 and T2 exponential fitting</h2>
      <ReferenceTable headings={["Property", "T1", "T2"]} rows={[
        ["Model", <MathFormula key="t1-model" tex={String.raw`S(\tau)=A-Be^{-\tau/T_1}`} />, <MathFormula key="t2-model" tex={String.raw`S(2\tau)=Ae^{-2\tau/T_2}`} />],
        ["Axis and fit range", "τ [ms]", "2τ [ms]"],
        ["Signal", "Signed projection at common phase", "Common-frequency complex magnitude in a moving echo window"],
        ["Background", "A is fitted", "Fixed at zero"],
      ]} />
      <p>T2 acquisition time begins after the second pulse; the echo center is at τ, and the analysis window follows it. A manual T2 referenceIndex selects the point that supplies the common frequency.</p>
      <p>Repeated τ values are averaged. Fits minimize squared residuals in the original signal values, not a straight line in log amplitude. T1 needs at least five distinct delays with both signal signs; T2 estimates from at least three nonnegative points. See the <Link href="/en/reference/api/relaxation#fits">fitting API</Link> for acceptance conditions.</p>
      <p>Inspect r2, rmse and warnings along with the estimate. Short-range estimates may be sensitive to the interval or phase reference. Fits never automatically change hardware parameters.</p>
      <h2 id="invalid-data">Invalid data</h2>
      <p>Incomplete pairs, NaN, Infinity, invalid time ranges and arithmetic overflow are errors. Invalid values are not replaced with zero, and intervals are not silently shortened for small records. Keep the raw data and display the error in the calling UI.</p>
    </DocumentationArticle>
  );
}
