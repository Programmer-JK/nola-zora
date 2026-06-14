import {
  GameState,
  Player,
  Casino,
  MoneyCard,
  PlayerColor,
  TOTAL_ROUNDS,
  WHITE_PLAYER_ID,
} from '@/lib/las-vegas/types';

// Money card pool used in the game
const MONEY_CARD_VALUES = [
  10000, 10000, 10000, 10000, 10000,
  20000, 20000, 20000, 20000,
  30000, 30000, 30000,
  40000, 40000,
  50000, 50000,
  60000, 70000, 80000, 90000,
];

function getColoredDicePerPlayer(playerCount: number): number {
  if (playerCount === 2) return 4;
  if (playerCount <= 4) return 6;
  return 8; // 5 players: 8 colored dice, no white
}

function getWhiteDicePerPlayer(playerCount: number): number {
  if (playerCount === 2) return 2;
  if (playerCount <= 4) return 2;
  return 0; // 5 players: no white dice
}

// Extra neutral dice rolled by first player before each round in 3-player games
function getExtraNeutralDiceCount(playerCount: number): number {
  return playerCount === 3 ? 2 : 0;
}

function placeNeutralDiceOnCasinos(casinos: Casino[], diceRolls: number[]): Casino[] {
  const groups: Record<number, number> = {};
  for (const v of diceRolls) groups[v] = (groups[v] ?? 0) + 1;

  return casinos.map((casino) => {
    const count = groups[casino.id] ?? 0;
    if (count === 0) return casino;
    const existing = casino.placedDice.find((d) => d.playerId === WHITE_PLAYER_ID);
    if (existing) {
      return {
        ...casino,
        placedDice: casino.placedDice.map((d) =>
          d.playerId === WHITE_PLAYER_ID ? { ...d, count: d.count + count } : d
        ),
      };
    }
    return {
      ...casino,
      placedDice: [...casino.placedDice, { playerId: WHITE_PLAYER_ID, count }],
    };
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealMoneyCards(): MoneyCard[][] {
  const deck = shuffle(MONEY_CARD_VALUES.map((v) => ({ value: v })));
  const casinos: MoneyCard[][] = Array.from({ length: 6 }, () => []);

  // Each casino gets cards until the total >= 50000
  for (let i = 0; i < 6; i++) {
    let total = 0;
    while (total < 50000 && deck.length > 0) {
      const card = deck.pop()!;
      casinos[i].push(card);
      total += card.value;
    }
    // Sort descending so highest is first (top of pile)
    casinos[i].sort((a, b) => b.value - a.value);
  }
  return casinos;
}

export function createInitialState(
  playerSetup: { name: string; color: PlayerColor; clientId?: string }[]
): GameState {
  const playerCount = playerSetup.length;
  const coloredDice = getColoredDicePerPlayer(playerCount);
  const whiteDice = getWhiteDicePerPlayer(playerCount);

  const players: Player[] = playerSetup.map((p, i) => ({
    id: i,
    name: p.name,
    color: p.color,
    clientId: p.clientId,
    diceCount: coloredDice,
    whiteDiceCount: whiteDice,
    totalMoney: 0,
  }));

  const moneyCardPiles = dealMoneyCards();

  let casinos: Casino[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    moneyCards: moneyCardPiles[i],
    placedDice: [],
  }));

  let startMsg = '게임 시작! 첫 번째 플레이어가 주사위를 굴려주세요.';

  // 3인 게임: 선플레이어가 2개의 추가 중립 주사위를 배치
  const extraCount = getExtraNeutralDiceCount(playerCount);
  if (extraCount > 0) {
    const extraDice = Array.from({ length: extraCount }, () => Math.floor(Math.random() * 6) + 1);
    casinos = placeNeutralDiceOnCasinos(casinos, extraDice);
    startMsg = `게임 시작! 중립 주사위 사전 배치: [${extraDice.join(', ')}]`;
  }

  return {
    players,
    casinos,
    currentPlayerIndex: 0,
    round: 1,
    totalRounds: TOTAL_ROUNDS,
    phase: 'rolling',
    rolledDice: [],
    rolledWhiteDice: [],
    availableChoices: [],
    lastAction: startMsg,
  };
}

export function rollDice(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  if ((player.diceCount === 0 && player.whiteDiceCount === 0) || state.phase !== 'rolling') return state;

  const rolled: number[] = Array.from({ length: player.diceCount }, () =>
    Math.floor(Math.random() * 6) + 1
  );
  const rolledWhite: number[] = Array.from({ length: player.whiteDiceCount }, () =>
    Math.floor(Math.random() * 6) + 1
  );

  // 컬러+흰색 모두 선택지로 허용
  const uniqueValues = [...new Set([...rolled, ...rolledWhite])];

  const whitePart = rolledWhite.length > 0 ? ` + 흰색 ${rolledWhite.length}개` : '';
  return {
    ...state,
    rolledDice: rolled,
    rolledWhiteDice: rolledWhite,
    availableChoices: uniqueValues,
    phase: 'choosing',
    diceModalOpen: true,
    lastAction: `${player.name}이(가) 주사위 ${player.diceCount}개${whitePart}를 굴렸습니다.`,
  };
}

export function chooseCasino(state: GameState, casinoId: number): GameState {
  if (state.phase !== 'choosing') return state;

  const player = state.players[state.currentPlayerIndex];
  const coloredCount = state.rolledDice.filter((v) => v === casinoId).length;
  const whiteMatchCount = state.rolledWhiteDice.filter((v) => v === casinoId).length;

  // Must have at least colored or white dice matching this casino
  if (coloredCount === 0 && whiteMatchCount === 0) return state;

  // Place colored dice at chosen casino (only if any)
  let newCasinos = state.casinos.map((casino) => {
    if (casino.id !== casinoId || coloredCount === 0) return casino;

    const existing = casino.placedDice.find((d) => d.playerId === player.id);
    if (existing) {
      return {
        ...casino,
        placedDice: casino.placedDice.map((d) =>
          d.playerId === player.id ? { ...d, count: d.count + coloredCount } : d
        ),
      };
    }
    return {
      ...casino,
      placedDice: [...casino.placedDice, { playerId: player.id, count: coloredCount }],
    };
  });

  // Place only white dice matching the chosen casino
  if (whiteMatchCount > 0) {
    newCasinos = newCasinos.map((casino) => {
      if (casino.id !== casinoId) return casino;
      const existing = casino.placedDice.find((d) => d.playerId === WHITE_PLAYER_ID);
      if (existing) {
        return {
          ...casino,
          placedDice: casino.placedDice.map((d) =>
            d.playerId === WHITE_PLAYER_ID ? { ...d, count: d.count + whiteMatchCount } : d
          ),
        };
      }
      return {
        ...casino,
        placedDice: [...casino.placedDice, { playerId: WHITE_PLAYER_ID, count: whiteMatchCount }],
      };
    });
  }

  const newPlayers = state.players.map((p) =>
    p.id === player.id
      ? { ...p, diceCount: p.diceCount - coloredCount, whiteDiceCount: p.whiteDiceCount - whiteMatchCount }
      : p
  );

  // Round is over when all players have placed ALL dice (colored + white)
  const roundOver = newPlayers.every((p) => p.diceCount === 0 && p.whiteDiceCount === 0);

  const whitePart = whiteMatchCount > 0 ? ` + 흰색 ${whiteMatchCount}개` : '';
  const coloredPart = coloredCount > 0 ? `주사위 ${coloredCount}개` : '흰색 주사위만';
  const nextState: GameState = {
    ...state,
    casinos: newCasinos,
    players: newPlayers,
    rolledDice: [],
    rolledWhiteDice: [],
    availableChoices: [],
    diceModalOpen: false,
    lastAction: `${player.name}이(가) 카지노 ${casinoId}에 ${coloredPart}${whitePart}를 놓았습니다.`,
  };

  if (roundOver) {
    return { ...nextState, phase: 'scoring' };
  }

  // Advance to next player who still has dice (colored or white)
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  while (newPlayers[nextIndex].diceCount === 0 && newPlayers[nextIndex].whiteDiceCount === 0) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return { ...nextState, currentPlayerIndex: nextIndex, phase: 'rolling' };
}

export function scoreRound(state: GameState): GameState {
  const newPlayers = state.players.map((p) => ({ ...p }));
  const newCasinos = state.casinos.map((c) => ({ ...c, moneyCards: [...c.moneyCards] }));

  const winSummary: string[] = [];

  for (const casino of newCasinos) {
    if (casino.placedDice.length === 0 || casino.moneyCards.length === 0) continue;

    // Sort by dice count descending
    const sorted = [...casino.placedDice].sort((a, b) => b.count - a.count);

    let cardIndex = 0;
    let i = 0;

    while (i < sorted.length && cardIndex < casino.moneyCards.length) {
      const currentCount = sorted[i].count;
      // Find all entries tied at this count
      const tiedGroup = sorted.filter((d) => d.count === currentCount);

      if (tiedGroup.length === 1) {
        const card = casino.moneyCards[cardIndex];
        if (tiedGroup[0].playerId === WHITE_PLAYER_ID) {
          // Neutral wins: prize is discarded (nobody gets money)
          winSummary.push(`카지노${casino.id}: 중립 주사위 획득 (무효)`);
        } else {
          const winner = newPlayers.find((p) => p.id === tiedGroup[0].playerId)!;
          winner.totalMoney += card.value;
          winSummary.push(`카지노${casino.id}: ${winner.name} +${(card.value / 10000).toFixed(0)}만원`);
        }
        cardIndex++;
      }
      // Tied players get nothing, skip their position
      i += tiedGroup.length;
    }
  }

  const isGameOver = state.round >= state.totalRounds;
  const nextRound = state.round + 1;

  // Reset for next round
  const coloredDice = getColoredDicePerPlayer(state.players.length);
  const whiteDice = getWhiteDicePerPlayer(state.players.length);
  const resetPlayers = newPlayers.map((p) => ({
    ...p,
    diceCount: coloredDice,
    whiteDiceCount: whiteDice,
  }));

  const newMoneyCardPiles = dealMoneyCards();
  let resetCasinos: Casino[] = newCasinos.map((c, i) => ({
    ...c,
    moneyCards: newMoneyCardPiles[i],
    placedDice: [],
  }));

  // 3인 게임: 다음 라운드 시작 전 추가 중립 주사위 배치
  let neutralMsg = '';
  if (!isGameOver) {
    const extraCount = getExtraNeutralDiceCount(state.players.length);
    if (extraCount > 0) {
      const extraDice = Array.from({ length: extraCount }, () => Math.floor(Math.random() * 6) + 1);
      resetCasinos = placeNeutralDiceOnCasinos(resetCasinos, extraDice);
      neutralMsg = ` | 중립 주사위: [${extraDice.join(', ')}]`;
    }
  }

  const summaryMsg = winSummary.length > 0 ? winSummary.join(' | ') : '이번 라운드 수익 없음';

  const orderedPlayers = isGameOver ? newPlayers : shuffle(resetPlayers);
  const firstPlayerName = orderedPlayers[0]?.name ?? '';

  return {
    ...state,
    players: orderedPlayers,
    casinos: isGameOver ? newCasinos : resetCasinos,
    round: nextRound,
    currentPlayerIndex: 0,
    phase: isGameOver ? 'gameOver' : 'rolling',
    rolledDice: [],
    rolledWhiteDice: [],
    availableChoices: [],
    lastAction: summaryMsg + neutralMsg + (isGameOver ? '' : ` | 다음 라운드 순서: ${orderedPlayers.map(p => p.name).join(' → ')}`),
  };
}

export interface CasinoAward {
  type: 'win' | 'neutral' | 'tie';
  playerIds: number[];
  amount: number; // card value (0 for tie since no card is consumed)
}

export interface CasinoScoringResult {
  casinoId: number;
  totalPot: number;
  placedDice: { playerId: number; count: number }[]; // sorted desc
  awards: CasinoAward[];
}

export function getScoringBreakdown(state: GameState): CasinoScoringResult[] {
  const results: CasinoScoringResult[] = [];

  for (const casino of state.casinos) {
    if (casino.placedDice.length === 0) continue;

    const sorted = [...casino.placedDice].sort((a, b) => b.count - a.count);
    const totalPot = casino.moneyCards.reduce((sum, c) => sum + c.value, 0);
    const awards: CasinoAward[] = [];
    let cardIndex = 0;
    let i = 0;

    while (i < sorted.length && cardIndex < casino.moneyCards.length) {
      const currentCount = sorted[i].count;
      const tiedGroup = sorted.filter((d) => d.count === currentCount);
      const amount = casino.moneyCards[cardIndex].value;

      if (tiedGroup.length === 1) {
        if (tiedGroup[0].playerId === WHITE_PLAYER_ID) {
          awards.push({ type: 'neutral', playerIds: [WHITE_PLAYER_ID], amount });
        } else {
          awards.push({ type: 'win', playerIds: [tiedGroup[0].playerId], amount });
        }
        cardIndex++;
      } else {
        awards.push({ type: 'tie', playerIds: tiedGroup.map((d) => d.playerId), amount: 0 });
      }

      i += tiedGroup.length;
    }

    results.push({ casinoId: casino.id, totalPot, placedDice: sorted, awards });
  }

  return results;
}

export function getColorClasses(color: string) {
  const map: Record<string, { bg: string; text: string; border: string; light: string }> = {
    red:    { bg: 'bg-red-500',    text: 'text-red-500',    border: 'border-red-500',    light: 'bg-red-100' },
    blue:   { bg: 'bg-blue-500',   text: 'text-blue-500',   border: 'border-blue-500',   light: 'bg-blue-100' },
    green:  { bg: 'bg-green-500',  text: 'text-green-500',  border: 'border-green-500',  light: 'bg-green-100' },
    yellow: { bg: 'bg-yellow-400', text: 'text-yellow-600', border: 'border-yellow-400', light: 'bg-yellow-100' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-100' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-100' },
  };
  return map[color] ?? map['red'];
}
