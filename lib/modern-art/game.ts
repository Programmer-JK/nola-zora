// 모던아트 순수 게임 로직 — 모던아트_룰북.md 기준
// 상태 → 액션 → 새 상태. 잘못된 액션은 에러 문자열을 던진다.

export type AuctionType = 'open' | 'once' | 'sealed' | 'fixed' | 'double';
/** 실제 경매 진행 방식 (1+1은 두 번째 카드의 방식을 따름) */
export type BidType = Exclude<AuctionType, 'double'>;

// 작가 = public/modern-art/{dir}/ 폴더. 작품 1점 = 카드 1장. 순서 = 동점 시 우선순위.
const art = (dir: string, list: [string, string][]) => list.map(([file, title]) => ({ src: `/modern-art/${dir}/${file}`, title }));
export const ARTISTS = [
  { name: '포켓몬', emoji: '⚡', color: '#ef4444', works: art('pokemon', [
    ['pokemon-bulbasaur.png', '이상해씨'], ['pokemon-cute.png', '이브이'], ['pokemon-duck.png', '고라파덕'],
    ['pokemon-fire.png', '파이리'], ['pokemon-ice.png', '루주라'], ['pokemon-king.png', '킹드라'],
    ['pokemon-lapras.png', '라프라스'], ['pokemon-lizard.png', '리자드'], ['pokemon-mew.png', '뮤'],
    ['pokemon-mewtwo.png', '뮤츠'], ['pokemon-pikachu.png', '피카츄'], ['pokemon-requka.png', '레쿠쟈'],
    ['pokemon-whale.png', '고래왕자'], ['pokemon-white.png', '레시라무'],
  ]) },
  { name: '디지몬', emoji: '🦕', color: '#8b5cf6', works: art('digmon', [
    ['digimon-angewoman.jpg', '엔젤우몬'], ['digimon-darkwargreymon.png', '블랙워그레이몬'], ['digimon-dukemon.jpg', '듀크몬'],
    ['digimon-imperialdramon.jpg', '임페리얼드라몬'], ['digimon-patamon.jpg', '파타몬'], ['digimon-piemon.png', '피에몬'],
    ['digimon-powerdramon.jpg', '파워드라몬'], ['digimon-terriamon.jpg', '테리어몬'], ['digimon-wargreymon.jpg', '워그레이몬'],
    ['digmon-agumon.jpg', '아구몬'], ['digmon-omegamon.jpg', '오메가몬'], ['digmon-vmon.jpg', '브이몬'],
    ['digmon-wizardmon.jpg', '위자몬'],
  ]) },
  { name: '유희왕', emoji: '🃏', color: '#f59e0b', works: art('yugi', [
    ['yugi-dark-magician-girl.jpg', '블랙 매지션 걸'], ['yugi-dark-magician.jpg', '블랙 매지션'], ['yugi-exodia.jpg', '엑조디아'],
    ['yugi-kuriboh.jpg', '쿠리보'], ['yugi-magi-kuriboh.jpg', '매직 쿠리보'], ['yugi-monster-reborn.jpg', '죽은 자의 소생'],
    ['yugi-obelisk-the-tormentor.jpg', '오벨리스크의 거신병'], ['yugi-pot-of-greed.jpg', '욕망의 항아리'],
    ['yugi-red-eyes-black-dragon.jpg', '붉은 눈의 흑룡'], ['yugi-slifer-the-sky-dragon.jpg', '하늘의 신 오시리스'],
    ['yugi-the-winged-dragon-of-ra.jpg', '태양의 신 라'], ['yugi-white-dragon.jpg', '청안의 백룡'],
  ]) },
  { name: '닌텐도', emoji: '🍄', color: '#3b82f6', works: art('nintendo', [
    ['nintendo-animal.jpg', '모여봐요 동물의 숲'], ['nintendo-game.jpg', '닌텐도 스위치'], ['nintendo-hero.png', '메트로이드'],
    ['nintendo-kerby.png', '커비'], ['nintendo-kery2.png', '커비의 모험'], ['nintendo-mario-p.jpg', '슈퍼 마리오'],
    ['nintendo-mario2.jpg', '마리오 오디세이'], ['nintendo-splatoon.jpg', '스플래툰'], ['nintendo-yoshi.jpg', '요시'],
    ['nintendo-zelda.jpg', '젤다의 전설'], ['nintendo-zelda2.jpg', '야생의 숨결'],
  ]) },
  { name: '인디게임', emoji: '🎮', color: '#10b981', works: art('indi', [
    ['indi-arpia.png', '아르피아'], ['indi-baldaur.png', '발더스 게이트'], ['indi-hollow.png', '할로우 나이트'],
    ['indi-minecraft.png', '마인크래프트'], ['indi-ori.png', '오리와 눈먼 숲'], ['indi-repo.png', '레포'],
    ['indi-riskofrain.png', '리스크 오브 레인'], ['indi-stardewvally.png', '스타듀 밸리'],
    ['indi-terraria.jpg', '테라리아'], ['indi-undertaii.jpg', '언더테일'],
  ]) },
];

