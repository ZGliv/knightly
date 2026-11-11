import { LEARNING_AREAS } from "@/lib/learning/areas";
import { SEQUENCES } from "@/lib/learning/sequences";

export function AreaGuide({ areaId }: { areaId: string }) {
  const area = LEARNING_AREAS.find(item => item.id === areaId)!;
  return <div className="space-y-4 pt-3 text-sm leading-6">
    {area.overview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    <div><h3 className="font-semibold">Watch for</h3><ul className="list-disc pl-5">{area.mistakes.map(item => <li key={item}>{item}</li>)}</ul></div>
    <div><h3 className="font-semibold">Before moving on</h3><ul className="list-disc pl-5">{area.checkpoints.map(item => <li key={item}>{item}</li>)}</ul><p>Use these as questions to answer in unfamiliar positions and your own games. One completed exercise is not a mastery test.</p></div>
    <div><h3 className="font-semibold">Lessons in this area</h3><ul className="list-disc pl-5">{area.lessons.map(id => <li key={id}><a className="underline underline-offset-4" href={`/learn?lesson=${id}`}>{SEQUENCES.find(lesson => lesson.id === id)!.title}</a></li>)}</ul></div>
    <p><strong>Further depth: </strong>{area.nextDepth}</p>
  </div>;
}
