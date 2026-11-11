import Link from "next/link";
export default function AboutPage() {
  return (
    <section className="about-page">
      <Link className="subtle-link" href="/play">
        ← Back to Play
      </Link>
      <h1>About Knightly</h1>
      <h2>Opponent difficulty</h2>
      <p>
        The Elo choices are approximate difficulty targets, not a rating
        measured against Chess.com players. They condition a human-move model;
        they do not certify its playing strength in a particular rating pool.
      </p>
      <p>
        At every opponent level, Maia-3 predicts moves from human games at the selected Lichess
        rating, with both players conditioned on that rating. Knightly samples
        that learned distribution directly, without inserting random blunders or
        overriding its choices with Stockfish. This models human tendencies;
        it does not certify a match rating or translate directly to Chess.com.
        Stockfish is used only for hints, analysis and review, always at full
        strength. The standard choices range from 400 to 2400; existing saved
        custom rating targets are retained.
      </p>
      <p>
        Maia runs locally in a separate browser worker. Its first use downloads
        approximately 34 MB of model and runtime files; no game is sent to an AI
        service. If loading fails, retry rather than silently switching opponents.
        <a href="https://github.com/CSSLab/maia3"> Maia-3 research and source</a>,
        <a href="/engine/maia/LICENSE.txt"> engine license</a> and
        <a href="/engine/maia/source.zip"> corresponding engine source and build instructions</a>.
      </p>
      <h2>Your working level</h2>
      <p>
        Auto difficulty starts at about 800 and learns from your completed games
        against a known, unchanged opponent setting. Wins, draws and losses move
        the estimate gradually, by at most 50 points per game. The new target
        applies when you start your next game. You can choose a manual level anytime.
      </p>
      <p>
        Coaching-assisted games, very short unfinished contests, imports and older
        games without reliable difficulty records do not affect the estimate.
        The displayed range is a rough training guide, not a calibrated rating or
        statistical confidence interval. Games against previous Stockfish opponents
        no longer set the human-style opponent’s level; their moves, reviews and
        study recommendations remain saved. A resumed game that changes opponent
        policy is also excluded from level estimation. Previous Maia games still
        count. Older games with only a Stockfish skill number resume at 800,
        which you can change; that skill number is not a human rating.
      </p>
      <h2>Your learning path</h2>
      <p>
        Study looks for explainable mistakes in your own moves. A recurring pattern
        needs different positions in at least two games. Recommendations may begin
        with a prerequisite, then give the idea time to settle after independent
        practice. Basics, Intermediate and Advanced remain open throughout.
        Progress means solving a different position without help; it is evidence
        of practice, not proof of mastery. Later revisits are part of the course.
      </p>
      <h2>Material and analysis</h2>
      <p>
        The +/− count compares material on the board: pawn 1, knight or bishop
        3, rook 5, queen 9. Promotions change this balance. It is separate from
        Stockfish’s evaluation of the position.
      </p>
      <h2>Open-source engine</h2>
      <p>
        Stockfish 18 lite is distributed under GPL v3.{" "}
        <a href="/engine/COPYING.txt">Read the license</a>,{" "}
        <a href="https://github.com/nmrugg/stockfish.js/tree/082eeba46b0c5f8f8065e5386750aa0ecfa2062c">
          corresponding source and build instructions
        </a>
        , or{" "}
        <a href="https://github.com/nmrugg/stockfish.js/archive/082eeba46b0c5f8f8065e5386750aa0ecfa2062c.tar.gz">
          download the source
        </a>
        .
      </p>
      <h2>Board appearance</h2>
      <p>
        The board uses the standard green colors and Neo piece images served by
        Chess.com. <a href="/pieces/neo/sources.json">Piece-image sources</a>.
      </p>
    </section>
  );
}
