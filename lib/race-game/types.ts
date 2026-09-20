// ============================================================
// 놀아조라 레이스 게임 — Type Definitions
// ============================================================

export type GamePhase =
  | 'lobby'
  | 'round-intro'
  | 'contract-select'
  | 'pre-betting'
  | 'race-countdown'
  | 'race'
  | 'checkpoint-betting'
  | 'settlement'
  | 'final';

// ── Player ──────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  chips: number;
}

// ── Character ───────────────────────────────────────────────
export interface CharacterStats {
  spd: number; // 1-10 Speed
  acc: number; // 1-10 Acceleration
  sta: number; // 1-10 Stamina
  lck: number; // 1-10 Luck
  tec: number; // 1-10 Technique
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;       // primary color hex
  bgColor: string;     // lighter bg hex
  role: string;
  description: string;
  stats: CharacterStats;
  passive: string;
  passiveDesc: string;
  active: string;
  activeDesc: string;
  favoredTracks: string[];
  favoredWeather: string[];
  weakTracks: string[];
}

// ── Track ───────────────────────────────────────────────────
export type TerrainType = 'flat' | 'uphill' | 'downhill' | 'curves' | 'hazard';

export interface TerrainSection {
  from: number;  // 0–1 fraction of total distance
  to: number;
  type: TerrainType;
}

export interface Track {
  id: string;
  name: string;
  emoji: string;
  distance: number; // meters
  terrain: string;
  description: string;
  eventRate: number;    // base event rate per second (0-1)
  keyStats: Array<keyof CharacterStats>;
  sections: TerrainSection[];
}

// ── Weather ─────────────────────────────────────────────────
export interface Weather {
  id: string;
  name: string;
  emoji: string;
  frequency: 'common' | 'uncommon' | 'rare';
  description: string;
  effect: string;
  globalSpeedMod: number; // multiplier applied to all (1.0 = no change)
}

// ── Contracts ───────────────────────────────────────────────
export type ContractRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type ContractCondition =
  | 'predicted-winner'     // bet on char that wins
  | 'podium-finish'        // bet on char that finishes top 3
  | 'underdog-reversal'    // char in bottom half at CP1 finishes top 3
  | 'live-bet-success'     // any live bet wins
  | 'wire-to-wire'         // same char leads CP1, CP2, CP3, and finishes 1st
  | 'double-pick'          // correctly pick 1st AND 2nd (any order)
  | 'no-safety'            // all bets placed this round win
  | 'perfect-podium'       // correctly pick 1st, 2nd, 3rd in exact order
  | 'all-in-champion'      // bet ≥80% of chips, finish with more chips
  | 'breakeven-round'      // net chip change ≥ 0 this round
  | 'comeback-king'        // any char in last at CP2, finishes top 3
  | 'grand-slam'           // win every single bet this round
  | 'the-oracle';          // predict exact 1-2-3 order (legendary)

export interface ContractCard {
  id: string;
  name: string;
  description: string;
  rarity: ContractRarity;
  reward: number;
  penalty: number;
  minBet: number;
  condition: ContractCondition;
}

// ── Betting ─────────────────────────────────────────────────
export type BetType = 'win' | 'place' | 'head-to-head';

export interface Bet {
  id: string;
  playerId: string;
  characterId: string;
  type: BetType;
  amount: number;
  odds: number;
  isLive: boolean;
  checkpoint?: 1 | 2 | 3;
  h2hTargetId?: string;
}

// ── Race Simulation ──────────────────────────────────────────
export interface CharacterRaceState {
  characterId: string;
  position: number;    // meters from start
  speed: number;       // current m/s
  stamina: number;     // 0-10
  rank: number;        // 1 = leading
  isFinished: boolean;
  finishTime?: number;
  speedBoost: number;  // multiplier from events (1.0 = normal)
  boostRemaining: number; // seconds
  slowRemaining: number;
  slowFactor: number;
  activeUsed: boolean;
  lastEventTime: number;
}

export interface RaceEventLog {
  time: number;
  characterId: string;
  eventName: string;
  description: string;
  isGood: boolean;
}

export interface RaceFrame {
  time: number; // race time in seconds
  states: CharacterRaceState[];
  newEvents: RaceEventLog[];
}

export interface CheckpointRankings {
  cp1: string[]; // characterIds ranked 1st to last
  cp2: string[];
  cp3: string[];
}

export interface RaceResult {
  finishOrder: string[];     // characterIds 1st to last
  frames: RaceFrame[];       // every 0.5s of race
  checkpoints: CheckpointRankings;
  events: RaceEventLog[];
}

// ── Results ──────────────────────────────────────────────────
export interface BetResult {
  bet: Bet;
  won: boolean;
  payout: number;
}

export interface ContractResult {
  contract: ContractCard;
  fulfilled: boolean;
  chipChange: number;
}

export interface PlayerRoundResult {
  playerId: string;
  name: string;
  chipsBefore: number;
  chipsAfter: number;
  netChange: number;
  betResults: BetResult[];
  contractResult: ContractResult | null;
}

// ── Full Game State ──────────────────────────────────────────
export interface GameState {
  phase: GamePhase;
  round: number;     // 1-4
  players: Player[];
  currentPlayerIdx: number; // for sequential turns

  // Round
  trackId: string;
  weatherId: string;
  seed: number;
  preRaceOdds: Record<string, number>;  // characterId → odds

  // Contracts
  contractOptions: Record<string, ContractCard[]>; // playerId → 3 cards
  selectedContracts: Record<string, ContractCard | null>;

  // Bets
  bets: Record<string, Bet[]>; // playerId → bets

  // Race
  raceResult: RaceResult | null;
  currentFrameIdx: number;
  currentCheckpoint: 0 | 1 | 2 | 3;
  liveOdds: Record<string, number>; // live odds at current checkpoint

  // Round history
  roundResults: PlayerRoundResult[][];
}
