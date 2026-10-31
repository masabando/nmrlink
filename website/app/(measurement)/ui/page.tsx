import type { Metadata } from "next";
import StandardMeasurement from "@/components/measurement/StandardMeasurement";
export const metadata: Metadata = { title: "NMRLink | 標準測定 / Measurement" };

export default function MeasurementPage() {
  return <StandardMeasurement />;
}
