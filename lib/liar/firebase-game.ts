import { ref, set, update, onValue, get, remove, onDisconnect } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { OnlineLiarGameState, OnlineLiarPlayer, OnlineLiarMode } from './types';
import { createOnlineGame } from './game-logic';

export type LiarRoomPlayer = { clientId: string; name: string };

export type LiarOnlineRoom = {
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: LiarRoomPlayer[];
  mode: OnlineLiarMode;
  liarCount: number;
  gameState: OnlineLiarGameState | null;
  createdAt: number;
  presence?: Record<string, boolean>;
  leftPlayerName?: string;
};

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

export function sanitizeGameState(raw: unknown): OnlineLiarGameState {
  const gs = raw as OnlineLiarGameState;
  return {
    ...gs,
    players: toArr(gs.players),
    liarIdxs: toArr(gs.liarIdxs),
    votes: gs.votes ?? {},
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function roomRef(code: string) {
  return ref(getDb(), `liar/rooms/${code}`);
}

export async function createRoom(
  hostClientId: string,
  hostName: string,
  mode: OnlineLiarMode,
): Promise<string> {
  const code = generateRoomCode();
  await set(roomRef(code), {
    code, status: 'waiting', hostClientId,
    players: [{ clientId: hostClientId, name: hostName }],
    mode, liarCount: 1, gameState: null, createdAt: Date.now(),
  } as LiarOnlineRoom);
  return code;
}

export async function joinRoom(code: string, clientId: string, name: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as LiarOnlineRoom;
  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  const players = toArr<LiarRoomPlayer>(room.players as unknown as Record<string, LiarRoomPlayer>);
  if (players.some(p => p.clientId === clientId)) return null;
  if (players.length >= 8) return '방이 가득 찼습니다. (최대 8명)';
  await update(roomRef(code), { players: [...players, { clientId, name }] });
  return null;
}

export async function updateRoomLiarCount(code: string, liarCount: number): Promise<void> {
  await update(roomRef(code), { liarCount });
}

export async function startGame(code: string, hostClientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as LiarOnlineRoom;
  if (room.hostClientId !== hostClientId) return '호스트만 게임을 시작할 수 있습니다.';
  const players = toArr<LiarRoomPlayer>(room.players as unknown as Record<string, LiarRoomPlayer>);
  if (players.length < 3) return '최소 3명이 필요합니다.';
  const gs = createOnlineGame(
    players.map(p => ({ name: p.name, clientId: p.clientId }) as OnlineLiarPlayer),
    room.liarCount ?? 1,
    room.mode,
  );
  await update(roomRef(code), { status: 'playing', gameState: gs });
  return null;
}

export async function updateGameState(code: string, gs: OnlineLiarGameState): Promise<void> {
  await update(roomRef(code), { gameState: gs });
}

export async function finishGame(code: string, leftPlayerName?: string): Promise<void> {
  const data: Record<string, unknown> = { status: 'finished' };
  if (leftPlayerName) data.leftPlayerName = leftPlayerName;
  await update(roomRef(code), data);
}

export async function registerPresence(code: string, clientId: string): Promise<() => void> {
  const pRef = ref(getDb(), `liar/rooms/${code}/presence/${clientId}`);
  await set(pRef, true);
  onDisconnect(pRef).remove();
  return () => { remove(pRef); };
}

export function subscribeRoom(code: string, cb: (room: LiarOnlineRoom | null) => void): () => void {
  return onValue(roomRef(code), snapshot => {
    if (!snapshot.exists()) { cb(null); return; }
    const raw = snapshot.val() as LiarOnlineRoom;
    cb({
      ...raw,
      liarCount: raw.liarCount ?? 1,
      players: toArr<LiarRoomPlayer>(raw.players as unknown as Record<string, LiarRoomPlayer>),
      gameState: raw.gameState ? sanitizeGameState(raw.gameState) : null,
    });
  });
}
