import GamePracticePage from "@/components/learning/GamePracticePage";
import { LearningRoadmap } from "@/components/learning/LearningRoadmap";

// Existing game/ply links still open the exact saved-game decision.
export default async function LearnPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return query.game || query.ply ? <GamePracticePage /> : <LearningRoadmap />;
}
