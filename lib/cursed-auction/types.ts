// ─── State machine phases ─────────────────────────────────────────────────────

export type Phase =
  | 'WAITING'       // 대기실
  | 'DISCUSSION'    // 보물 공개 + 감정 + 대화 (30s)
  | 'BIDDING'       // 비밀 입찰 (15s)
  | 'ROUND_RESULT'  // 결과 공개 (10s)
  | 'GAME_OVER';    // 최종 결과

export type RiskLevel = 'low' | 'medium' | 'high';
export type TreasureStatus = 'available' | 'sold' | 'unsold' | 'tied';

// ─── Players ─────────────────────────────────────────────────────────────────

export interface AuctionPlayer {
  clientId: string;
  name: string;
  color: string;       // hex
  coins: number;       // 초기 12, 낙찰 시 차감
  score: number;       // 낙찰 보물 actualScore 누적
  appraisalUsed: boolean;
  isConnected: boolean;
}

// ─── Treasures ────────────────────────────────────────────────────────────────

export interface Treasure {
  id: string;
  roundNumber: number;
  slot: number;              // 1~3
  name: string;
  clue: string;
  riskLevel: RiskLevel;
  // 비공개 — UI는 ROUND_RESULT 단계 또는 감정 결과에서만 표시
  actualScore: number;
  isCursed: boolean;
  // 결과 (resolution 후 설정)
  status: TreasureStatus;
  winnerClientId: string | null;
  winningBid: number | null;
}

// ─── Bids ─────────────────────────────────────────────────────────────────────

export interface Bid {
  clientId: string;
  treasureId: string | null;  // null = 포기
  amount: number;             // 0 if 포기
  submittedAt: number;
}

// ─── Appraisal ────────────────────────────────────────────────────────────────

export interface AppraisalResult {
  treasureId: string;
  actualScore: number;
  isCursed: boolean;
  roundNumber: number;
}

// ─── Round result (history) ───────────────────────────────────────────────────

export interface RoundResult {
  roundNumber: number;
  treasures: Treasure[];
  bids: Bid[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface GameSettings {
  discussionSeconds: number;  // default 30
  biddingSeconds: number;     // default 15
  resultSeconds: number;      // default 10
  totalRounds: number;        // default 6
}

// ─── Room ────────────────────────────────────────────────────────────────────

export interface AuctionRoom {
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: AuctionPlayer[];
  roundNumber: number;           // 1~6
  phase: Phase;
  deadlineAt: number;            // Unix ms
  version: number;               // 중복 전환 방지
  treasures: Treasure[];         // 현재 라운드 보물 3개
  bids: Record<string, Bid>;     // clientId → Bid (ROUND_RESULT 후 공개)
  appraisals: Record<string, AppraisalResult>;  // clientId → result (본인만 접근)
  roundResults: RoundResult[];   // 과거 라운드 히스토리
  usedTreasureIds: string[];     // 같은 게임에서 재사용 방지
  settings: GameSettings;
  createdAt: number;
}
