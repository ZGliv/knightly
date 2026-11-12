import type { Metadata } from "next";
import { Suspense } from "react";
import { PuzzlesPage } from "@/components/puzzles/PuzzlesPage";

export const metadata: Metadata = {
  title: "Puzzles | Knightly",
  description: "Rated tactics puzzles matched to your level, with missed puzzles coming back for review.",
};

export default function Page() {
  // PuzzlesPage reads ?theme= with useSearchParams, which needs a Suspense boundary on a static page.
  return (
    <Suspense
      fallback={
        <section className="pz-page">
          <h1>Puzzles</h1>
          <p className="pz-muted" role="status">Loading puzzles…</p>
        </section>
      }
    >
      <PuzzlesPage />
    </Suspense>
  );
}
