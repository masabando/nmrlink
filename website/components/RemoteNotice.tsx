import Link from "next/link";
import type { Locale } from "@/lib/languages";

export default function RemoteNotice({ locale }: { locale: Locale }) {
  return (
    <div className="my-6 rounded-box border border-warning/40 bg-warning/10 p-4">
      <strong className="badge badge-warning">{locale === "ja" ? "未検証" : "Unverified"}</strong>
      {locale === "ja" ? (
        <p>遠隔接続は実環境での動作確認ができていません。現時点での利用はお控えください。実機を使う場合は<Link href="/guide/standard">直接接続の標準Web UI</Link>をご利用ください。</p>
      ) : (
        <p>Remote operation has not been tested in a real environment. Please avoid using it for now. For hardware measurements, use the <Link href="/en/guide/standard">direct-connection standard Web UI</Link>.</p>
      )}
    </div>
  );
}
