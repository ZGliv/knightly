import type { Metadata } from "next";
import { OpeningsPage } from "@/components/openings/OpeningsPage";

export const metadata: Metadata = {
  title: "Your openings | Knightly",
  description:
    "See the openings you actually play in your chess.com games, choose your moves and drill them against your real opponents' replies.",
};

export default function Page() {
  return <OpeningsPage />;
}
