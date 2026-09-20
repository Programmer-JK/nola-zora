// ============================================================
// 게임 로직 — 라운드 설정, 컨트랙트 평가, 정산
// ============================================================
import {
  GameState, Player, Bet, ContractCard, BetResult,
  ContractResult, PlayerRoundResult, RaceResult,
} from './types';
import { CHARACTERS, getCharacter } from './characters';
import { TRACKS } from './tracks';
import { WEATHER_LIST, getWeatherWeight } from './weather';
import { CONTRACT_DECK, getRandomContractOptions } from './contracts';
import { createRng, seededShuffle, weightedRandom } from './seededRandom';
import { calculatePreRaceOdds, calculateLiveOdds, evaluateBet, getOddsForBetType } from './odds';
import { simulateRace } from './simulator';

export const STARTING_CHIPS = 700;
export const MAX_ROUNDS = 4;
export const CHARACTERS_PER_RACE = 12; // all 12

// ── Round Setup ──────────────────────────────────────────────
export function generateRoundData(round: number, seed: number) {
  const rng = createRng(seed + round * 137);

  // Pick track (no repeat in 4 rounds if possible)
  const trackIdx = Math.floor(rng() * TRACKS.length);
  const track = TRACKS[trackIdx];

  // Pick weather by weight
  const weatherIds = WEATHER_LIST.map(w => w.id);
  const weatherWeights = WEATHER_LIST.map(w => getWeatherWeight(w.id));
  const weatherId = weightedRandom(weatherIds, weatherWeights, rng);
  const weather = WEATHER_LIST.find(w => w.id === weatherId)!;

  // Characters: shuffle all 12, take all
  const shuffled = seededShuffle([...CHARACTERS], rng);
  const racingChars = shuffled; // all 12

  // Pre-race odds
  const odds = calculatePreRaceOdds(racingChars, track);

  // Contract options per player (generated later per player)

  return {
    trackId: track.id,
    weatherId,
    seed: seed + round * 999,
    racingCharIds: racingChars.map(c => c.id),
    preRaceOdds: odds,
  };
}

// ── Contract Options ─────────────────────────────────────────
export function generateContractOptions(playerId: string, round: number, seed: number): ContractCard[] {
  const rng = createRng(seed + playerId.charCodeAt(0) * 31 + round * 53);
  return getRandomContractOptions(rng);
}

// ── Settlement ───────────────────────────────────────────────
export function evaluateBets(
  bets: Bet[],
  raceResult: RaceResult
): BetResult[] {
  return bets.map(bet => {
    const won = evaluateBet(bet.characterId, bet.type, bet.h2hTargetId, raceResult.finishOrder);
    const payout = won ? Math.round(bet.amount * bet.odds) : 0;
    return { bet, won, payout };
  });
}

