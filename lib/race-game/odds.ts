// ============================================================
// 배당률 계산기
// GDD: Odds = (1 / expected_win_prob) × 0.88  (12% house margin)
// House line uses only track affinity, NOT weather/weakness/passives
// ============================================================
import { Character, Track, Weather, CharacterRaceState } from './types';

const HOUSE_MARGIN = 0.88;

// Estimate a character's win probability based on:
// stats + track affinity ONLY (house line, no weather)
function estimateWinProbability(char: Character, track: Track, allChars: Character[]): number {
  const s = char.stats;
  const baseScore = s.spd * 0.3 + s.acc * 0.2 + s.sta * 0.25 + s.lck * 0.1 + s.tec * 0.15;
  let score = baseScore;
  if (char.favoredTracks.includes(track.id)) score *= 1.20;
  if (char.weakTracks.includes(track.id)) score *= 0.80;

  const totalScore = allChars.reduce((sum, c) => {
    const cs = c.stats;
    let cs_ = cs.spd * 0.3 + cs.acc * 0.2 + cs.sta * 0.25 + cs.lck * 0.1 + cs.tec * 0.15;
    if (c.favoredTracks.includes(track.id)) cs_ *= 1.20;
    if (c.weakTracks.includes(track.id)) cs_ *= 0.80;
    return sum + cs_;
  }, 0);

  return score / totalScore;
}

export function calculatePreRaceOdds(
  characters: Character[],
  track: Track
): Record<string, number> {
  const odds: Record<string, number> = {};
  for (const char of characters) {
    const prob = estimateWinProbability(char, track, characters);
    const rawOdds = (1 / prob) * HOUSE_MARGIN;
    // Clamp odds: min 1.05, max 12.0
    odds[char.id] = Math.round(Math.max(1.05, Math.min(12.0, rawOdds)) * 100) / 100;
  }
  return odds;
}

// Estimate place (top 3) odds: approx 1/3 of win odds
export function calcPlaceOdds(winOdds: number): number {
  return Math.round(Math.max(1.05, winOdds / 2.5) * 100) / 100;
}

// Head-to-head odds: probability char A beats char B
export function calcH2HOdds(
  charA: Character, charB: Character, track: Track
): number {
  const pa = estimateWinProbability(charA, track, [charA, charB]);
  if (pa <= 0) return 10;
  const raw = (1 / pa) * HOUSE_MARGIN;
  return Math.round(Math.max(1.05, Math.min(8.0, raw)) * 100) / 100;
}

// Live odds at checkpoint, based on current ranking
// LiveOdds = BaseOdds × RankCoefficient × (1 + RemainingDistanceRatio)
export function calculateLiveOdds(
  characters: Character[],
  track: Track,
  preRaceOdds: Record<string, number>,
  checkpointStates: CharacterRaceState[],
  checkpoint: 1 | 2 | 3
): Record<string, number> {
  const rankCoefficients: Record<number, number> = {
    1: 0.5, 2: 0.65, 3: 0.80,
    4: 1.1, 5: 1.4, 6: 1.8,
    7: 2.3, 8: 2.8, 9: 3.5, 10: 4.0,
    11: 5.0, 12: 6.0,
  };

  const remainingRatios: Record<number, number> = { 1: 0.65, 2: 0.50, 3: 0.27 };
  const remRatio = remainingRatios[checkpoint];

  const liveOdds: Record<string, number> = {};

  for (const state of checkpointStates) {
    const base = preRaceOdds[state.characterId] ?? 3.0;
    const rankCoeff = rankCoefficients[state.rank] ?? 3.0;
    const raw = base * rankCoeff * (1 + remRatio);
    liveOdds[state.characterId] = Math.round(Math.max(1.05, Math.min(15.0, raw)) * 100) / 100;
  }

  return liveOdds;
}

// Evaluate a bet result
export function evaluateBet(
  betCharId: string,
  betType: 'win' | 'place' | 'head-to-head',
  h2hTargetId: string | undefined,
  finishOrder: string[]
): boolean {
  if (betType === 'win') {
    return finishOrder[0] === betCharId;
  }
  if (betType === 'place') {
    return finishOrder.slice(0, 3).includes(betCharId);
  }
  if (betType === 'head-to-head' && h2hTargetId) {
    const rankA = finishOrder.indexOf(betCharId);
    const rankB = finishOrder.indexOf(h2hTargetId);
    return rankA !== -1 && (rankB === -1 || rankA < rankB);
  }
  return false;
}

export function getOddsForBetType(
  characterId: string,
  betType: 'win' | 'place' | 'head-to-head',
  preRaceOdds: Record<string, number>,
  h2hOdds?: number
): number {
  if (betType === 'win') return preRaceOdds[characterId] ?? 2.0;
  if (betType === 'place') return calcPlaceOdds(preRaceOdds[characterId] ?? 2.0);
  if (betType === 'head-to-head') return h2hOdds ?? 1.8;
  return 1.5;
}
