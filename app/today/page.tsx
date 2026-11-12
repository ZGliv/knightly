import type { Metadata } from "next";
import { TodayPage } from "@/components/today/TodayPage";

export const metadata: Metadata = {
  title: "Today | Knightly",
  description: "Your daily training session: puzzles, your own mistakes, your openings, a pro game and a game to play.",
};

export default function Page() {
  return <TodayPage />;
}
