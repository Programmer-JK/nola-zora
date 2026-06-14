export type PlayerColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange';

export const WHITE_PLAYER_ID = -1;

export interface Player {
  id: number;
  name: string;
  color: PlayerColor;
  clientId?: string; // online multiplayer: unique browser client ID
  diceCount: number; // remaining colored dice to roll
  whiteDiceCount: number; // remaining white (neutral) dice to roll
  totalMoney: number;
}

export interface MoneyCard {
  value: number;
}

export interface Casino {
  id: number; // 1-6
  moneyCards: MoneyCard[];
  placedDice: PlacedDice[]; // dice placed by players
}

export interface PlacedDice {
  playerId: number;
  count: number;
}

export type GamePhase =
  | 'setup'
  | 'rolling'
  | 'choosing'
  | 'scoring'
  | 'roundEnd'
  | 'gameOver';

export interface GameState {
  players: Player[];
  casinos: Casino[];
  currentPlayerIndex: number;
  round: number;
  totalRounds: number;
  phase: GamePhase;
  rolledDice: number[]; // current colored dice roll result
  rolledWhiteDice: number[]; // current white dice roll result
  availableChoices: number[]; // casino numbers the player can choose (based on colored dice)
  lastAction: string;
  diceModalOpen?: boolean;
}

export const PLAYER_COLORS: { color: PlayerColor; label: string; bg: string; text: string; border: string; shadow: string }[] = [
  { color: 'red',    label: '빨강', bg: 'bg-red-500',    text: 'text-red-500',    border: 'border-red-500',    shadow: 'shadow-red-400' },
  { color: 'blue',   label: '파랑', bg: 'bg-blue-500',   text: 'text-blue-500',   border: 'border-blue-500',   shadow: 'shadow-blue-400' },
  { color: 'green',  label: '초록', bg: 'bg-green-500',  text: 'text-green-500',  border: 'border-green-500',  shadow: 'shadow-green-400' },
  { color: 'yellow', label: '노랑', bg: 'bg-yellow-400', text: 'text-yellow-500', border: 'border-yellow-400', shadow: 'shadow-yellow-300' },
  { color: 'purple', label: '보라', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', shadow: 'shadow-purple-400' },
  { color: 'orange', label: '주황', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', shadow: 'shadow-orange-400' },
];

export const DICE_COUNT_PER_PLAYER = 8;
export const TOTAL_ROUNDS = 4;
