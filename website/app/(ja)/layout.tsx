import type { Metadata } from "next";
import DocumentLayout from "@/components/DocumentLayout";

export const metadata: Metadata = {
  title: { default: "NMRLink", template: "%s | NMRLink" },
  description: "学生実験用NMR装置をブラウザから操作するJavaScriptライブラリ。",
};

export default function JapaneseLayout({ children }: { children: React.ReactNode }) {
  return <DocumentLayout locale="ja">{children}</DocumentLayout>;
}
