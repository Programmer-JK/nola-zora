import { ref, set, onValue, get, remove, runTransaction } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { createGame, resolveRound } from './game-logic';
import { GameState, PlayerState, TileValue } from './types';

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

export function sanitizeGameState(raw: unknown): GameState {
  const gs = raw as GameState;
  const sanitizePlayer = (p: PlayerState): PlayerState => ({
    ...p,
    remainingTiles: toArr(p.remainingTiles) as TileValue[],
    selectedTile: (p.selectedTile ?? null) as TileValue | null,
  });
  return {
    ...gs,
    players: [sanitizePlayer(gs.players[0]), sanitizePlayer(gs.players[1])],
    roundResults: toArr(gs.roundResults),
    matchWinnerId: gs.matchWinnerId ?? null,
    firstPlayerIdx: gs.firstPlayerIdx ?? 0,
  };
}

function roomRef(code: string) {
  return ref(getDb(), `guryongtu/rooms/${code}`);
}

// ─── 방 생성 ─────────────────────────────────────────────────
export async function createRoom(
  hostClientId: string,
  hostName: string,
): Promise<string> {
  let code = generateRoomCode();
  let snap = await get(roomRef(code));
  while (snap.exists()) {
    code = generateRoomCode();
    snap = await get(roomRef(code));
  }

  const room: OnlineRoom = {
    code,
    status: 'waiting',
    hostClientId,
    players: [{ clientId: hostClientId, name: hostName }],
    gameState: null,
    createdAt: Date.now(),
  };
  await set(roomRef(code), room);
  return code;
}

// ─── 방 참가 ─────────────────────────────────────────────────
export async function joinRoom(
  code: string,
  clientId: string,
  name: string,
): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as OnlineRoom;
  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  const players = toArr(room.players) as RoomPlayer[];
  if (players.length >= 2) return '방이 가득 찼습니다. (최대 2인)';
  if (players.some(p => p.clientId === clientId)) return null;
  players.push({ clientId, name });
  await set(ref(getDb(), `guryongtu/rooms/${code}/players`), players);
  return null;
}

// ─── 게임 시작 ────────────────────────────────────────────────
export async function startGame(
  code: string,
  hostClientId: string,
): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = snap.val() as OnlineRoom;
  if (room.hostClientId !== hostClientId) return '호스트만 시작할 수 있습니다.';
  const players = toArr(room.players) as RoomPlayer[];
  if (players.length < 2) return '2명이 필요합니다.';

  const gameState = createGame(
    players[0].clientId, players[0].name,
    players[1].clientId, players[1].name,
  );
  await set(ref(getDb(), `guryongtu/rooms/${code}/gameState`), gameState);
  await set(ref(getDb(), `guryongtu/rooms/${code}/status`), 'playing');
  return null;
}

// ─── 게임 상태 구독 ──────────────────────────────────────────
export function subscribeRoom(
  code: string,
  callback: (room: OnlineRoom | null) => void,
): () => void {
  const unsub = onValue(roomRef(code), snap => {
    if (!snap.exists()) { callback(null); return; }
    const room = snap.val() as OnlineRoom;
    if (room.gameState) room.gameState = sanitizeGameState(room.gameState);
    room.players = toArr(room.players) as RoomPlayer[];
    callback(room);
  });
  return unsub;
}

// ─── 타일 선택 (트랜잭션 — 둘 다 선택 시 자동 revealing) ────
export async function selectTileAtomic(
  code: string,
  playerIdx: number,
  tile: TileValue,
): Promise<boolean> {
  const gsRef = ref(getDb(), `guryongtu/rooms/${code}/gameState`);
  const result = await runTransaction(gsRef, (current: unknown) => {
    if (!current) return;
    const gs = sanitizeGameState(current);
    if (gs.phase !== 'selecting') return; // abort
    if (gs.players[playerIdx].selectedTile !== null) return; // 이미 선택

    const players = [...gs.players] as typeof gs.players;
    players[playerIdx] = { ...players[playerIdx], selectedTile: tile };

    const bothSelected =
      players[0].selectedTile !== null &&
      players[1].selectedTile !== null;

    return { ...gs, players, phase: bothSelected ? 'revealing' : 'selecting' };
  });
  return result.committed;
}

// ─── 라운드 결산 (트랜잭션) ──────────────────────────────────
export async function resolveRoundAtomic(code: string): Promise<void> {
  const gsRef = ref(getDb(), `guryongtu/rooms/${code}/gameState`);
  await runTransaction(gsRef, (current: unknown) => {
    if (!current) return;
    const gs = sanitizeGameState(current);
    if (gs.phase !== 'revealing') return;
    return resolveRound(gs);
  });
}

// ─── 매치 재시작 (같은 방, 같은 플레이어) ───────────────────
export async function restartMatch(code: string): Promise<void> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.val() as OnlineRoom;
  const players = toArr(room.players) as RoomPlayer[];
  if (players.length < 2) return;

  const gameState = createGame(
    players[0].clientId, players[0].name,
    players[1].clientId, players[1].name,
  );
  await set(ref(getDb(), `guryongtu/rooms/${code}/gameState`), gameState);
  await set(ref(getDb(), `guryongtu/rooms/${code}/status`), 'playing');
}

// ─── 방 삭제 ────────────────────────────────────────────────
export async function deleteRoom(code: string): Promise<void> {
  await remove(roomRef(code));
}
