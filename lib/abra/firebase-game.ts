import { ref, set, update, onValue, get, remove, onDisconnect } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { AbraGameState, AbraPlayer, AbraLogEntry, AbraCastResult } from './types';
import { createGame } from './game-logic';

// ─── Types ──────────────────────────────────────────────────

export type AbraRoomPlayer = {
  clientId: string;
  name: string;
};

export type AbraOnlineRoom = {
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: AbraRoomPlayer[];
  maxRounds: number;
  gameState: AbraGameState | null;
  createdAt: number;
  presence?: Record<string, boolean>;
  leftPlayerName?: string;
};

// ─── Sanitize (Firebase object → typed arrays) ──────────────

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

export function sanitizeGameState(raw: unknown): AbraGameState {
  const gs = raw as AbraGameState;

  const sanitizePlayer = (p: AbraPlayer): AbraPlayer => ({
    ...p,
    tiles: toArr(p.tiles),
    secretRevealed: toArr(p.secretRevealed),
  });

  const sanitizeCast = (c: AbraCastResult | null): AbraCastResult | null => {
    if (!c) return null;
    return { ...c, lines: toArr(c.lines), diceRoll: c.diceRoll ?? null, revealedTile: c.revealedTile ?? null };
  };

  return {
    ...gs,
    players: toArr(gs.players).map(sanitizePlayer),
    deck: toArr(gs.deck),
    secretPile: toArr(gs.secretPile),
    scores: toArr(gs.scores),
    log: toArr(gs.log),
    pendingCast: sanitizeCast(gs.pendingCast),
    roundScores: gs.roundScores ? toArr(gs.roundScores) : null,
    castCounts: toArr(gs.castCounts),
  };
}

// ─── Utils ──────────────────────────────────────────────────

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function roomRef(code: string) {
  return ref(getDb(), `abra/rooms/${code}`);
}

// ─── Room CRUD ───────────────────────────────────────────────

export async function createRoom(
  hostClientId: string,
  hostName: string,
  maxRounds: number,
): Promise<string> {
  const code = generateRoomCode();
  const room: AbraOnlineRoom = {
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

export async function joinRoom(
  code: string,
  clientId: string,
  name: string,
): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as AbraOnlineRoom;
  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  const players = toArr<AbraRoomPlayer>(room.players as unknown as Record<string, AbraRoomPlayer>);
  if (players.some(p => p.clientId === clientId)) return null; // re-join allowed
  if (players.length >= 6) return '방이 가득 찼습니다. (최대 6명)';
  await update(roomRef(code), { players: [...players, { clientId, name }] });
  return null;
}

export async function startGame(code: string, hostClientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as AbraOnlineRoom;
  if (room.hostClientId !== hostClientId) return '호스트만 게임을 시작할 수 있습니다.';
  const players = toArr<AbraRoomPlayer>(room.players as unknown as Record<string, AbraRoomPlayer>);
  if (players.length < 2) return '최소 2명이 필요합니다.';
  const gameState = createGame(
    players.map(p => ({ name: p.name, clientId: p.clientId })),
    room.maxRounds,
  );
  await update(roomRef(code), { status: 'playing', gameState });
  return null;
}

export async function updateGameState(code: string, gs: AbraGameState): Promise<void> {
  await update(roomRef(code), { gameState: gs });
}

export async function finishGame(code: string, leftPlayerName?: string): Promise<void> {
  const data: Record<string, unknown> = { status: 'finished' };
  if (leftPlayerName) data.leftPlayerName = leftPlayerName;
  await update(roomRef(code), data);
}

export async function registerPresence(code: string, clientId: string): Promise<() => void> {
  const pRef = ref(getDb(), `abra/rooms/${code}/presence/${clientId}`);
  await set(pRef, true);
  onDisconnect(pRef).remove();
  return () => { remove(pRef); };
}

export function subscribeRoom(
  code: string,
  cb: (room: AbraOnlineRoom | null) => void,
): () => void {
  return onValue(roomRef(code), snapshot => {
    if (!snapshot.exists()) { cb(null); return; }
    const raw = snapshot.val() as AbraOnlineRoom;
    const room: AbraOnlineRoom = {
      ...raw,
      players: toArr<AbraRoomPlayer>(raw.players as unknown as Record<string, AbraRoomPlayer>),
      gameState: raw.gameState ? sanitizeGameState(raw.gameState) : null,
    };
    cb(room);
  });
}
