import type { Metadata } from "next";
import { InsightsPage } from "@/components/insights/InsightsPage";

export const metadata: Metadata = {
  title: "Your leaks | Knightly",
  description:
    "Import your recent chess.com games, analyse them on this device and see where you lose the most.",
};

export default function YourLeaksPage() {
  return <InsightsPage />;
}
