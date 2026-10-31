import { diagnosticMessage } from "../../examples/shared/diagnostics.js";

export function previewErrorMessage(error, locale = "ja") {
  const message = diagnosticMessage(error, locale);
  if (message !== null) return message;
  // Browser/OS errors vary. Keep technical details in the console, not in the translated UI.
  console.warn("NMRLink preview:", error);
  return locale === "en"
    ? "Check the input or file and try again. See the browser console for technical details."
    : "入力内容やファイルを確認して、もう一度お試しください。詳細はブラウザのコンソールで確認できます。";
}

// Native validation bubbles use the browser's language, which may differ from the page.
// Show these checks in the preview's status area instead.
export function previewFormError(form, locale = "ja") {
  let first = null;
  for (const input of form.elements) {
    if (!input.willValidate) continue;
    input.removeAttribute("aria-invalid");
    if (!input.validity.valid && !first) first = input;
  }
  if (!first) return null;
  first.setAttribute("aria-invalid", "true");
  first.focus();
  const label = first.labels?.[0]?.textContent.trim() || first.name;
  const validity = first.validity;
  const en = locale === "en";
  let message;
  if (validity.badInput) message = en ? "Enter a number." : "数値を入力してください。";
  else if (validity.valueMissing) message = en ? "Enter a value." : "値を入力してください。";
  else if (validity.rangeUnderflow) message = en ? `Enter a value of at least ${first.min}.` : `${first.min}以上の値を入力してください。`;
  else if (validity.rangeOverflow) message = en ? `Enter a value no greater than ${first.max}.` : `${first.max}以下の値を入力してください。`;
  else if (validity.stepMismatch) message = en ? `Use increments of ${first.step} from ${first.min || "0"}.` : `${first.min || "0"}を基準に${first.step}刻みで入力してください。`;
  else message = en ? "Check this value." : "入力値を確認してください。";
  return `${label}: ${message}`;
}
