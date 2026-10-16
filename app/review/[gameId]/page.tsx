import { GameReview } from "@/components/review/GameReview";
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameReview id={gameId} />;
}
