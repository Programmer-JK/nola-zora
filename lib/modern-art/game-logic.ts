import {
  GameState, PlayerState, Card, AuctionState,
  OpenAuction, FixedAuction, SecretAuction, OnceAroundAuction,
  AuctionResult, RoundRanking, GamePhase,
} from './types';
import {
  ARTISTS, STARTING_CASH, ROUND_END_COUNT, RANKING_VALUES,
  CARDS_PER_ROUND, generateDeck,
} from './game-data';

// ─── 게임 생성 ────────────────────────────────────────────────
export function createGame(
  playerNames: string[] | { name: string; clientId: string }[],
  maxRounds = 4,
): GameState {
  const deck = generateDeck();
  const players: PlayerState[] = playerNames.map((entry, i) => {
    const name = typeof entry === 'string' ? entry : entry.name;
    const clientId = typeof entry === 'string' ? '' : entry.clientId;
    return { id: `p${i}`, name, clientId, cash: STARTING_CASH, hand: [], collection: [] };
  });

  const state: GameState = {
    players,
    currentPlayerIndex: 0,
    round: 1,
    maxRounds,
    phase: 'turn-cover',
    deck,
    roundMarket: {},
    artistValues: Object.fromEntries(ARTISTS.map(a => [a.id, 0])),
    roundResults: [],
    currentAuction: null,
    pendingDoubleCardId: null,
    pendingDoublePassPlayerIdx: null,
    lastAuctionResult: null,
    roundEndArtistId: null,
  };

  return dealRoundCards(state);
}

// ─── 라운드 카드 지급 ─────────────────────────────────────────
export function dealRoundCards(state: GameState): GameState {
  const playerCount = state.players.length;
  const schedule = CARDS_PER_ROUND[playerCount] ?? CARDS_PER_ROUND[3];
  const count = schedule[state.round - 1] ?? 0;
  let deck = [...state.deck];

  const players = state.players.map(p => {
    const newCards = deck.splice(0, Math.min(count, deck.length));
    return { ...p, hand: [...p.hand, ...newCards] };
  });

  return { ...state, players, deck };
}

// ─── 카드 선택 ────────────────────────────────────────────────
export function selectCard(state: GameState, cardId: string): GameState {
  const player = state.players[state.currentPlayerIndex];
  const card = player.hand.find(c => c.id === cardId);
  if (!card) return state;

  if (card.auctionType === 'double') {
    // 두 번째 카드는 같은 작가이면서 더블이 아닌 카드만 허용
    const sameArtist = player.hand.filter(c => c.id !== cardId && c.artistId === card.artistId && c.auctionType !== 'double');
    if (sameArtist.length > 0) {
      return { ...state, pendingDoubleCardId: cardId, phase: 'double-select-second' };
    }
    // 본인에게 두 번째 카드 없음 → 다음 플레이어에게 제공 기회 전달
    const nextPlayerIdx = (state.currentPlayerIndex + 1) % state.players.length;
    return {
      ...state,
      pendingDoubleCardId: cardId,
      pendingDoublePassPlayerIdx: nextPlayerIdx,
      phase: 'double-pass-second',
    };
  }

  if (card.auctionType === 'fixed') {
    // 5번째 카드 체크
    const currentCount = state.roundMarket[card.artistId] ?? 0;
    if (currentCount + 1 >= ROUND_END_COUNT) {
      const players = removeCardFromHand(state.players, player.id, cardId);
      const roundMarket = { ...state.roundMarket, [card.artistId]: currentCount + 1 };
      return {
        ...state,
        players,
        roundMarket,
        currentAuction: null,
        roundEndArtistId: card.artistId,
        lastAuctionResult: {
          winnerId: player.id,
          price: 0,
          cards: [card],
          sellerId: player.id,
          noContest: true,
        },
        phase: 'auction-result',
      };
    }
    const players = removeCardFromHand(state.players, player.id, cardId);
    const auction: FixedAuction = {
      type: 'fixed',
      cards: [card],
      sellerId: player.id,
      fixedPrice: 0,
      subPhase: 'setting',
      currentOfferIndex: 0,
    };
    return { ...state, players, currentAuction: auction, phase: 'auction' };
  }

  return beginAuction(state, [card]);
}

export function selectDoubleSecond(state: GameState, secondCardId: string): GameState {
  const firstCardId = state.pendingDoubleCardId!;
  const player = state.players[state.currentPlayerIndex];
  const first = player.hand.find(c => c.id === firstCardId)!;
  const second = player.hand.find(c => c.id === secondCardId)!;
  return beginAuction({ ...state, pendingDoubleCardId: null }, [first, second]);
}