export function evaluateContract(
  contract: ContractCard,
  bets: Bet[],
  betResults: BetResult[],
  raceResult: RaceResult,
  chipsBefore: number,
  chipsAfter: number
): ContractResult {
  const { condition } = contract;
  let fulfilled = false;

  const finishOrder = raceResult.finishOrder;
  const cp1 = raceResult.checkpoints.cp1;
  const cp2 = raceResult.checkpoints.cp2;
  const cp3 = raceResult.checkpoints.cp3;

  const liveBets = bets.filter(b => b.isLive);
  const liveBetResults = betResults.filter(r => r.bet.isLive);

  const totalBetAmount = bets.reduce((s, b) => s + b.amount, 0);
  const totalPayout = betResults.reduce((s, r) => s + r.payout, 0);
  const netProfit = totalPayout - totalBetAmount;

  switch (condition) {
    case 'predicted-winner': {
      const winnerBets = bets.filter(b => !b.isLive && b.type === 'win');
      fulfilled = winnerBets.some(b =>
        b.amount >= contract.minBet && b.characterId === finishOrder[0]
      );
      break;
    }
    case 'podium-finish': {
      const podiumBets = bets.filter(b => !b.isLive && (b.type === 'win' || b.type === 'place'));
      fulfilled = podiumBets.some(b =>
        b.amount >= contract.minBet && finishOrder.slice(0, 3).includes(b.characterId)
      );
      break;
    }
    case 'breakeven-round': {
      fulfilled = chipsAfter >= chipsBefore;
      break;
    }
    case 'live-bet-success': {
      fulfilled = liveBets.length > 0 && liveBetResults.some(r => r.won && r.bet.amount >= contract.minBet);
      break;
    }
    case 'wire-to-wire': {
      const leader = finishOrder[0];
      fulfilled =
        cp1[0] === leader &&
        cp2[0] === leader &&
        cp3[0] === leader &&
        bets.some(b => b.amount >= contract.minBet && b.characterId === leader);
      break;
    }
    case 'double-pick': {
      const top2 = new Set(finishOrder.slice(0, 2));
      const betCharIds = new Set(bets.filter(b => b.amount >= contract.minBet / 2).map(b => b.characterId));
      const picked = [...betCharIds].filter(id => top2.has(id));
      fulfilled = picked.length >= 2;
      break;
    }
    case 'no-safety': {
      const qualBets = bets.filter(b => b.amount >= contract.minBet / bets.length || b.amount >= 30);
      fulfilled = qualBets.length > 0 && betResults.every(r => r.won);
      break;
    }
    case 'perfect-podium': {
      const top3 = finishOrder.slice(0, 3);
      const orderedBets = bets
        .filter(b => b.amount >= contract.minBet / 3)
        .map(b => b.characterId);
      fulfilled = top3.every((id, i) => orderedBets[i] === id);
      break;
    }
    case 'all-in-champion': {
      fulfilled = totalBetAmount >= chipsBefore * 0.8 && chipsAfter > chipsBefore;
      break;
    }
    case 'underdog-reversal': {
      // Char in bottom half at CP1, finishes top 3
      const half = Math.ceil(finishOrder.length / 2);
      const underdogs = cp1.slice(half);
      const top3 = finishOrder.slice(0, 3);
      const target = underdogs.find(id => top3.includes(id));
      if (target) {
        fulfilled = bets.some(b => b.amount >= contract.minBet && b.characterId === target);
      }
      break;
    }
    case 'comeback-king': {
      const last = cp2[cp2.length - 1];
      fulfilled = finishOrder.slice(0, 3).includes(last) &&
        bets.some(b => b.amount >= contract.minBet && b.characterId === last);
      break;
    }
    case 'grand-slam': {
      const qualBets = bets.filter(b => b.amount >= 30);
      fulfilled = qualBets.length >= 3 && betResults.filter(r => r.bet.amount >= 30).every(r => r.won);
      break;
    }
    case 'the-oracle': {
      const top4 = finishOrder.slice(0, 4);
      const orderedBets = bets
        .filter(b => b.amount >= contract.minBet / 4)
        .map(b => b.characterId);
      fulfilled = top4.length >= 4 && top4.every((id, i) => orderedBets[i] === id);
      break;
    }
  }

  const chipChange = fulfilled ? contract.reward : -contract.penalty;
  return { contract, fulfilled, chipChange };
}

export function settleRound(
  players: Player[],
  allBets: Record<string, Bet[]>,
  selectedContracts: Record<string, ContractCard | null>,
  raceResult: RaceResult
): PlayerRoundResult[] {
  return players.map(player => {
    const bets = allBets[player.id] ?? [];
    const contract = selectedContracts[player.id] ?? null;
    const chipsBefore = player.chips;

    const betResults = evaluateBets(bets, raceResult);
    const totalBetAmount = bets.reduce((s, b) => s + b.amount, 0);
    const totalPayout = betResults.reduce((s, r) => s + r.payout, 0);
    const netBetChange = totalPayout - totalBetAmount;

    let chipsAfterBets = chipsBefore + netBetChange;

    let contractResult: ContractResult | null = null;
    if (contract) {
      contractResult = evaluateContract(
        contract, bets, betResults, raceResult,
        chipsBefore, chipsAfterBets
      );
      chipsAfterBets += contractResult.chipChange;
    }

    const chipsAfter = Math.max(0, chipsAfterBets);
    return {
      playerId: player.id,
      name: player.name,
      chipsBefore,
      chipsAfter,
      netChange: chipsAfter - chipsBefore,
      betResults,
      contractResult,
    };
  });
}

// ── Contract Evaluation Helper (for UI "active contract check") ─
export function canFulfillContract(
  contract: ContractCard,
  bets: Bet[],
): boolean {
  // Basic: has minimum bet?
  return bets.some(b => b.amount >= contract.minBet);
}

// ── Live odds update at checkpoint ───────────────────────────
export { calculateLiveOdds } from './odds';
