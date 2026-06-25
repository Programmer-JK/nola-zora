// ─── Local game ──────────────────────────────────────────────

export type LocalLiarMode = 'normal' | 'fake';

export type LocalLiarPhase =
  | 'category-select'
  | 'role-reveal'
  | 'discussing'
  | 'liar-guess'
  | 'reveal';

export interface LocalLiarState {
  playerCount: number;
  liarCount: number;
  mode: LocalLiarMode;

  category: string;
  word: string;
  liarWord: string;
  liarIdxs: number[];  // 라이어 플레이어 인덱스 목록

  phase: LocalLiarPhase;

  revealPlayerIdx: number;
  roleShowing: boolean;

  liarGuess: string | null;
  liarGuessCorrect: boolean | null;
}

// ─── Online game ─────────────────────────────────────────────

export type OnlineLiarMode = 'normal' | 'fake';

export type OnlineLiarPhase =
  | 'category-select'
  | 'waiting'
  | 'liar-guess'
  | 'result';

export interface OnlineLiarPlayer {
  name: string;
  clientId: string;
}

export interface OnlineLiarGameState {
  players: OnlineLiarPlayer[];
  phase: OnlineLiarPhase;
  mode: OnlineLiarMode;
  liarCount: number;

  category: string;
  word: string;
  liarWord: string;
  liarIdxs: number[];

  liarGuess: string | null;
  liarGuessCorrect: boolean | null;
  votes: Record<string, string>; // voterClientId → suspectedClientId
}