// 더블 경매 패스: 다른 플레이어가 두 번째 카드 제공
export function doublePassOffer(state: GameState, secondCardId: string): GameState {
  const firstCardId = state.pendingDoubleCardId!;
  const originalSeller = state.players[state.currentPlayerIndex];
  const offeringPlayer = state.players[state.pendingDoublePassPlayerIdx!];

  const first = originalSeller.hand.find(c => c.id === firstCardId)!;
  const second = offeringPlayer.hand.find(c => c.id === secondCardId)!;

  // 제공자의 패에서 두 번째 카드 제거
  const players = state.players.map(p =>
    p.id === offeringPlayer.id ? { ...p, hand: p.hand.filter(c => c.id !== secondCardId) } : p
  );

  const newState = {
    ...state,
    players,
    pendingDoubleCardId: null,
    pendingDoublePassPlayerIdx: null,
  };
  // beginAuction이 originalSeller의 패에서 first를 제거하고 경매 시작
  return beginAuction(newState, [first, second]);
}

// 더블 경매 패스: 현재 플레이어가 두 번째 카드 거절 → 다음 플레이어에게 넘기거나 종료
export function doublePassDecline(state: GameState): GameState {
  const n = state.players.length;
  const currentAskIdx = state.pendingDoublePassPlayerIdx!;
  const originalSellerIdx = state.currentPlayerIndex;

  const nextAskIdx = (currentAskIdx + 1) % n;

  if (nextAskIdx === originalSellerIdx) {
    // 모든 플레이어 거절 → 더블 카드 단독으로 공개 경매 진행 (원작 룰)
    const firstCardId = state.pendingDoubleCardId!;
    const originalSeller = state.players[originalSellerIdx];
    const firstCard = originalSeller.hand.find(c => c.id === firstCardId)!;

    return beginAuction(
      {
        ...state,
        pendingDoubleCardId: null,
        pendingDoublePassPlayerIdx: null,
      },
      [firstCard]
    );
  }

  // 다음 플레이어에게 기회 전달
  return {
    ...state,
    pendingDoublePassPlayerIdx: nextAskIdx,
  };
}

// ─── 경매 시작 ────────────────────────────────────────────────
function beginAuction(state: GameState, cards: Card[]): GameState {
  const player = state.players[state.currentPlayerIndex];
  const cardIds = new Set(cards.map(c => c.id));
  const players = state.players.map(p =>
    p.id === player.id ? { ...p, hand: p.hand.filter(c => !cardIds.has(c.id)) } : p
  );

  // 5번째 카드 체크: 이 카드를 올리면 ROUND_END_COUNT 이상이 되면 경매 없이 라운드 종료
  const artistId = cards[0].artistId;
  const currentCount = state.roundMarket[artistId] ?? 0;
  if (currentCount + cards.length >= ROUND_END_COUNT) {
    const roundMarket = { ...state.roundMarket, [artistId]: currentCount + cards.length };
    return {
      ...state,
      players,
      roundMarket,
      currentAuction: null,
      roundEndArtistId: artistId,
      lastAuctionResult: {
        winnerId: player.id,
        price: 0,
        cards,
        sellerId: player.id,
        noContest: true,
      },
      phase: 'auction-result',
    };
  }

  // 더블 경매(카드 2장)는 두 번째 카드 타입이 경매 방식을 결정.
  // 더블 카드를 단독으로 낼 경우(두 번째 카드 없음)는 공개 경매로 처리.
  const rawType = cards.length === 2 ? cards[1].auctionType : cards[0].auctionType;
  const effectiveType = rawType === 'double' ? 'open' : rawType;

  const nonSellers = state.players.filter(p => p.id !== player.id).map(p => p.id);
  const sellerIdx = state.players.findIndex(p => p.id === player.id);

  let auction: AuctionState;

  if (effectiveType === 'open') {
    auction = {
      type: 'open',
      cards,
      sellerId: player.id,
      currentBid: 0,
      currentWinnerId: null,
      activeBidderIds: nonSellers,
      currentBidderIndex: 0,
    } as OpenAuction;
  } else if (effectiveType === 'fixed') {
    auction = {
      type: 'fixed',
      cards,
      sellerId: player.id,
      fixedPrice: 0,
      subPhase: 'setting',
      currentOfferIndex: 0,
    } as FixedAuction;
  } else if (effectiveType === 'secret') {
    // 판매자 제외, 판매자 다음 플레이어부터 시계방향 순서 (동점 우선순위용)
    const bidOrder = [
      ...state.players.slice(sellerIdx + 1).map(p => p.id),
      ...state.players.slice(0, sellerIdx).map(p => p.id),
    ];
    auction = {
      type: 'secret',
      cards,
      sellerId: player.id,
      bids: Object.fromEntries(bidOrder.map(id => [id, -1])),
      bidOrder,
      subPhase: 'collecting',
    } as SecretAuction;
  } else { // once-around
    // 판매자 다음부터 시작, 판매자가 마지막
    const bidOrder = [
      ...state.players.slice(sellerIdx + 1).map(p => p.id),
      ...state.players.slice(0, sellerIdx).map(p => p.id),
      player.id, // 판매자 마지막
    ];
    auction = {
      type: 'once-around',
      cards,
      sellerId: player.id,
      currentBid: 0,
      currentWinnerId: null,
      bidOrder,
      currentOfferIndex: 0,
    } as OnceAroundAuction;
  }

  return { ...state, players, currentAuction: auction, phase: 'auction' };
}

