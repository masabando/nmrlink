import { legacyHomeSections } from "@/lib/legacy-redirects.mjs";

// トップページはURLを変えず、旧 #section-* の位置を新しい節に引き継ぎます。
export default function LegacyHomeAnchors({ section }: { section: string }) {
  return Object.entries(legacyHomeSections)
    .filter(([, target]) => target === section)
    .map(([id]) => (
      <span
        key={id}
        id={id}
        aria-hidden="true"
        className="block scroll-mt-24"
      />
    ));
}