/** 카드 id = 작가*100 + 작품 번호 */
export const workOf = (c: { id: number; artist: number }) => ARTISTS[c.artist].works[c.id % 100];

export const AUCTION_INFO: Record<AuctionType, { label: string; emoji: string; desc: string }> = {
  open: { label: '자유 경매', emoji: '📣', desc: '돌아가며 더 높은 가격을 부르거나 패스. 나머지 전원이 연속 패스하면 최고가 낙찰.' },
  once: { label: '순차 경매', emoji: '🔄', desc: '출품자 다음부터 한 번씩만 입찰/패스. 한 바퀴 후 최고가 낙찰.' },
  sealed: { label: '비밀 입찰', emoji: '🤫', desc: '전원이 동시에 비밀 입찰. 공개 후 최고가 낙찰 (동점은 출품자 왼쪽부터).' },
  fixed: { label: '고정 가격', emoji: '🏷️', desc: '출품자가 가격을 정하고, 순서대로 구매/패스. 먼저 구매한 사람이 가져감.' },
  double: { label: '1+1', emoji: '🎴', desc: '같은 작가 작품 1장을 더 붙여 2점을 한 번에 경매. 경매 방식은 두 번째 카드를 따르고, 2장 판매로 집계. 붙일 카드가 없으면 단독 자유 경매.' },
};

export const START_MONEY = 100;
export const SALES_PER_ROUND = 5;
export const ROUND_VALUES = [30, 20, 10];
export const TOTAL_ROUNDS = 4;
// shortcut: 라운드당 판매가 5장뿐이라 원작보다 적게 배분. 손패가 남으면 다음 라운드로 이월.
const DEAL = [5, 2, 2, 2];
// 작가당 14장 기준: 자유 4 · 순차 2 · 비밀 4 · 고정 2 · 1+1 2
const TYPES: AuctionType[] = ['open', 'once', 'sealed', 'fixed', 'double', 'open', 'sealed'];

export type Card = { id: number; artist: number; type: AuctionType };
export type Player = { id: string; name: string; money: number; hand: Card[]; won: Card[] };
export type Auction = {
  card: Card;                 // 경매 방식을 정하는 카드
  extra: Card | null;         // 1+1로 함께 올린 1+1 카드
  type: BidType;
  seller: number;
  price: number;              // 현재 최고가 또는 고정가 (0 = 미정)
  high: number | null;        // 최고 입찰자
  turn: number;               // 지금 행동할 플레이어 (sealed 제외)
  acted: number;              // open: 연속 패스 수, once/fixed: 행동한 인원
  bids: Record<number, number>; // sealed 전용
  acts: Record<number, number>; // open/once/fixed: 플레이어별 마지막 행동 (금액, -1 = 패스)
};
export type Sale = { card: Card; extra: Card | null; seller: number; buyer: number | null; price: number };
export type RoundResult = { round: number; sold: number[]; values: number[]; payouts: number[]; bought: Card[][] };
export type GameState = {
  players: Player[];
  deck: Card[];
  round: number;
  phase: 'play' | 'auction' | 'roundEnd' | 'over';
  current: number;            // 카드를 낼 차례
  sold: number[];             // 이번 라운드 작가별 판매량
  auction: Auction | null;
  lastSale: Sale | null;      // 직전 경매 결과 (buyer null = 유찰)
  results: RoundResult[];
  log: string[];
};
export type Action =
  | { t: 'play'; cardId: number; secondId?: number; price?: number }
  | { t: 'price'; amount: number }
  | { t: 'bid'; amount: number }
  | { t: 'pass' }
  | { t: 'next' };

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(players: { id: string; name: string }[]): GameState {
  const deck: Card[] = [];
  // 60장(14/13/12/11/10). 5인 × 11장 = 55장이라 충분
  ARTISTS.forEach((a, artist) => {
    a.works.forEach((_, k) => deck.push({ id: artist * 100 + k, artist, type: TYPES[k % TYPES.length] }));
  });
  const s: GameState = {
    players: players.map(p => ({ ...p, money: START_MONEY, hand: [], won: [] })),
    deck: shuffle(deck),
    round: 1,
    phase: 'play',
    current: Math.floor(Math.random() * players.length),
    sold: [0, 0, 0, 0, 0],
    auction: null,
    lastSale: null,
    results: [],
    log: ['1라운드 시작!'],
  };
  deal(s);
  return s;
}

