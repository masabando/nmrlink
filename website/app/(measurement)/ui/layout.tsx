import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { InstrumentProvider } from "@/components/measurement/InstrumentProvider";
import "@/app/globals.css";

const font = Noto_Sans_JP({ subsets: ["latin"], display: "swap" });
export const metadata: Metadata = {
  title: "NMRLink | Measurement",
  description: "NMR measurement, FID and FFT analysis.",
};

// 測定画面は文書と別のレイアウト。今後の測定ページでも装置接続を共有します。
export default function MeasurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={font.className}>
        <InstrumentProvider>{children}</InstrumentProvider>
      </body>
    </html>
  );
}
