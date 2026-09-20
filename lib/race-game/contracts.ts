import { ContractCard } from './types';

export const CONTRACT_DECK: ContractCard[] = [
  // ── COMMON (8장) ──────────────────────────────────────────
  {
    id: 'c-01', name: '우승 예측', rarity: 'common',
    description: '베팅한 캐릭터가 1위로 들어오면 성공.',
    reward: 80, penalty: 0, minBet: 50,
    condition: 'predicted-winner',
  },
  {
    id: 'c-02', name: '포디엄 피니시', rarity: 'common',
    description: '베팅한 캐릭터가 상위 3위 안에 들면 성공.',
    reward: 60, penalty: 0, minBet: 50,
    condition: 'podium-finish',
  },
  {
    id: 'c-03', name: '손익 분기', rarity: 'common',
    description: '이번 라운드 순손익 0 이상이면 성공.',
    reward: 70, penalty: 0, minBet: 30,
    condition: 'breakeven-round',
  },
  {
    id: 'c-04', name: '첫 베팅 승리', rarity: 'common',
    description: '이번 라운드 첫 번째로 건 베팅이 이기면 성공.',
    reward: 90, penalty: 0, minBet: 50,
    condition: 'predicted-winner',
  },
  {
    id: 'c-05', name: '안정적 수익', rarity: 'common',
    description: '이번 라운드 칩이 늘어나면 성공.',
    reward: 50, penalty: 0, minBet: 30,
    condition: 'breakeven-round',
  },
  {
    id: 'c-06', name: '복합 베팅', rarity: 'common',
    description: '3개 이상 베팅 중 최소 2개가 맞으면 성공.',
    reward: 100, penalty: 20, minBet: 40,
    condition: 'podium-finish',
  },
  {
    id: 'c-07', name: '순위 적중', rarity: 'common',
    description: '베팅한 캐릭터가 예상 순위(3위 이내)로 들어오면 성공.',
    reward: 70, penalty: 0, minBet: 50,
    condition: 'podium-finish',
  },
  {
    id: 'c-08', name: '수익 사냥꾼', rarity: 'common',
    description: '이번 라운드 베팅 수익이 100 이상이면 성공.',
    reward: 80, penalty: 0, minBet: 60,
    condition: 'breakeven-round',
  },

  // ── RARE (8장) ───────────────────────────────────────────
  {
    id: 'r-01', name: '언더독 역전', rarity: 'rare',
    description: 'CP1에서 하위권인 캐릭터에게 베팅, 3위 이내 입상 시 성공.',
    reward: 220, penalty: 50, minBet: 80,
    condition: 'underdog-reversal',
  },
  {
    id: 'r-02', name: '라이브 베팅 성공', rarity: 'rare',
    description: '라이브 베팅(체크포인트 중 건 베팅)을 1개 이상 적중.',
    reward: 200, penalty: 30, minBet: 60,
    condition: 'live-bet-success',
  },
  {
    id: 'r-03', name: '선두 독주', rarity: 'rare',
    description: 'CP1, CP2, CP3 모두 1위였던 캐릭터가 최종 우승.',
    reward: 240, penalty: 60, minBet: 80,
    condition: 'wire-to-wire',
  },
  {
    id: 'r-04', name: '더블 픽', rarity: 'rare',
    description: '1위와 2위를 (순서 무관) 모두 맞히면 성공.',
    reward: 260, penalty: 80, minBet: 80,
    condition: 'double-pick',
  },
  {
    id: 'r-05', name: '무결점 베팅', rarity: 'rare',
    description: '이번 라운드 베팅 모두 승리.',
    reward: 250, penalty: 100, minBet: 60,
    condition: 'no-safety',
  },
  {
    id: 'r-06', name: '컴백 킹', rarity: 'rare',
    description: 'CP2 꼴찌 캐릭터가 3위 이내 입상하면 성공.',
    reward: 230, penalty: 50, minBet: 70,
    condition: 'comeback-king',
  },
  {
    id: 'r-07', name: '역발상 투자', rarity: 'rare',
    description: '배당 3.0 이상 캐릭터에게 베팅하여 적중.',
    reward: 210, penalty: 40, minBet: 60,
    condition: 'underdog-reversal',
  },
  {
    id: 'r-08', name: '체크포인트 분석', rarity: 'rare',
    description: 'CP1 후 베팅 변경하여 최종 우승자 적중.',
    reward: 220, penalty: 40, minBet: 70,
    condition: 'live-bet-success',
  },

  // ── EPIC (8장) ───────────────────────────────────────────
  {
    id: 'e-01', name: '퍼펙트 포디엄', rarity: 'epic',
    description: '1-2-3위를 정확한 순서로 모두 예측하면 성공.',
    reward: 550, penalty: 150, minBet: 100,
    condition: 'perfect-podium',
  },
  {
    id: 'e-02', name: '꼴찌에서 우승', rarity: 'epic',
    description: '출발 시 꼴찌였던 캐릭터가 1위로 들어오면 성공.',
    reward: 500, penalty: 100, minBet: 100,
    condition: 'underdog-reversal',
  },
  {
    id: 'e-03', name: '트리플 라이브', rarity: 'epic',
    description: '3개의 체크포인트 모두에서 라이브 베팅하여 모두 적중.',
    reward: 580, penalty: 150, minBet: 80,
    condition: 'live-bet-success',
  },
  {
    id: 'e-04', name: '무안전망', rarity: 'epic',
    description: '이번 라운드 모든 칩을 베팅하여 순이익을 낸다.',
    reward: 520, penalty: 180, minBet: 200,
    condition: 'all-in-champion',
  },
  {
    id: 'e-05', name: '대역전극', rarity: 'epic',
    description: 'CP2 하위권 캐릭터 3명 중 하나가 우승.',
    reward: 500, penalty: 120, minBet: 100,
    condition: 'comeback-king',
  },
  {
    id: 'e-06', name: '완벽한 분석', rarity: 'epic',
    description: '이번 라운드 모든 베팅 승리 + 최소 5개 베팅.',
    reward: 600, penalty: 200, minBet: 80,
    condition: 'grand-slam',
  },
  {
    id: 'e-07', name: '선두 유지', rarity: 'epic',
    description: '베팅한 캐릭터가 모든 체크포인트에서 1위 유지 후 우승.',
    reward: 520, penalty: 140, minBet: 100,
    condition: 'wire-to-wire',
  },
  {
    id: 'e-08', name: '언더독 3연전', rarity: 'epic',
    description: '3개의 체크포인트 모두에서 하위권 캐릭터에게 라이브 베팅, 전부 역전.',
    reward: 580, penalty: 160, minBet: 80,
    condition: 'live-bet-success',
  },

  // ── LEGENDARY (8장) ──────────────────────────────────────
  {
    id: 'l-01', name: '그랜드 슬램', rarity: 'legendary',
    description: '이번 라운드 베팅 전부 승리 + 라이브 베팅 포함.',
    reward: 1500, penalty: 400, minBet: 100,
    condition: 'grand-slam',
  },
  {
    id: 'l-02', name: '기적의 역전', rarity: 'legendary',
    description: 'CP3에서 꼴찌였던 캐릭터가 최종 1위로 들어오면 성공.',
    reward: 2000, penalty: 500, minBet: 150,
    condition: 'underdog-reversal',
  },
  {
    id: 'l-03', name: '풀 보드 스윕', rarity: 'legendary',
    description: '1-2-3위를 정확한 순서로 맞히고, 3개 모두 베팅 적중.',
    reward: 1800, penalty: 500, minBet: 150,
    condition: 'perfect-podium',
  },
  {
    id: 'l-04', name: '올인 챔피언', rarity: 'legendary',
    description: '보유 칩의 90% 이상을 올인, 수익 +200% 이상.',
    reward: 1200, penalty: 300, minBet: 300,
    condition: 'all-in-champion',
  },
  {
    id: 'l-05', name: '더 오라클', rarity: 'legendary',
    description: '1-2-3-4위를 정확한 순서로 모두 예측하면 성공.',
    reward: 1600, penalty: 450, minBet: 120,
    condition: 'the-oracle',
  },
  {
    id: 'l-06', name: '역주행 전설', rarity: 'legendary',
    description: '매 라운드 언더독 역전에 성공. 4라운드 연속 달성 시 3000 획득.',
    reward: 1400, penalty: 350, minBet: 120,
    condition: 'underdog-reversal',
  },
  {
    id: 'l-07', name: '완벽한 승리', rarity: 'legendary',
    description: '이번 라운드 모든 베팅에서 최고 배당 캐릭터로 전승.',
    reward: 1700, penalty: 450, minBet: 100,
    condition: 'grand-slam',
  },
  {
    id: 'l-08', name: '신의 눈', rarity: 'legendary',
    description: '레이스 시작 전 1-5위를 순서대로 예측하면 전설 달성.',
    reward: 2000, penalty: 600, minBet: 100,
    condition: 'the-oracle',
  },
];