function deal(s: GameState) {
  const n = DEAL[s.round - 1];
  for (const p of s.players) p.hand.push(...s.deck.splice(0, n));
}

const nextIdx = (s: GameState, i: number) => (i + 1) % s.players.length;
const others = (s: GameState) => s.players.length - 1;
const say = (s: GameState, msg: string) => { s.log = [msg, ...s.log].slice(0, 30); };
const artistName = (c: Card) => ARTISTS[c.artist].name;

/** 1+1 카드와 함께 올릴 수 있는 카드: 같은 작가의 1+1이 아닌 카드 */
export const doublePartners = (hand: Card[], dbl: Card) =>
  hand.filter(c => c.artist === dbl.artist && c.type !== 'double');

/** from 다음부터(from 포함은 마지막) 출품 가능한 플레이어. 아무도 없으면 -1.
 *  손패가 있어도 다른 전원이 $0이면 팔 수 없으니 건너뛴다 (유찰 무한 반복 방지). */
function nextPlayerWithCards(s: GameState, from: number): number {
  for (let k = 1; k <= s.players.length; k++) {
    const i = (from + k) % s.players.length;
    if (s.players[i].hand.length && s.players.some((o, j) => j !== i && o.money > 0)) return i;
  }
  return -1;
}

export function apply(prev: GameState, me: number, a: Action): GameState {
  const s: GameState = structuredClone(prev);
  const p = s.players[me];
  if (!p) throw new Error('플레이어가 아닙니다.');

  if (a.t === 'next') {
    if (s.phase !== 'roundEnd') throw new Error('지금은 다음 라운드로 갈 수 없습니다.');
    s.round++;
    s.phase = 'play';
    s.sold = [0, 0, 0, 0, 0];
    s.lastSale = null;
    deal(s);
    const c = nextPlayerWithCards(s, s.current - 1 + s.players.length);
    if (c < 0) return endRound(s);
    s.current = c;
    say(s, `${s.round}라운드 시작!`);
    return s;
  }

  if (a.t === 'play') {
    if (s.phase !== 'play' || s.current !== me) throw new Error('내 차례가 아닙니다.');
    const first = p.hand.find(c => c.id === a.cardId);
    if (!first) throw new Error('손에 없는 카드입니다.');
    let card = first;
    let extra: Card | null = null;
    if (first.type === 'double') {
      const partners = doublePartners(p.hand, first);
      if (a.secondId !== undefined) {
        const second = partners.find(c => c.id === a.secondId);
        if (!second) throw new Error('같은 작가의 일반 작품만 함께 올릴 수 있습니다.');
        card = second;
        extra = first;
      } else if (partners.length) {
        throw new Error('1+1은 같은 작가 작품 1장을 함께 골라야 합니다.');
      }
    } else if (a.secondId !== undefined) {
      throw new Error('1+1 카드만 2장을 올릴 수 있습니다.');
    }
    // 단독 1+1은 자유 경매
    const type: BidType = card.type === 'double' ? 'open' : card.type;
    // 고정 가격은 출품과 동시에 가격을 정할 수 있다 (없으면 출품 후 'price' 액션)
    const price = type === 'fixed' && a.price !== undefined ? Math.floor(a.price) : 0;
    if (type === 'fixed' && a.price !== undefined && !(price >= 1)) throw new Error('가격은 1 이상이어야 합니다.');
    p.hand = p.hand.filter(c => c.id !== card.id && c.id !== extra?.id);
    s.phase = 'auction';
    s.auction = { card, extra, type, seller: me, price, high: null, turn: nextIdx(s, me), acted: 0, bids: {}, acts: {} };
    say(s, `${p.name}: ${artistName(card)} 작품 ${extra ? '2점 (1+1) ' : ''}출품 (${AUCTION_INFO[type].label}${price ? ` $${price}` : ''})`);
    return s;
  }

  const au = s.auction;
  if (s.phase !== 'auction' || !au) throw new Error('진행 중인 경매가 없습니다.');
  const amount = 'amount' in a ? Math.floor(a.amount) : 0;

  if (a.t === 'price') {
    if (au.type !== 'fixed' || au.price || me !== au.seller) throw new Error('가격을 정할 수 없습니다.');
    if (!(amount >= 1)) throw new Error('가격은 1 이상이어야 합니다.');
    au.price = amount;
    say(s, `고정 가격 ${amount}`);
    return s;
  }

  if (me === au.seller) throw new Error('자신의 작품에는 입찰할 수 없습니다.');

  if (au.type === 'sealed') {
    if (me in au.bids) throw new Error('이미 입찰했습니다.');
    const bid = a.t === 'pass' ? 0 : amount;
    if (bid < 0 || bid > p.money) throw new Error('보유 금액 이내로 입찰하세요.');
    au.bids[me] = bid;
    if (Object.keys(au.bids).length < others(s)) return s;
    // 동점이면 출품자 왼쪽(다음 순서)부터 우선
    let best = -1;
    for (let k = 1, i = nextIdx(s, au.seller); k <= others(s); k++, i = nextIdx(s, i)) {
      if (au.bids[i] > 0 && (best < 0 || au.bids[i] > au.bids[best])) best = i;
    }
    say(s, '공개: ' + Object.entries(au.bids).map(([i, b]) => `${s.players[+i].name} ${b}`).join(', '));
    return best < 0 ? unsold(s) : sell(s, best, au.bids[best]);
  }

  if (au.turn !== me) throw new Error('내 차례가 아닙니다.');
  if (au.type === 'fixed' && !au.price) throw new Error('출품자가 가격을 정하는 중입니다.');

  if (a.t === 'bid') {
    if (au.type === 'fixed') {
      if (p.money < au.price) throw new Error('돈이 부족합니다.');
      return sell(s, me, au.price);
    }
    if (amount <= au.price) throw new Error(`${au.price}보다 높게 입찰하세요.`);
    if (amount > p.money) throw new Error('돈이 부족합니다.');
    au.price = amount;
    au.high = me;
    au.acted = au.type === 'open' ? 0 : au.acted + 1;
    au.acts[me] = amount;
    say(s, `${p.name} → ${amount}`);
  } else {
    au.acted++;
    au.acts[me] = -1;
    say(s, `${p.name} 패스`);
  }

  // 종료 판정
  const done = au.type === 'open'
    ? au.acted >= (au.high === null ? others(s) : others(s) - 1)
    : au.acted >= others(s);
  if (done) return au.high === null ? unsold(s) : sell(s, au.high, au.price);

  au.turn = nextIdx(s, au.turn);
  if (au.turn === au.seller) au.turn = nextIdx(s, au.turn);
  return s;
}

