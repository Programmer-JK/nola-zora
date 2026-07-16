import type { YachtCategory, YachtCatId } from './types';

export const Y_CATS: YachtCategory[] = [
  { id: 'ones',   kr: '1 (Aces)',      sub: '눈 1의 합',            sec: 'upper', face: 1 },
  { id: 'twos',   kr: '2 (Twos)',      sub: '눈 2의 합',            sec: 'upper', face: 2 },
  { id: 'threes', kr: '3 (Threes)',    sub: '눈 3의 합',            sec: 'upper', face: 3 },
  { id: 'fours',  kr: '4 (Fours)',     sub: '눈 4의 합',            sec: 'upper', face: 4 },
  { id: 'fives',  kr: '5 (Fives)',     sub: '눈 5의 합',            sec: 'upper', face: 5 },
  { id: 'sixes',  kr: '6 (Sixes)',     sub: '눈 6의 합',            sec: 'upper', face: 6 },
  { id: 'choice', kr: '찬스',          sub: '주사위 5개 총합',       sec: 'lower' },
  { id: 'fourk',  kr: '포 오브 어 카인드', sub: '같은 눈 4개 포함 · 5개 총합',  sec: 'lower' },
  { id: 'fullh',  kr: '풀 하우스',     sub: '3+2 조합 · 5개 총합',  sec: 'lower' },
  { id: 'sstr',   kr: 'S. 스트레이트', sub: '연속 4개 포함 · 15점',  sec: 'lower', fixed: 15 },
  { id: 'bstr',   kr: 'B. 스트레이트', sub: '5개 연속 · 30점',       sec: 'lower', fixed: 30 },
  { id: 'yacht',  kr: '야추',          sub: '같은 눈 5개 · 50점',   sec: 'lower', fixed: 50 },
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
      return f > 0 ? sum : 0;
    }
    case 'fullh': {
      const has3 = c.some(x => x === 3);
      const has2 = c.some(x => x === 2);
      return has3 && has2 ? sum : 0;
    }
    case 'sstr': {
      const h = (n: number) => c[n] >= 1;
      return (h(1)&&h(2)&&h(3)&&h(4)) || (h(2)&&h(3)&&h(4)&&h(5)) || (h(3)&&h(4)&&h(5)&&h(6)) ? 15 : 0;
    }
    case 'bstr': return [1,2,3,4,5].every(n=>c[n]>=1) || [2,3,4,5,6].every(n=>c[n]>=1) ? 30 : 0;
    case 'yacht': return c.some(x => x === 5) ? 50 : 0;
    default: return 0;
  }
}

export const yUpperSum = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_UPPER.reduce((t, c) => t + (scores[c.id] ?? 0), 0);

export const yLowerSum = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_LOWER.reduce((t, c) => t + (scores[c.id] ?? 0), 0);

export const yUpperBonus = (scores: Partial<Record<YachtCatId, number>>) =>
  yUpperSum(scores) >= 63 ? 35 : 0;

export const yTotal = (scores: Partial<Record<YachtCatId, number>>) =>
  yUpperSum(scores) + yUpperBonus(scores) + yLowerSum(scores);

export const yFilled = (scores: Partial<Record<YachtCatId, number>>) =>
  Y_CATS.filter(c => scores[c.id] !== undefined).length;

export const rollDie = () => 1 + Math.floor(Math.random() * 6);

export type YachtSuggestion = { id: YachtCatId; kr: string; v: number; sacrifice?: boolean };

/**
 * 현재 주사위 상태에 대한 전략적 최선의 추천을 반환합니다.
 * - 희귀 조합(야추, 스트레이트 등)에 전략적 가중치 부여
 * - 상단 보너스(63점 이상 → +35점) 달성 가능성 반영
 * - 득점 불가 시 가장 희생하기 적절한 칸 추천
 */
export function yBestSuggestion(
  dice: number[],
  scores: Partial<Record<YachtCatId, number>>,
): YachtSuggestion | null {
  if (!dice || dice.length < 5) return null;

  const available = Y_CATS.filter(c => scores[c.id] === undefined);
  if (available.length === 0) return null;

  // 상단 보너스 추적
  const upperCurrentTotal = Y_UPPER.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
  const upperRemaining = Y_UPPER.filter(c => scores[c.id] === undefined);
  const maxUpperRemaining = upperRemaining.reduce((sum, c) => sum + (c.face! * 5), 0);
  const bonusSecured = upperCurrentTotal >= 63;
  const bonusPossible = upperCurrentTotal + maxUpperRemaining >= 63;

  let best: { id: YachtCatId; kr: string; v: number; strategic: number } | null = null;

  for (const cat of available) {
    const v = yScore(cat.id, dice);
    if (v === 0) continue;

    let strategic = v;

    switch (cat.id) {
      case 'yacht': strategic += 60; break;  // 50→110 · 극히 희귀, 반드시 사용
      case 'bstr':  strategic += 25; break;  // 30→55  · 매우 희귀한 고정 점수
      case 'sstr':  strategic += 10; break;  // 15→25  · 희귀한 고정 점수
      case 'fullh': strategic += 8;  break;  // 중간 희귀도
      case 'fourk': strategic += 3;  break;  // 약간 희귀
      default:
        if (cat.sec === 'upper' && !bonusSecured && bonusPossible) {
          // 보너스 달성 가능 시 상단 점수는 약 1.56배 효과
          strategic += Math.round(v * 35 / 63);
        }
    }

    if (!best || strategic > best.strategic) {
      best = { id: cat.id, kr: cat.kr, v, strategic };
    }
  }

  if (best) return { id: best.id, kr: best.kr, v: best.v };

  // 득점 가능 칸 없음 → 희생 추천 (가치 낮은 칸부터)
  const sacrificeOrder: YachtCatId[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'choice', 'fullh', 'fourk', 'sstr', 'bstr', 'yacht',
  ];
  for (const id of sacrificeOrder) {
    const cat = available.find(c => c.id === id);
    if (cat) return { id: cat.id, kr: cat.kr, v: 0, sacrifice: true };
  }

  return null;
}

export const PLAYER_COLORS = [
  { id: 'red',    hex: '#ef4444' },
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'yellow', hex: '#facc15' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'orange', hex: '#f97316' },
];
