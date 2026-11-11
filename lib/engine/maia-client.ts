import { humanOpponent } from './strength';
import { Chess } from 'chess.js';
import type { EngineAnalysis } from './stockfish-client';
export type HumanStatus = 'idle' | 'loading' | 'thinking';

/** Isolated human-move engine. No full-strength fallback if its model fails. */
export class MaiaClient {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<number, {
    resolve: (result: EngineAnalysis) => void;
    reject: (error: Error) => void;
    legal: string[];
    timer: ReturnType<typeof setTimeout>;
  }>();
  private failure: Error | null = null;
  constructor(private onStatus: (status: HumanStatus) => void = () => {}) {
    this.worker = new Worker('/engine/maia/worker.mjs', {type:'module'});
    this.worker.onmessage = ({data}) => {
      const request = this.pending.get(data.id);
      if (!request) return;
      if (data.status === 'loading' || data.status === 'thinking') {
        this.onStatus(data.status);
        return;
      }
      if (data.error || !request.legal.includes(data.move)) {
        this.fail(new Error('Maia could not choose a move. Your position is saved; retry the engine.'));
        return;
      }
      clearTimeout(request.timer);
      this.pending.delete(data.id);
      if (!this.pending.size) this.onStatus('idle');
      request.resolve({bestMove:data.move,scoreCp:null,mateIn:null,depth:0,pv:[data.move]});
    };
    this.worker.onerror = this.worker.onmessageerror = () => this.fail(new Error('Maia could not load. Check your connection, then retry the engine.'));
  }
  analyzePosition(fen: string, elo: number, history?: string[]): Promise<EngineAnalysis> {
    if (this.failure) return Promise.reject(this.failure);
    if (!humanOpponent(elo)) return Promise.reject(new Error("Choose a supported opponent rating."));
    const board = new Chess(fen);
    const legal = board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
    if (!legal.length) return Promise.reject(new Error('No legal moves remain.'));
    const fens: string[] = [];
    if (history) {
      const replay = new Chess();
      fens.push(replay.fen());
      for (const move of history) {
        replay.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
        fens.push(replay.fen());
      }
      if (replay.fen() !== fen) return Promise.reject(new Error('Position history does not match the current board.'));
    } else fens.push(fen);
    const id = ++this.nextId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>this.fail(new Error('Maia took too long to load or respond. Your position is saved; retry the engine.')),60000);
      this.pending.set(id,{resolve,reject,legal,timer});
      this.worker.postMessage({id,fens:fens.slice(-8),elo,legalMoves:legal});
    });
  }
  private fail(error: Error) {
    if (this.failure) return;
    this.failure=error;
    for(const request of this.pending.values()) {clearTimeout(request.timer);request.reject(error);}
    this.pending.clear();
    this.onStatus('idle');
    this.worker.terminate();
  }
  terminate(){this.fail(new Error('Engine session ended.'));}
}
