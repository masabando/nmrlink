import type { Metadata } from "next";
import DocumentLayout from "@/components/DocumentLayout";

export const metadata: Metadata = {
  title: { default: "NMRLink", template: "%s | NMRLink" },
  description: "A JavaScript library for controlling an educational NMR apparatus from your browser.",
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <DocumentLayout locale="en">{children}</DocumentLayout>;
}