// ─── 공개/더블 경매 ──────────────────────────────────────────
export function openBid(state: GameState, amount: number): GameState {
  const a = state.currentAuction as OpenAuction;
  if (!a || a.type !== 'open') return state;
  if (amount <= a.currentBid) return state;

  const bidderId = a.activeBidderIds[a.currentBidderIndex];
  const bidder = state.players.find(p => p.id === bidderId);
  if (!bidder || bidder.cash < amount) return state;

  const nextIdx = (a.currentBidderIndex + 1) % a.activeBidderIds.length;
  return {
    ...state,
    currentAuction: { ...a, currentBid: amount, currentWinnerId: bidderId, currentBidderIndex: nextIdx },
  };
}

export function openStand(state: GameState): GameState {
  // 현재 최고 입찰자가 "그대로"를 선택 → 경매 종료
  const a = state.currentAuction as OpenAuction;
  if (!a) return state;
  return resolveAuction(state, {
    winnerId: a.currentWinnerId ?? a.sellerId,
    price: a.currentBid,
    cards: a.cards,
    sellerId: a.sellerId,
    noContest: !a.currentWinnerId,
  });
}

export function openPass(state: GameState): GameState {
  const a = state.currentAuction as OpenAuction;
  if (!a) return state;

  const newActive = a.activeBidderIds.filter((_, i) => i !== a.currentBidderIndex);

  if (newActive.length === 0) {
    return resolveAuction(state, {
      winnerId: a.currentWinnerId ?? a.sellerId,
      price: a.currentBid,
      cards: a.cards,
      sellerId: a.sellerId,
      noContest: !a.currentWinnerId,
    });
  }

  const newIdx = a.currentBidderIndex >= newActive.length ? 0 : a.currentBidderIndex;

  // 남은 플레이어가 1명이고 그게 현재 최고 입찰자면 종료
  if (newActive.length === 1 && newActive[0] === a.currentWinnerId) {
    return resolveAuction(state, {
      winnerId: a.currentWinnerId,
      price: a.currentBid,
      cards: a.cards,
      sellerId: a.sellerId,
      noContest: false,
    });
  }

  // 남은 플레이어가 1명이고 현재 입찰액 이상 지불 불가능하면 자동 종료
  if (newActive.length === 1 && newActive[0] !== a.currentWinnerId) {
    const lastBidder = state.players.find(p => p.id === newActive[0]);
    if (lastBidder && lastBidder.cash <= a.currentBid) {
      return resolveAuction(state, {
        winnerId: a.currentWinnerId ?? a.sellerId,
        price: a.currentBid,
        cards: a.cards,
        sellerId: a.sellerId,
        noContest: !a.currentWinnerId,
      });
    }
  }

  return {
    ...state,
    currentAuction: { ...a, activeBidderIds: newActive, currentBidderIndex: newIdx },
  };
}

// ─── 지정가 경매 ─────────────────────────────────────────────
export function fixedSetPrice(state: GameState, price: number): GameState {
  const a = state.currentAuction as FixedAuction;
  if (!a || a.type !== 'fixed') return state;
  return {
    ...state,
    currentAuction: { ...a, fixedPrice: price, subPhase: 'offering', currentOfferIndex: 0 },
  };
}

export function fixedAccept(state: GameState): GameState {
  const a = state.currentAuction as FixedAuction;
  if (!a || a.type !== 'fixed') return state;

  const nonSellers = state.players.filter(p => p.id !== a.sellerId);
  const buyer = nonSellers[a.currentOfferIndex];
  if (!buyer) return state;

  // 잔고 부족 시 자동 거절
  if (buyer.cash < a.fixedPrice) return fixedDecline(state);

  return resolveAuction(state, {
    winnerId: buyer.id,
    price: a.fixedPrice,
    cards: a.cards,
    sellerId: a.sellerId,
    noContest: false,
  });
}

