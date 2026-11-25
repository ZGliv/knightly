import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CoursePage } from "@/components/courses/CoursePage";
import { isCourseId } from "@/lib/courses/load";

export const metadata: Metadata = {
  title: "Opening course | Knightly",
  description: "Learn an opening line by line, then practise, drill and race the clock.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCourseId(id)) notFound();
  // CoursePage reads ?mode= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<section className="cr-page"><p className="cr-muted" role="status">Loading course…</p></section>}>
      <CoursePage key={id} id={id} />
    </Suspense>
  );
}
