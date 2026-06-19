export type AbraTargeting =
  | 'all_dice' | 'all' | 'self_dice' | 'self'
  | 'reveal' | 'neighbors' | 'left' | 'right';

export type AbraSpell = {
  num: number;
  en: string;
  kr: string;
  emoji: string;
  color: string;
  targeting: AbraTargeting;
  effect: string;
};

export type AbraPlayer = {
  name: string;
  clientId: string; // '' for local
  hp: number;
  tiles: number[];
  secretRevealed: number[];
  usedICansee: boolean;
  eliminated: boolean;
  dot: string;
};

export type AbraLogEntry = {
  who: number;
  name: string;
  txt: string;
};

export type AbraCastResult = {
  spellNum: number;
  success: boolean;
  lines: string[];
  diceRoll: number | null;
  revealedTile: number | null;
};

export type AbraPhase = 'game' | 'round-end' | 'game-end';

export type AbraGameState = {
  players: AbraPlayer[];
  deck: number[];
  secretPile: number[];
  maxHp: number;
  combo: number | null;
  currentIdx: number;
  turn: number;
  round: number;
  goalScore: number;
  scores: number[];
  log: AbraLogEntry[];
  pendingCast: AbraCastResult | null;
  phase: AbraPhase;
  roundScores: number[] | null; // set by scoreRound, cleared on new round
  castCounts: number[];         // castCounts[i] = times spell (i+1) declared successfully this round
};