export function fixedDecline(state: GameState): GameState {
  const a = state.currentAuction as FixedAuction;
  if (!a || a.type !== 'fixed') return state;

  const nonSellers = state.players.filter(p => p.id !== a.sellerId);
  const nextIdx = a.currentOfferIndex + 1;

  if (nextIdx >= nonSellers.length) {
    // 모두 거절 → 판매자가 은행에 고정가 지불 후 강제 낙찰
    return resolveAuction(state, {
      winnerId: a.sellerId,
      price: a.fixedPrice,
      cards: a.cards,
      sellerId: a.sellerId,
      noContest: false,
      sellerPaysBank: true,
    });
  }

  return { ...state, currentAuction: { ...a, currentOfferIndex: nextIdx } };
}

// ─── 비밀 경매 ───────────────────────────────────────────────
// 동시 입찰: 각 플레이어가 자신의 ID로 독립적으로 입찰
export function secretSubmitBid(state: GameState, amount: number, bidderId: string): GameState {
  const a = state.currentAuction as SecretAuction;
  if (!a || a.type !== 'secret') return state;
  if (!(bidderId in a.bids)) return state; // 참여 불가 (판매자 등)
  if ((a.bids[bidderId] ?? -1) >= 0) return state; // 이미 입찰함

  // 잔고 체크: 보유 현금보다 높은 금액 입찰 불가
  const bidder = state.players.find(p => p.id === bidderId);
  if (!bidder || bidder.cash < amount) return state;

  const newBids = { ...a.bids, [bidderId]: amount };
  const allSubmitted = Object.values(newBids).every(b => b >= 0);

  return {
    ...state,
    currentAuction: {
      ...a,
      bids: newBids,
      subPhase: allSubmitted ? 'revealing' : 'collecting',
    },
  };
}

export function secretResolve(state: GameState): GameState {
  const a = state.currentAuction as SecretAuction;
  if (!a || a.type !== 'secret') return state;

  // bidOrder(시계방향) 순서로 순회 → 동점 시 판매자에게 가장 가까운 플레이어 우선
  let maxBid = -1;
  let winnerId: string | null = null;

  for (const id of a.bidOrder) {
    const bid = a.bids[id] ?? -1;
    if (bid > maxBid) {
      maxBid = bid;
      winnerId = id;
    }
  }

  const finalPrice = Math.max(0, maxBid);
  return resolveAuction(state, {
    winnerId: winnerId ?? a.sellerId,
    price: finalPrice,
    cards: a.cards,
    sellerId: a.sellerId,
    noContest: winnerId === null,
  });
}

// ─── 한 바퀴 경매 ────────────────────────────────────────────
export function onceAroundBid(state: GameState, amount: number): GameState {
  const a = state.currentAuction as OnceAroundAuction;
  if (!a || a.type !== 'once-around') return state;
  if (amount <= a.currentBid) return state;

  const bidderId = a.bidOrder[a.currentOfferIndex];
  const bidder = state.players.find(p => p.id === bidderId);
  if (!bidder || bidder.cash < amount) return state;

  const nextIdx = a.currentOfferIndex + 1;
  const updatedAuction: OnceAroundAuction = {
    ...a,
    currentBid: amount,
    currentWinnerId: bidderId,
    currentOfferIndex: nextIdx,
  };

  if (nextIdx >= a.bidOrder.length) {
    return resolveAuction(state, {
      winnerId: bidderId,
      price: amount,
      cards: a.cards,
      sellerId: a.sellerId,
      noContest: false,
    });
  }

  return { ...state, currentAuction: updatedAuction };
}

export function onceAroundPass(state: GameState): GameState {
  const a = state.currentAuction as OnceAroundAuction;
  if (!a || a.type !== 'once-around') return state;

  const nextIdx = a.currentOfferIndex + 1;

  if (nextIdx >= a.bidOrder.length) {
    return resolveAuction(state, {
      winnerId: a.currentWinnerId ?? a.sellerId,
      price: a.currentBid,
      cards: a.cards,
      sellerId: a.sellerId,
      noContest: !a.currentWinnerId,
    });
  }

  return { ...state, currentAuction: { ...a, currentOfferIndex: nextIdx } };
}

