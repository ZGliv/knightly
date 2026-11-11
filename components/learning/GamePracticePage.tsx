"use client";
import { markGameAssisted } from "@/lib/learning/adaptive-rating";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { listGamesLocal } from "@/lib/storage/local-games";
import { colorName, moveLabel } from "@/lib/chess/player";
import type { SavedGame } from "@/types/game";
import { recurringEvidence, CONTEXT_LABELS, decisionsFromGames, emptyCoach, inspectDecision, positionKey, recommendDecisions, sameDecision, type Decision, type DecisionAnalysis, type RetryAttempt } from "@/lib/learning/coach/model";
import { readCoach, saveAnalysis, saveRetry } from "@/lib/learning/coach/storage";
import { GameRetry } from "@/components/learning/GameRetry";

export default function LearnPage() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [games, setGames] = useState<SavedGame[]>([]);
  const [data, setData] = useState(emptyCoach);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [storeError, setStoreError] = useState("");
  const [scope, setScope] = useState("all");
  const [selected, setSelected] = useState<Decision | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [exerciseBusy, setExerciseBusy] = useState(false);
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null);
  const [scanNote, setScanNote] = useState("");
  const generation = useRef(0);
  const scanning = useRef(false);
  const engine = useEngine();
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const library = listGamesLocal(); setGames(library);
        const params = new URLSearchParams(location.search);
        const gameId = params.get("game"); const ply = Number(params.get("ply"));
        if (gameId && library.some((g) => g.id === gameId)) setScope(gameId);
        const direct = decisionsFromGames(library).find((s) => s.gameId === gameId && s.ply === ply);
        if (direct) { setSelected(direct); setSelectedReason("You chose this exact decision from your game. We’ll recheck it before asking you to try again."); }
      } catch (e) { setError((e as Error).message); }
      try { setData(readCoach()); } catch (e) { setStoreError((e as Error).message); }
      setReady(true);
    });
    // Intentional generation invalidation: cancel whatever work is current on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { alive = false; generation.current++; };
  }, []);
  const onAnalysis = useCallback((analysis: DecisionAnalysis) => {
    setNow(Date.now());
    try { setData(saveAnalysis(analysis)); }
    catch (e) {
      setStoreError((e as Error).message || "Coach progress could not be saved.");
      setData((prior) => ({ ...prior, analyses: [...prior.analyses.filter((a) => a.source.id !== analysis.source.id), analysis].slice(-200) }));
    }
  }, []);
  const onAttempt = useCallback((attempt: RetryAttempt) => {
    setNow(Date.now());
    try { setData(saveRetry(attempt)); }
    catch (e) {
      setStoreError((e as Error).message || "This attempt could not be saved.");
      setData((prior) => ({ ...prior, attempts: [...prior.attempts, attempt].slice(-500) }));
    }
  }, []);
  const sources = useMemo(() => decisionsFromGames(games), [games]);
  const analyses = useMemo(() => data.analyses.filter((a) => sources.some((s) => sameDecision(s, a.source))), [data.analyses, sources]);
  const attempts = data.attempts.filter((a) => sources.some((s) => s.playerColor === a.playerColor && s.id === a.decisionId && s.fenBefore === a.fenBefore && s.playedUci === a.playedUci));
  const recommendations = recommendDecisions(analyses, attempts, now, selected?.id);
  const patterns = recurringEvidence(analyses);
  const pending = sources.filter((s) => (scope === "all" || s.gameId === scope) && !analyses.some((a) => sameDecision(a.source, s)));
  const scopedCount = sources.filter((s) => scope === "all" || s.gameId === scope).length;
  async function scanGames() {
    if (scanning.current || exerciseBusy || engine.status !== "ready") return;
    const batch = pending.slice(0, 12);
    if (!batch.length) return;
    scanning.current = true; const token = ++generation.current;
    setSelected(null); setError(""); setScanNote(""); setScan({ done: 0, total: batch.length });
    try {
      for (let index = 0; index < batch.length; index++) {
        if (games.find(game => game.id === batch[index].gameId)?.result === "*") markGameAssisted(batch[index].gameId);
        const analysis = await inspectDecision(batch[index], engine.analyze, () => generation.current === token);
        if (generation.current !== token) return;
        onAnalysis(analysis); setScan({ done: index + 1, total: batch.length });
      }
      setScanNote(`Checked ${batch.length} of your decisions. ${pending.length > batch.length ? "Scan the next batch whenever you’re ready." : "Your available decisions in this selection are checked."}`);
    } catch (e) { if (generation.current === token) setError((e as Error).message); }
    finally { if (generation.current === token) { scanning.current = false; setScan(null); } }
  }
  function stopScan() {
    generation.current++; scanning.current = false; setScan(null);
    setScanNote("Scan stopped. Finished decisions are saved; the interrupted search was discarded."); engine.restart();
  }
  function choose(source: Decision, reason: string) { if (exerciseBusy || scan) return; try { if (games.find(game => game.id === source.gameId)?.result === "*") markGameAssisted(source.gameId); } catch(e) { setError((e as Error).message); return; } setSelected(source); setSelectedReason(reason); }
  function next() {
    const candidate = recommendations.find((r) => !selected || positionKey(r.analysis.source.fenBefore) !== positionKey(selected.fenBefore));
    if (candidate) choose(candidate.analysis.source, candidate.reason);
    else { setSelected(null); setSelectedReason(""); }
  }
  if (!ready) return <p role="status">Opening your game notebook…</p>;
  return <section className="game-practice-page space-y-4 md:space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="eyebrow">Study · Your games</p><h1 className="mt-2 text-2xl font-semibold md:text-4xl">Game practice</h1><p className="mt-3 hidden max-w-2xl text-sm leading-6 text-zinc-400 md:block">Scan your games, then replay the decisions worth reviewing.</p></div>
      <Link href="/study" className="text-sm text-emerald-300 underline">Library</Link>
    </header>
    {storeError && <div className="panel space-y-2 text-sm text-amber-200" role="alert"><p>{storeError} You can continue in this session; new progress may not survive a reload.</p></div>}
    {error && <p role="alert" className="panel text-sm text-amber-200">{error}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {selected ? <GameRetry key={selected.id} source={selected} reason={selectedReason} onAnalysis={onAnalysis} onAttempt={onAttempt} onBusy={setExerciseBusy} onNext={next} /> : <div className="panel space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-300">{recommendations.length ? "Ready to revisit" : "Start with your own games"}</p>
          <h2 className="text-2xl font-semibold">{recommendations.length ? "Next decision" : games.length ? "Choose a game to scan" : "Start with a game"}</h2>
          <p className="text-sm leading-6 text-zinc-300">{recommendations[0]?.reason ?? (games.length ? "Scan your saved games, including imported PGNs. Stockfish compares your moves with the positions before them, then gives you the exact board to retry." : "Your coach builds practice from decisions you actually made. Start a game here, or import a PGN from your game library. Choose the side you played when importing.")}</p>
          {recommendations[0] && <button className="btn" disabled={!!scan} onClick={() => choose(recommendations[0].analysis.source, recommendations[0].reason)}>Retry move {Math.ceil(recommendations[0].analysis.source.ply / 2)} from your game</button>}
          {!games.length && <div className="flex flex-wrap gap-2"><Link href="/play" className="btn">Play a game</Link><Link href="/games" className="btn secondary">Import a PGN</Link></div>}
          {analyses.length > 0 && !recommendations.length && <p className="text-sm text-emerald-200">No clear retry candidate in the checked decisions. That is limited evidence, not a claim that every move was perfect. Scan more moves or play another game.</p>}
        </div>}
      </div>
      <aside className="space-y-4">
        {patterns.length > 0 && <section className="panel space-y-4"><h2 className="font-semibold">Patterns worth practicing</h2><p className="text-xs leading-5 text-zinc-400">Situations found in your analyzed moves. Each position counts once.</p>{patterns.map((group) => <div key={group.lesson} className="border-t border-zinc-800 pt-3"><h3 className="text-sm font-semibold text-emerald-200">{group.title}</h3><p className="mt-1 text-xs text-zinc-400">{group.positions} distinct position{group.positions === 1 ? "" : "s"} across {group.games} game{group.games === 1 ? "" : "s"}{group.positions < 2 ? " · One observation so far" : " · Recurring situation"}</p><p className="mt-2 text-sm leading-6 text-zinc-300">{group.principle}</p><Link className="mt-2 inline-block text-sm text-emerald-300 underline" href={`/learn/foundations?lesson=${group.lesson}&color=${group.examples[0].source.playerColor}&game=${encodeURIComponent(group.examples[0].source.gameId)}`}>Learn the idea, then try a different position</Link><div className="mt-2 flex flex-wrap gap-3">{group.examples.slice(0, 2).map((example) => <Link className="text-xs text-zinc-400 underline" key={example.source.id} href={`/review/${example.source.gameId}`}>Source: move {moveLabel(example.source.ply)} · {colorName(example.source.playerColor)}</Link>)}</div></div>)}</section>}

        {games.length > 0 && <section className="panel space-y-3">
          <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">Learn from your games</h2><span className="text-xs text-zinc-400">Your moves</span></div>
          <label className="block text-xs text-zinc-400">Games to scan<select aria-label="Games to scan" className="field mt-2 w-full" disabled={!!scan || exerciseBusy} value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">Latest 10 games · up to 200 player decisions</option>{games.slice(0, 10).map((g) => <option value={g.id} key={g.id}>{new Date(g.createdAt).toLocaleDateString()} · {g.openingName} · You: {colorName(g.playerColor)} · {g.moves.length} plies</option>)}</select></label>
          <p className="text-xs leading-5 text-zinc-400">Only moves from your saved player side are scanned.</p>
          <p className="text-sm text-zinc-300">{scopedCount - pending.length} of {scopedCount} decisions checked · {pending.length} still available</p>
          {scan ? <><p role="status" className="text-sm text-emerald-300">Comparing decision {Math.min(scan.done + 1, scan.total)} of {scan.total}…</p><progress className="w-full accent-emerald-400" value={scan.done} max={scan.total} aria-label="Game scan progress" /><button className="btn secondary" onClick={stopScan}>Stop scan</button></> : <button className="btn secondary" disabled={!pending.length || engine.status !== "ready" || exerciseBusy} onClick={() => void scanGames()}>{pending.length ? `Scan ${Math.min(pending.length, 12)} decisions` : "Available decisions checked"}</button>}
          {scanNote && <p role="status" className="text-xs leading-5 text-zinc-400">{scanNote}</p>}
          {engine.status === "loading" && <p role="status" className="text-xs text-zinc-400">Loading Stockfish on your device…</p>}
          {engine.status === "error" && <div role="alert" className="space-y-2 text-sm text-amber-200"><p>{engine.error}</p><button className="btn secondary" onClick={engine.restart}>Retry scan engine</button></div>}
          <details className="text-xs leading-5 text-zinc-500"><summary>Scan limits</summary><p className="mt-2">Up to 12 decisions per scan, within the latest 200 player decisions across ten games. Source games are preserved.</p></details>
        </section>}
        {recommendations.length > 0 && <section className="panel space-y-3"><h2 className="font-semibold">From your games</h2><p className="text-xs leading-5 text-zinc-400">{recommendations.length} decision{recommendations.length === 1 ? "" : "s"} to revisit. Open a decision to try it again.</p><div className="space-y-2">{recommendations.slice(0, 5).map((r) => <button key={r.analysis.source.id} disabled={exerciseBusy || !!scan} aria-pressed={selected?.id === r.analysis.source.id} className={`w-full rounded-lg border p-3 text-left text-sm disabled:opacity-50 ${selected?.id === r.analysis.source.id ? "border-emerald-400 bg-emerald-500/10" : "border-zinc-700 hover:bg-zinc-800"}`} onClick={() => choose(r.analysis.source, r.reason)}><span className="flex justify-between gap-2"><strong>Move {moveLabel(r.analysis.source.ply)} · {colorName(r.analysis.source.playerColor)} · {r.analysis.source.playedSan}</strong><span className="text-xs text-zinc-400">{r.due ? "Ready" : `Revisit ${new Date(r.dueAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}</span></span><span className="mt-1 block text-xs text-zinc-400">{CONTEXT_LABELS[r.analysis.context]} · {new Date(r.analysis.source.date).toLocaleDateString()}</span></button>)}</div></section>}
        {attempts.length > 0 && <section className="panel"><h2 className="font-semibold">What happened when you tried?</h2><ul className="mt-3 space-y-3">{attempts.slice(-4).reverse().map((a) => <li key={a.id} className="flex items-start justify-between gap-3 text-sm"><div><p>Move {moveLabel(a.ply)} · {colorName(a.playerColor)} · {a.triedSan || "walkthrough"}</p><p className="mt-1 text-xs text-zinc-500">{a.hints} help steps · {a.misses} retries</p></div><span className={a.outcome === "independent" ? "text-emerald-300" : "text-amber-200"}>{a.outcome === "independent" ? "Independent replay" : a.outcome === "supported" ? "With support" : "Not yet"}</span></li>)}</ul></section>}
        <details className="px-1 text-xs leading-5 text-zinc-400"><summary className="cursor-pointer text-sm font-medium text-zinc-200">How your coach adapts</summary><div className="mt-3 space-y-3"><p>Practice comes from the latest 200 legally replayed player decisions across your latest ten games. A fresh short search must still find at least a 1.00 evaluation drop or a lost/allowed mating line before the position becomes an exercise.</p><p>Legal alternatives within 0.50 of the reference evaluation are accepted, even if they differ from Stockfish’s first choice. Matching its preferred move is accepted for ordinary scores when short searches disagree. Conflicting mate evidence is left ungraded.</p><p>New decisions are prioritized. After support, a different position with the same observable context gets priority. Supported decisions become due after 15 minutes; independent replays after 1, 3 and 7 days as successes are spaced at least a day apart. Same-day repetitions do not lengthen the interval. These intervals are scheduling rules, not validated measures of memory or ability.</p><p>Replaying a known answer is not proof of transfer. No Elo, mastery or zone-of-proximal-development score is claimed. The engine line shows one continuation.</p><p>Everything stays in this browser. The latest 200 checked decisions and 500 retry attempts are kept separately from your games.</p><a className="underline" href="https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html">Stockfish search and score documentation</a></div></details>
      </aside>
    </div>
  </section>;
}
