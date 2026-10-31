import type { Metadata } from "next";
import PulseCalibration from "@/components/measurement/PulseCalibration";
export const metadata: Metadata = {
  title: "NMRLink | パルス校正 / Pulse calibration",
};
export default function PulsePage() {
  return <PulseCalibration />;
}
