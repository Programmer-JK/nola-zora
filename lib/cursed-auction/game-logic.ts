import type { Treasure, AuctionPlayer, Bid, RiskLevel, TreasureStatus } from './types';
import { TREASURE_POOL, RISK_TABLE, TREASURES_PER_ROUND } from './game-data';

// ─── Treasure generation ─────────────────────────────────────────────────────

function generateEffect(riskLevel: RiskLevel): { actualScore: number; isCursed: boolean } {
  const table = RISK_TABLE[riskLevel];
  const isCursed = Math.random() < table.cursePct;
  if (isCursed) return { isCursed: true, actualScore: table.curseScore };
  const safeScores = table.safeScores;
  const actualScore = safeScores[Math.floor(Math.random() * safeScores.length)];
  return { isCursed: false, actualScore };
}

/**
 * 라운드에 사용할 보물 3개 생성.
 * 위험 등급은 low/medium/high 각 1개씩 무작위 배정.
 */
export function generateRoundTreasures(roundNumber: number, usedIds: string[]): Treasure[] {
  const available = TREASURE_POOL.filter(t => !usedIds.includes(t.id));
  // shuffle
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, TREASURES_PER_ROUND);

  const riskLevels: RiskLevel[] = ['low', 'medium', 'high'];
  const shuffledRisks = [...riskLevels].sort(() => Math.random() - 0.5);

  return selected.map((tpl, i) => {
    const riskLevel = shuffledRisks[i];
    const effect = generateEffect(riskLevel);
    return {
      id: tpl.id,
      roundNumber,
      slot: i + 1,
      name: tpl.name,
      clue: tpl.clue,
      riskLevel,
      actualScore: effect.actualScore,
      isCursed: effect.isCursed,
      status: 'available' as TreasureStatus,
      winnerClientId: null,
      winningBid: null,
    };
  });
}

// ─── Bid resolution ───────────────────────────────────────────────────────────

export interface ResolutionResult {
  updatedTreasures: Treasure[];
  /** clientId → { coinsDelta, scoreDelta } */
  playerUpdates: Record<string, { coinsDelta: number; scoreDelta: number }>;
}

/**
 * 한 라운드의 입찰을 해결한다.
 * 낙찰자에게만 코인을 차감하고 점수를 부여한다.
 */
export function resolveBids(
  treasures: Treasure[],
  bids: Record<string, Bid>,
): ResolutionResult {
  const bidList = Object.values(bids);
  const playerUpdates: Record<string, { coinsDelta: number; scoreDelta: number }> = {};

  const updatedTreasures: Treasure[] = treasures.map(treasure => {
    const forThis = bidList.filter(b => b.treasureId === treasure.id && b.amount > 0);

    if (forThis.length === 0) {
      return { ...treasure, status: 'unsold' as TreasureStatus };
    }

    const maxAmt = Math.max(...forThis.map(b => b.amount));
    const topBidders = forThis.filter(b => b.amount === maxAmt);

    if (topBidders.length > 1) {
      // 동점 → 낙찰 실패
      return { ...treasure, status: 'tied' as TreasureStatus };
    }

    const winner = topBidders[0];
    if (!playerUpdates[winner.clientId]) {
      playerUpdates[winner.clientId] = { coinsDelta: 0, scoreDelta: 0 };
    }
    playerUpdates[winner.clientId].coinsDelta -= winner.amount;
    playerUpdates[winner.clientId].scoreDelta += treasure.actualScore;

    return {
      ...treasure,
      status: 'sold' as TreasureStatus,
      winnerClientId: winner.clientId,
      winningBid: winner.amount,
    };
  });

  return { updatedTreasures, playerUpdates };
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/** 최종 점수 = 보물 점수 누적 + 남은 금화 */
export function getFinalScore(player: AuctionPlayer): number {
  return player.score + player.coins;
}

/**
 * 최종 순위 정렬.
 * 동점 시 남은 금화가 더 많은 플레이어가 우선.
 */
export function rankPlayers(players: AuctionPlayer[]): AuctionPlayer[] {
  return [...players].sort((a, b) => {
    const sa = getFinalScore(a);
    const sb = getFinalScore(b);
    if (sa !== sb) return sb - sa;
    return b.coins - a.coins;
  });
}

/** 우승자 목록 (공동 우승 포함) */
export function getWinners(players: AuctionPlayer[]): AuctionPlayer[] {
  if (players.length === 0) return [];
  const ranked = rankPlayers(players);
  const topScore = getFinalScore(ranked[0]);
  const topCoins = ranked[0].coins;
  return ranked.filter(
    p => getFinalScore(p) === topScore && p.coins === topCoins,
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export function riskLabel(level: RiskLevel): string {
  return level === 'low' ? '낮음' : level === 'medium' ? '보통' : '높음';
}

export function riskColor(level: RiskLevel): string {
  return level === 'low' ? '#22c55e' : level === 'medium' ? '#eab308' : '#ef4444';
}

export function riskEmoji(level: RiskLevel): string {
  return level === 'low' ? '🟢' : level === 'medium' ? '🟡' : '🔴';
}
