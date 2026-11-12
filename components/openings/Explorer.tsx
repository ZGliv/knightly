"use client";
import { ChessBoard } from "@/components/chess/ChessBoard";
import type { PlayerColor } from "@/types/game";
import { chooseMove, playUci, removeLine, type RepertoireData } from "@/lib/openings/repertoire";
import { positionKey, scorePercent, topOpening, TREE_PLIES, turnOf, type OpeningTree } from "@/lib/openings/tree";
import { EngineCheck } from "./EngineCheck";
import { boardMoveUci, fenOf, legalTargets, moveNumber, percent, plural, type PathStep } from "./shared";

interface Props {
  tree: OpeningTree;
  color: PlayerColor;
  data: RepertoireData;
  onChange: (next: RepertoireData) => void;
  path: PathStep[];
  onPath: (path: PathStep[]) => void;
}

/** Browse what the player actually plays, and choose one move for each position where it is his turn. */
export function Explorer({ tree, color, data, onChange, path, onPath }: Props) {
  const fen = fenOf(path);
  const key = positionKey(fen);
  const node = tree.nodes[key];
  const turn = turnOf(fen);
  const mine = turn === color;
  const chosen = mine ? data.moves[key] : undefined;
  const moves = node?.moves ?? [];
  const played = moves.reduce((sum, m) => sum + m.count, 0);
  const usual = mine ? moves[0] : undefined;
  const opening = node ? topOpening(node) : null;
  const score = node ? scorePercent(node.points, node.games) : null;
  const inOpening = path.length < TREE_PLIES;
  const history = path.map((step) => step.uci);

  function go(uci: string) {
    const next = playUci(fen, uci);
    if (next) onPath([...path, { uci, san: next.san, fen: next.fen }]);
  }

  function choose(uci: string, follow = true) {
    const next = chooseMove(data, fen, uci);
    if (!next) return;
    onChange(next);
    if (follow) go(uci);
  }

  async function boardMove(from: string, to: string, promotion?: string) {
    const uci = boardMoveUci(fen, from, to, promotion);
    if (!uci) return false;
    // On his turn, playing a move on the board makes it his choice; on the opponent's it just explores.
    if (mine) choose(uci);
    else go(uci);
    return true;
  }

  const checkMove = chosen ?? (usual ? { uci: usual.uci, san: usual.san } : null);

  return (
    <div className="op-layout">
      <div className="op-board">
        <ChessBoard
          key={fen}
          fen={fen}
          playerColor={turn}
          activeColor={turn}
          orientation={color}
          canInteract={inOpening}
          isMoveLegal={(from, to) => legalTargets(fen, from).includes(to)}
          getLegalTargets={(from) => legalTargets(fen, from)}
          lastMove={path.at(-1)?.uci}
          suggestion={chosen?.uci ?? null}
          onMove={boardMove}
        />
        <div className="op-path" aria-label="Moves so far">
          <button className="op-chip" onClick={() => onPath([])} disabled={!path.length}>
            Start
          </button>
          {path.map((step, i) => (
            <button
              key={i}
              className={`op-chip ${i === path.length - 1 ? "is-current" : ""}`}
              onClick={() => onPath(path.slice(0, i + 1))}
            >
              {moveNumber(i)} {step.san}
            </button>
          ))}
          {path.length > 0 && (
            <button className="op-chip" onClick={() => onPath(path.slice(0, -1))}>
              ← Back
            </button>
          )}
        </div>
      </div>

      <section className="op-panel">
        <div className="op-position">
          <p className="eyebrow">{mine ? "Your move" : "Opponent's move"}</p>
          {opening && <h2 className="op-opening">{opening.name}</h2>}
          <p className="op-note">
            {node && node.games > 0
              ? `${plural(node.games, "of your games")} reached this position. You scored ${score}% from here (a win counts 1, a draw a half).`
              : "None of your imported games reached this position."}
            {opening && node && opening.count < node.games ? ` The name is the one most of these games ended up with.` : ""}
          </p>
        </div>

        {!inOpening && <p className="op-note">This is the end of the first 12 moves, where this trainer stops.</p>}

        {inOpening && mine && (
          <>
            <h3 className="op-h3">What you play here</h3>
            {moves.length > 0 ? (
              <ul className="op-moves">
                {moves.map((m) => {
                  const isChosen = chosen?.uci === m.uci;
                  return (
                    <li key={m.uci} className={`op-move ${isChosen ? "is-chosen" : ""}`}>
                      <button className="op-move-main" onClick={() => go(m.uci)}>
                        <span className="op-san">{m.san}</span>
                        <span className="op-bar" aria-hidden>
                          <span style={{ width: `${percent(m.count, played)}%` }} />
                        </span>
                        <span className="op-stat">
                          {percent(m.count, played)}% · {plural(m.count, "game")} · scored {scorePercent(m.points, m.count)}%
                        </span>
                      </button>
                      {isChosen ? (
                        <span className="op-badge">Your choice</span>
                      ) : (
                        <button className="btn secondary op-small" onClick={() => choose(m.uci, false)}>
                          Choose
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="op-note">You have not played from this position in your imported games.</p>
            )}

            {chosen ? (
              <div className="op-choice">
                <p>
                  Your prepared move: <strong>{chosen.san}</strong>
                  {usual && usual.uci !== chosen.uci ? ` (you usually play ${usual.san})` : ""}
                </p>
                <div className="op-actions">
                  <button className="btn secondary op-small" onClick={() => go(chosen.uci)}>
                    Follow {chosen.san}
                  </button>
                  <button className="btn secondary op-small" onClick={() => onChange(removeLine(data, fen))}>
                    Remove this line
                  </button>
                </div>
                <p className="op-note">Removing the line also removes the moves you prepared further down it.</p>
              </div>
            ) : (
              <div className="op-choice">
                {usual ? (
                  <button className="btn" onClick={() => choose(usual.uci, false)}>
                    Adopt {usual.san}, your most played move
                  </button>
                ) : null}
                <p className="op-note">
                  {usual ? "Or play" : "Play"} any move on the board to make it your prepared move here.
                </p>
              </div>
            )}

            {checkMove && (
              <EngineCheck
                key={`${key}|${checkMove.uci}`}
                fen={fen}
                history={history}
                move={checkMove}
                color={color}
                habitual={usual?.uci === checkMove.uci && (usual?.count ?? 0) >= 2}
              />
            )}
          </>
        )}

        {inOpening && !mine && (
          <>
            <h3 className="op-h3">How opponents answered</h3>
            {moves.length > 0 ? (
              <ul className="op-moves">
                {moves.map((m) => {
                  const prepared = !!data.moves[m.childKey];
                  return (
                    <li key={m.uci} className="op-move">
                      <button className="op-move-main" onClick={() => go(m.uci)}>
                        <span className="op-san">{m.san}</span>
                        <span className="op-bar" aria-hidden>
                          <span style={{ width: `${percent(m.count, played)}%` }} />
                        </span>
                        <span className="op-stat">
                          {percent(m.count, played)}% · {plural(m.count, "game")} · you scored {scorePercent(m.points, m.count)}%
                        </span>
                      </button>
                      <span className={`op-badge ${prepared ? "" : "is-muted"}`}>{prepared ? "Prepared" : "No answer yet"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="op-note">No opponent of yours has played from here. Play a move on the board to explore it anyway.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
