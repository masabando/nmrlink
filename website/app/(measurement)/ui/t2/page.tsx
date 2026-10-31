import type { Metadata } from "next";
import T2Measurement from "@/components/measurement/T2Measurement";
export const metadata: Metadata = {
  title: "NMRLink | T2測定 / T2 measurement",
};
export default function T2Page() {
  return <T2Measurement />;
}