export function getRandomContractOptions(rng: () => number): ContractCard[] {
  const commons = CONTRACT_DECK.filter(c => c.rarity === 'common');
  const rares   = CONTRACT_DECK.filter(c => c.rarity === 'rare');
  const epics   = CONTRACT_DECK.filter(c => c.rarity === 'epic');
  const legends = CONTRACT_DECK.filter(c => c.rarity === 'legendary');

  const pick = (arr: ContractCard[]) => arr[Math.floor(rng() * arr.length)];

  // Distribution: 50% C, 30% R, 15% E, 5% L
  const r = rng();
  const second = rng();

  const pool = [
    r < 0.5 ? pick(commons) : r < 0.8 ? pick(rares) : r < 0.95 ? pick(epics) : pick(legends),
    second < 0.5 ? pick(commons) : second < 0.8 ? pick(rares) : second < 0.95 ? pick(epics) : pick(legends),
    pick(commons), // Always one guaranteed common
  ];

  // Deduplicate
  const seen = new Set<string>();
  const result: ContractCard[] = [];
  for (const c of pool) {
    if (!seen.has(c.id)) { seen.add(c.id); result.push(c); }
  }
  while (result.length < 3) {
    const extra = pick(commons);
    if (!seen.has(extra.id)) { seen.add(extra.id); result.push(extra); }
  }
  return result.slice(0, 3);
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  rare: '#57c7ff',
  epic: '#a274ff',
  legendary: '#f5c542',
};

export const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};
