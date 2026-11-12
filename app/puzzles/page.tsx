import type { Metadata } from "next";
import { PuzzlesPage } from "@/components/puzzles/PuzzlesPage";

export const metadata: Metadata = {
  title: "Puzzles | Knightly",
  description: "Rated tactics puzzles matched to your level, with missed puzzles coming back for review.",
};

export default function Page() {
  return <PuzzlesPage />;
}
