import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {continueWithMaia} from '../lib/engine/strength';
import {recordGame,validateGame} from '../lib/chess/game-record';
test('resumed high and legacy games keep original moves and mark changed strength evidence',()=>{
 const board=new Chess();board.move('e4');
 const legacy={...recordGame(board),engineLevel:17};
 const migrated=continueWithMaia(legacy);
 assert.equal(migrated.engineLevel,17);assert.equal(migrated.engineElo,800);
 assert(migrated.training?.changed);assert.equal(migrated.pgn,legacy.pgn);
 const high={...legacy,engineElo:2200,training:{origin:'engine' as const,initialElo:2200,changed:false,policy:'maia3-5m-v1' as const}};
 const next=continueWithMaia(high);
 assert.equal(next.engineElo,2200);assert(next.training?.changed);
 assert.deepEqual(next.moves,high.moves);assert.equal(validateGame(next).training?.policy,'maia3-5m-v2');
});
test('previous Maia games retain their usable training evidence on continuation',()=>{
 const game={...recordGame(new Chess()),engineElo:800,training:{origin:'engine' as const,initialElo:800,changed:false,policy:'maia3-5m-v1' as const}};
 assert.equal(continueWithMaia(game).training?.changed,false);
 assert.equal(game.training.policy,'maia3-5m-v1');
});
