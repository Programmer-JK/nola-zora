export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type RoundResult = {
  round: number;
  p0Tile: TileValue;
  p1Tile: TileValue;
  outcome: 'p0' | 'p1' | 'draw';
};

// 두 플레이어 동시 선택: selecting → revealing → (selecting | match-over)
export type GamePhase = 'selecting' | 'revealing' | 'match-over';

export type PlayerState = {
  id: string;
  name: string;
  remainingTiles: TileValue[];
  selectedTile: TileValue | null;
  roundWins: number;
  gameWins: number;
};

export type GameState = {
  players: [PlayerState, PlayerState];
  currentRound: number;
  phase: GamePhase;
  roundResults: RoundResult[];
  currentGameNumber: number;
  matchWinnerId: string | null;
  firstPlayerIdx: number; // 0 or 1 — 선(攻) 플레이어
};
