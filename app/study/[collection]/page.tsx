import { notFound } from "next/navigation";
import { StudyDetail } from "@/components/library/StudyDetail";
import { COLLECTIONS, OPENINGS } from "@/lib/library/catalog";
export function generateStaticParams() {
  return [...COLLECTIONS, ...OPENINGS].map((item) => ({ collection: item.id }));
}
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  if (![...COLLECTIONS, ...OPENINGS].some((item) => item.id === collection))
    notFound();
  return <StudyDetail key={collection} id={collection} />;
}