// ─── 경매 낙찰 처리 ──────────────────────────────────────────
function resolveAuction(state: GameState, result: AuctionResult): GameState {
  const { winnerId, price, cards, sellerId, noContest, sellerPaysBank } = result;

  let players = state.players.map(p => {
    let cash = p.cash;
    let collection = p.collection;

    if (sellerPaysBank) {
      // 고정가 경매 전원 거절: 판매자가 은행에 고정가 지불
      if (p.id === sellerId) cash -= price;
    } else if (!noContest && winnerId !== sellerId) {
      if (p.id === winnerId) cash -= price;
      if (p.id === sellerId) cash += price;
    }

    if (p.id === winnerId) {
      collection = [...p.collection, ...cards];
    }

    return { ...p, cash, collection };
  });

  // 시장 카드 수 갱신
  const roundMarket = { ...state.roundMarket };
  for (const card of cards) {
    roundMarket[card.artistId] = (roundMarket[card.artistId] ?? 0) + 1;
  }

  // 라운드 종료 체크
  let roundEndArtistId: string | null = null;
  for (const [artistId, count] of Object.entries(roundMarket)) {
    if (count >= ROUND_END_COUNT) {
      roundEndArtistId = artistId;
      break;
    }
  }

  return {
    ...state,
    players,
    roundMarket,
    currentAuction: null,
    lastAuctionResult: result,
    roundEndArtistId,
    phase: 'auction-result',
  };
}

// ─── 경매 결과 확인 후 → 다음 턴 or 라운드 종료 ─────────────
export function acknowledgeResult(state: GameState): GameState {
  if (state.roundEndArtistId) {
    return scoreRound(state);
  }

  // 손패가 없는 플레이어만 있으면 라운드 강제 종료
  const anyoneHasCards = state.players.some(p => p.hand.length > 0);
  if (!anyoneHasCards) return scoreRound(state);

  // 다음 플레이어 (손패가 있는 플레이어 찾기)
  const n = state.players.length;
  let nextIdx = (state.currentPlayerIndex + 1) % n;
  let tries = 0;
  while (state.players[nextIdx].hand.length === 0 && tries < n) {
    nextIdx = (nextIdx + 1) % n;
    tries++;
  }

  return {
    ...state,
    currentPlayerIndex: nextIdx,
    lastAuctionResult: null,
    roundEndArtistId: null,
    phase: 'turn-cover',
  };
}

// ─── 라운드 채점 ─────────────────────────────────────────────
function scoreRound(state: GameState): GameState {
  const { roundMarket } = state;

  const sorted = ARTISTS.map(a => ({
    artistId: a.id,
    count: roundMarket[a.id] ?? 0,
  })).sort((a, b) => b.count - a.count);

  const newValues = { ...state.artistValues };
  const rankings: RoundRanking[] = sorted.map((item, idx) => {
    const addedValue = item.count > 0 ? (RANKING_VALUES[idx] ?? 0) : 0;
    newValues[item.artistId] = (newValues[item.artistId] ?? 0) + addedValue;
    return {
      artistId: item.artistId,
      count: item.count,
      rank: addedValue > 0 ? idx + 1 : null,
      addedValue,
      cumulativeValue: newValues[item.artistId],
    };
  });

  return {
    ...state,
    artistValues: newValues,
    roundResults: [...state.roundResults, { round: state.round, rankings }],
    phase: 'round-scoring',
  };
}

// ─── 라운드 채점 확인 후 → 다음 라운드 or 게임 종료 ─────────
export function acknowledgeScoring(state: GameState): GameState {
  if (state.round >= state.maxRounds) {
    return { ...state, phase: 'game-over' };
  }

  const nextState: GameState = {
    ...state,
    round: state.round + 1,
    currentPlayerIndex: 0,
    roundMarket: {},
    roundEndArtistId: null,
    lastAuctionResult: null,
    phase: 'turn-cover',
  };

  return dealRoundCards(nextState);
}

// ─── 최종 자산 계산 ──────────────────────────────────────────
export function calcFinalScores(state: GameState) {
  return state.players
    .map(p => {
      const collectionValue = p.collection.reduce(
        (sum, card) => sum + (state.artistValues[card.artistId] ?? 0),
        0
      );
      return {
        id: p.id,
        name: p.name,
        cash: p.cash,
        collectionValue,
        total: p.cash + collectionValue,
        cardsByArtist: ARTISTS.map(a => ({
          artistId: a.id,
          count: p.collection.filter(c => c.artistId === a.id).length,
          value: state.artistValues[a.id] ?? 0,
        })),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── 유틸 ────────────────────────────────────────────────────
function removeCardFromHand(
  players: PlayerState[],
  playerId: string,
  cardId: string
): PlayerState[] {
  return players.map(p =>
    p.id === playerId ? { ...p, hand: p.hand.filter(c => c.id !== cardId) } : p
  );
}

export function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
}

export function getPlayerById(state: GameState, id: string) {
  return state.players.find(p => p.id === id);
}
