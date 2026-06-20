export type AuctionType =
  | 'open'         // 공개 경매
  | 'fixed'        // 지정가 경매
  | 'secret'       // 비밀 경매
  | 'once-around'  // 한 바퀴 경매
  | 'double';      // 더블 경매

export type Artist = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  images: string[];
  titles?: Record<string, string>;
};

export type Card = {
  id: string;
  artistId: string;
  auctionType: AuctionType;
  artworkIndex: number; // 작가의 몇 번째 작품인지 (이미지 경로: /modern-art/{artistId}/{artworkIndex}.png)
};

export type PlayerState = {
  id: string;
  name: string;
  clientId: string; // 온라인 플레이어 식별자 (오프라인은 빈 문자열)
  cash: number;
  hand: Card[];
  collection: Card[];
};

// 공개 경매 (더블 경매는 cards.length === 2로 구분)
export type OpenAuction = {
  type: 'open';
  cards: Card[];
  sellerId: string;
  currentBid: number;
  currentWinnerId: string | null;
  activeBidderIds: string[];
  currentBidderIndex: number;
};

// 지정가 경매
export type FixedAuction = {
  type: 'fixed';
  cards: Card[];
  sellerId: string;
  fixedPrice: number;
  subPhase: 'setting' | 'offering';
  currentOfferIndex: number; // index into non-seller order
};

// 비밀 경매
export type SecretAuction = {
  type: 'secret';
  cards: Card[];
  sellerId: string;
  bids: Record<string, number>; // playerId → bid amount (-1 = not bid yet)
  bidOrder: string[]; // clockwise from seller, excluding seller
  subPhase: 'collecting' | 'revealing';
};

// 한 바퀴 경매
export type OnceAroundAuction = {
  type: 'once-around';
  cards: Card[];
  sellerId: string;
  currentBid: number;
  currentWinnerId: string | null;
  bidOrder: string[]; // starting from player after seller, seller goes last
  currentOfferIndex: number;
};

export type AuctionState =
  | OpenAuction
  | FixedAuction
  | SecretAuction
  | OnceAroundAuction;

export type AuctionResult = {
  winnerId: string;   // seller id if no one bids
  price: number;
  cards: Card[];
  sellerId: string;
  noContest: boolean; // true if seller wins by default (free)
  sellerPaysBank?: boolean; // true if seller must pay bank (fixed auction all-decline)
};

export type RoundRanking = {
  artistId: string;
  count: number;
  rank: number | null; // 1,2,3 or null
  addedValue: number;
  cumulativeValue: number;
};

export type RoundResult = {
  round: number;
  rankings: RoundRanking[];
};

export type GamePhase =
  | 'turn-cover'
  | 'select-card'
  | 'double-select-second'
  | 'double-pass-second'
  | 'auction'
  | 'auction-result'
  | 'round-scoring'
  | 'game-over';

export type GameState = {
  players: PlayerState[];
  currentPlayerIndex: number;
  round: number;
  maxRounds: number;
  phase: GamePhase;
  deck: Card[];
  roundMarket: Record<string, number>; // artistId → count sold this round
  artistValues: Record<string, number>; // artistId → cumulative value
  roundResults: RoundResult[];
  currentAuction: AuctionState | null;
  pendingDoubleCardId: string | null;
  pendingDoublePassPlayerIdx: number | null; // double-pass-second: index of player being asked
  lastAuctionResult: AuctionResult | null;
  roundEndArtistId: string | null;
};
