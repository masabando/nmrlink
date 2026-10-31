import type { Metadata } from "next";
import FrequencyMeasurement from "@/components/measurement/FrequencyMeasurement";
export const metadata: Metadata = {
  title: "NMRLink | 周波数調整 / Frequency tuning",
};

export default function FrequencyPage() {
  return <FrequencyMeasurement />;
}
