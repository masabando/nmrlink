import type { Metadata } from "next";
import T1Measurement from "@/components/measurement/T1Measurement";
export const metadata: Metadata = {
  title: "NMRLink | T1測定 / T1 measurement",
};
export default function T1Page() {
  return <T1Measurement />;
}
