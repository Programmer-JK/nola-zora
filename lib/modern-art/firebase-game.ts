import { ref, set, update, onValue, get } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { createGame } from './game-logic';
import {
  GameState, PlayerState, AuctionState,
  OpenAuction, FixedAuction, SecretAuction, OnceAroundAuction,
  RoundResult,
} from './types';

// ─── 타입 ────────────────────────────────────────────────────
export type RoomPlayer = {
  clientId: string;
  name: string;
};

export type OnlineRoom = {
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: RoomPlayer[];
  maxRounds: number;
  gameState: GameState | null;
  createdAt: number;
};

// ─── 유틸 ────────────────────────────────────────────────────
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

// ─── sanitize: Firebase 객체→배열 변환 ──────────────────────
export function sanitizeGameState(raw: unknown): GameState {
  const gs = raw as GameState;

  const sanitizePlayer = (p: PlayerState): PlayerState => ({
    ...p,
    hand: toArr(p.hand),
    collection: toArr(p.collection),
  });

  const sanitizeAuction = (a: AuctionState | null): AuctionState | null => {
    if (!a) return null;
    const cards = toArr((a as OpenAuction).cards);
    if (a.type === 'open' || a.type === 'double') {
      const oa = a as OpenAuction;
      return { ...oa, cards, activeBidderIds: toArr(oa.activeBidderIds) };
    }
    if (a.type === 'fixed') {
      return { ...(a as FixedAuction), cards };
    }
    if (a.type === 'secret') {
      const sa = a as SecretAuction;
      return { ...sa, cards, bidOrder: toArr(sa.bidOrder) };
    }
    if (a.type === 'once-around') {
      const oa = a as OnceAroundAuction;
      return { ...oa, cards, bidOrder: toArr(oa.bidOrder) };
    }
    return a;
  };

  const sanitizeRoundResult = (r: RoundResult): RoundResult => ({
    ...r,
    rankings: toArr(r.rankings),
  });

  return {
    ...gs,
    players: toArr(gs.players).map(sanitizePlayer),
    deck: toArr(gs.deck),
    roundResults: toArr(gs.roundResults).map(sanitizeRoundResult),
    currentAuction: sanitizeAuction(gs.currentAuction),
    roundMarket: gs.roundMarket ?? {},
    artistValues: gs.artistValues ?? {},
    lastAuctionResult: gs.lastAuctionResult
      ? { ...gs.lastAuctionResult, cards: toArr(gs.lastAuctionResult.cards) }
      : null,
  };
}

function roomRef(code: string) {
  return ref(getDb(), `modern-art/rooms/${code}`);
}

// ─── 룸 CRUD ─────────────────────────────────────────────────
export async function createRoom(
  hostClientId: string,
  hostName: string,
  maxRounds: number,
): Promise<string> {
  const code = generateRoomCode();
  const room: OnlineRoom = {
    code,
    status: 'waiting',
    hostClientId,
    players: [{ clientId: hostClientId, name: hostName }],
    maxRounds,
    gameState: null,
    createdAt: Date.now(),
  };
  await set(roomRef(code), room);
  return code;
}

export async function joinRoom(code: string, clientId: string, name: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as OnlineRoom;

  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  const players = toArr<RoomPlayer>(room.players as unknown as Record<string, RoomPlayer>);
  if (players.some(p => p.clientId === clientId)) return null; // 재참가 허용
  if (players.length >= 5) return '방이 가득 찼습니다.';

  const updated = [...players, { clientId, name }];
  await update(roomRef(code), { players: updated });
  return null;
}

export async function startGame(code: string, hostClientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as OnlineRoom;

  if (room.hostClientId !== hostClientId) return '호스트만 게임을 시작할 수 있습니다.';
  const players = toArr<RoomPlayer>(room.players as unknown as Record<string, RoomPlayer>);
  if (players.length < 2) return '최소 2명이 필요합니다.';

  const gameState = createGame(
    players.map(p => ({ name: p.name, clientId: p.clientId })),
    room.maxRounds,
  );
  // turn-cover는 온라인에서 불필요 → 즉시 select-card
  const initialState = { ...gameState, phase: 'select-card' as const };

  await update(roomRef(code), { status: 'playing', gameState: initialState });
  return null;
}

export async function updateGameState(code: string, gs: GameState): Promise<void> {
  await update(roomRef(code), { gameState: gs });
}

export async function finishGame(code: string): Promise<void> {
  await update(roomRef(code), { status: 'finished' });
}

export function subscribeRoom(code: string, cb: (room: OnlineRoom | null) => void): () => void {
  const unsubscribe = onValue(roomRef(code), snapshot => {
    if (!snapshot.exists()) { cb(null); return; }
    const raw = snapshot.val() as OnlineRoom;
    const room: OnlineRoom = {
      ...raw,
      players: toArr<RoomPlayer>(raw.players as unknown as Record<string, RoomPlayer>),
      gameState: raw.gameState ? sanitizeGameState(raw.gameState) : null,
    };
    cb(room);
  });
  return unsubscribe;
}
