import type { YachtCategory, YachtCatId } from './types';

export const Y_CATS: YachtCategory[] = [
  { id: 'ones',   kr: '1 (Aces)',      sub: '눈 1의 합',           sec: 'upper', face: 1 },
  { id: 'twos',   kr: '2 (Twos)',      sub: '눈 2의 합',           sec: 'upper', face: 2 },
  { id: 'threes', kr: '3 (Threes)',    sub: '눈 3의 합',           sec: 'upper', face: 3 },
  { id: 'fours',  kr: '4 (Fours)',     sub: '눈 4의 합',           sec: 'upper', face: 4 },
  { id: 'fives',  kr: '5 (Fives)',     sub: '눈 5의 합',           sec: 'upper', face: 5 },
  { id: 'sixes',  kr: '6 (Sixes)',     sub: '눈 6의 합',           sec: 'upper', face: 6 },
  { id: 'choice', kr: '초이스',         sub: '주사위 5개 총합',      sec: 'lower' },
  { id: 'fourk',  kr: '포 카드',        sub: '같은 눈 4개 · 4개 합', sec: 'lower' },
  { id: 'fullh',  kr: '풀 하우스',      sub: '3+2 · 5개 총합',      sec: 'lower' },
  { id: 'sstr',   kr: 'S. 스트레이트',  sub: '1-2-3-4-5 · 30점',   sec: 'lower', fixed: 30 },
  { id: 'bstr',   kr: 'B. 스트레이트',  sub: '2-3-4-5-6 · 30점',   sec: 'lower', fixed: 30 },
  { id: 'yacht',  kr: '요트',           sub: '같은 눈 5개 · 50점',  sec: 'lower', fixed: 50 },
];

export const Y_UPPER = Y_CATS.filter(c => c.sec === 'upper');
export const Y_LOWER = Y_CATS.filter(c => c.sec === 'lower');

export function yCounts(dice: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => { if (d >= 1 && d <= 6) c[d]++; });
  return c;
}

export function yScore(catId: YachtCatId, dice: number[]): number {
  if (!dice || dice.length < 5) return 0;
  const c = yCounts(dice);
  const sum = dice.reduce((a, b) => a + b, 0);
  switch (catId) {
    case 'ones':   return c[1] * 1;
    case 'twos':   return c[2] * 2;
    case 'threes': return c[3] * 3;
    case 'fours':  return c[4] * 4;
    case 'fives':  return c[5] * 5;
    case 'sixes':  return c[6] * 6;
    case 'choice': return sum;
    case 'fourk': {
      const f = c.findIndex(x => x >= 4);
      return f > 0 ? f * 4 : 0;
    }
    case 'fullh': {
      const has3 = c.some(x => x === 3);
      const has2 = c.some(x => x === 2);
      return has3 && has2 ? sum : 0;
    }
    case 'sstr': return [1, 2, 3, 4, 5].every(n => c[n] >= 1) ? 30 : 0;
    case 'bstr': return [2, 3, 4, 5, 6].every(n => c[n] >= 1) ? 30 : 0;
    case 'yacht': return c.some(x => x === 5) ? 50 : 0;
    default: return 0;
  }
}

export const yUpperSum = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_UPPER.reduce((t, c) => t + (scores[c.id] ?? 0), 0);

export const yLowerSum = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_LOWER.reduce((t, c) => t + (scores[c.id] ?? 0), 0);

export const yTotal = (scores: Partial<Record<YachtCatId, number>>) =>
  yUpperSum(scores) + yLowerSum(scores);

export const yFilled = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_CATS.filter(c => scores[c.id] !== undefined).length;

export const rollDie = () => 1 + Math.floor(Math.random() * 6);

export const PLAYER_COLORS = [
  { id: 'red',    hex: '#ef4444' },
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'yellow', hex: '#facc15' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'orange', hex: '#f97316' },
];