function sell(s: GameState, buyer: number, price: number): GameState {
  const au = s.auction!;
  s.players[buyer].money -= price;
  s.players[au.seller].money += price;
  const cards = au.extra ? [au.card, au.extra] : [au.card];
  s.players[buyer].won.push(...cards);
  s.sold[au.card.artist] += cards.length;
  s.lastSale = { card: au.card, extra: au.extra, seller: au.seller, buyer, price };
  say(s, `💰 ${s.players[buyer].name}님이 ${artistName(au.card)} 작품${au.extra ? ' 2점' : ''}을 ${price}에 낙찰`);
  return afterAuction(s);
}

function unsold(s: GameState): GameState {
  const au = s.auction!;
  s.players[au.seller].hand.push(au.card, ...(au.extra ? [au.extra] : []));
  s.lastSale = { card: au.card, extra: au.extra, seller: au.seller, buyer: null, price: 0 };
  say(s, `유찰 — ${s.players[au.seller].name}님에게 작품이 돌아갑니다`);
  return afterAuction(s);
}

function afterAuction(s: GameState): GameState {
  const seller = s.auction!.seller;
  s.auction = null;
  const total = s.sold.reduce((x, y) => x + y, 0);
  const next = nextPlayerWithCards(s, seller);
  if (total >= SALES_PER_ROUND || next < 0) {
    s.current = next < 0 ? nextIdx(s, seller) : next;
    return endRound(s);
  }
  s.current = next;
  s.phase = 'play';
  return s;
}

/** 판매량 내림차순, 동점은 작가 순서. 1장 이상 팔린 상위 3작가만 가치. */
export function marketValues(sold: number[]): number[] {
  const order = sold.map((_, i) => i).sort((a, b) => sold[b] - sold[a] || a - b);
  const values = [0, 0, 0, 0, 0];
  order.slice(0, 3).forEach((artist, rank) => { if (sold[artist] > 0) values[artist] = ROUND_VALUES[rank]; });
  return values;
}

function endRound(s: GameState): GameState {
  const values = marketValues(s.sold);
  const payouts = s.players.map(p => p.won.reduce((sum, c) => sum + values[c.artist], 0));
  const bought = s.players.map(p => p.won);
  s.players.forEach((p, i) => { p.money += payouts[i]; p.won = []; });
  s.results.push({ round: s.round, sold: [...s.sold], values, payouts, bought });
  s.phase = s.round >= TOTAL_ROUNDS ? 'over' : 'roundEnd';
  say(s, `${s.round}라운드 종료 — 작품 정산 완료`);
  return s;
}
