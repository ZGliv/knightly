import type { PlayerColor } from "@/types/game";
export const playerTurn = (color: PlayerColor) => color === "white" ? "w" : "b";
export const colorName = (color: PlayerColor) => color === "white" ? "White" : "Black";
export const opponentColor = (color: PlayerColor): PlayerColor => color === "white" ? "black" : "white";
export const isPlayerPly = (ply: number, color: PlayerColor) => ply > 0 && ply % 2 === (color === "white" ? 1 : 0);
export const moveLabel = (ply: number) => `${Math.ceil(ply / 2)}${ply % 2 ? "." : "…"}`;
