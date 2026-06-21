import { ref, set, get, update, onValue } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import type { YachtCatId } from './types';

export interface YachtRoomPlayer {
  clientId: string;
  name: string;
  color: string;
}

export interface YachtOnlineGameState {
  turnIdx: number;
  playerScores: Partial<Record<YachtCatId, number>>[];
  dice: number[];
  held: boolean[];
  rollsLeft: number;
  rolled: boolean;
}

export interface YachtRoom {
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: YachtRoomPlayer[];
  gameState: YachtOnlineGameState | null;
  nextRoom?: string;
  createdAt: number;
}

function toArr<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val == null) return [];
  return Object.keys(val as object)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (val as Record<string, T>)[k]);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createRoom(
  code: string,
  hostClientId: string,
  player: YachtRoomPlayer,
): Promise<void> {
  const db = getDb();
  await set(ref(db, `yacht/rooms/${code}`), {
    status: 'waiting',
    hostClientId,
    players: [player],
    gameState: null,
    createdAt: Date.now(),
  });
}

export async function joinRoom(
  code: string,
  player: YachtRoomPlayer,
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const roomRef = ref(db, `yacht/rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return { success: false, error: '방을 찾을 수 없습니다.' };

  const room = snapshot.val() as YachtRoom;
  if (room.status !== 'waiting') return { success: false, error: '이미 게임이 시작된 방입니다.' };
  if (toArr<YachtRoomPlayer>(room.players).length >= 6)
    return { success: false, error: '방이 꽉 찼습니다 (최대 6명).' };

  const players = toArr<YachtRoomPlayer>(room.players);
  if (players.some((p) => p.clientId === player.clientId)) return { success: true };
  if (players.some((p) => p.color === player.color))
    return { success: false, error: '이미 선택된 색상입니다. 다른 색상을 선택해주세요.' };

  await update(roomRef, { players: [...players, player] });
  return { success: true };
}

export async function startGame(
  code: string,
  gameState: YachtOnlineGameState,
): Promise<void> {
  const db = getDb();
  await update(ref(db, `yacht/rooms/${code}`), { status: 'playing', gameState });
}

export async function updateGameState(
  code: string,
  gameState: YachtOnlineGameState,
): Promise<void> {
  const db = getDb();
  await update(ref(db, `yacht/rooms/${code}`), { gameState });
}

export async function getRoom(code: string): Promise<YachtRoom | null> {
  const db = getDb();
  const snapshot = await get(ref(db, `yacht/rooms/${code}`));
  return snapshot.exists() ? (snapshot.val() as YachtRoom) : null;
}

export async function finishGame(code: string): Promise<void> {
  const db = getDb();
  await update(ref(db, `yacht/rooms/${code}`), { status: 'finished' });
}

export async function createRoomWithPlayers(
  code: string,
  hostClientId: string,
  players: YachtRoomPlayer[],
): Promise<void> {
  const db = getDb();
  await set(ref(db, `yacht/rooms/${code}`), {
    status: 'waiting',
    hostClientId,
    players,
    gameState: null,
    createdAt: Date.now(),
  });
}

export async function setNextRoom(code: string, nextCode: string): Promise<void> {
  const db = getDb();
  await update(ref(db, `yacht/rooms/${code}`), { nextRoom: nextCode });
}

export function subscribeRoom(
  code: string,
  callback: (room: YachtRoom | null) => void,
): () => void {
  const db = getDb();
  const roomRef = ref(db, `yacht/rooms/${code}`);
  const unsub = onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as YachtRoom) : null);
  });
  return unsub;
}
