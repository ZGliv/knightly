export function tokenize(fen: string): Float32Array;
export function historyTokens(fens: string[]): Float32Array;
export function policyIndex(uci: string, black: boolean): number;
export function chooseMove(logits: ArrayLike<number>, legalMoves: string[], black: boolean, random?: () => number): string;
