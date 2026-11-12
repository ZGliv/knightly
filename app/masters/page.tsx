import type { Metadata } from "next";
import { MastersPage } from "@/components/masters/MastersPage";

export const metadata: Metadata = {
  title: "Play like the pros | Knightly",
  description:
    "Guess the moves of Magnus Carlsen and Hikaru Nakamura in real classical games, grouped by the kind of middlegame.",
};

export default function PlayLikeTheProsPage() {
  return <MastersPage />;
}
