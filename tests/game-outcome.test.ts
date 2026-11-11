import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { gameOutcome } from '../lib/chess/game-outcome';
test('mate outcomes respect player side',()=>{
 const chess=new Chess(); for(const move of ['f3','e5','g4','Qh4#'])chess.move(move);
 assert.equal(gameOutcome({result:'0-1',playerColor:'black'},chess).title,'You won');
 assert.equal(gameOutcome({result:'0-1',playerColor:'white'},chess).title,'Stockfish won');
 assert.equal(gameOutcome({result:'0-1',playerColor:'white'},chess).reason,'Checkmate');
});
test('draws explain the actual ending and resignation keeps its result',()=>{
 const stalemate=new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
 assert.equal(gameOutcome({result:'1/2-1/2',playerColor:'white'},stalemate).reason,'Stalemate');
 const repeated=new Chess(); for(const move of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']) repeated.move(move);
 assert.equal(gameOutcome({result:'1/2-1/2',playerColor:'black'},repeated).reason,'Threefold repetition');
 assert.equal(gameOutcome({result:'0-1',playerColor:'white',training:{origin:'engine',initialElo:800,changed:false}},new Chess()).reason,'Resignation');
 assert.equal(gameOutcome({result:'1/2-1/2',playerColor:'white'},new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1')).reason,'Insufficient material');
});
