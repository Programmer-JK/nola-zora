import { ref, set, get, update, onValue } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { GameState, PlayerColor } from '@/lib/las-vegas/types';
import { createInitialState } from '@/lib/las-vegas/gameLogic';

export interface RoomPlayer {
  clientId: string;
  name: string;
  color: PlayerColor;
}

export interface Room {
  status: 'waiting' | 'playing' | 'finished';
  hostClientId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  createdAt: number;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createRoom(
  code: string,
  hostClientId: string,
  player: RoomPlayer
): Promise<void> {
  const db = getDb();
  await set(ref(db, `las-vegas/rooms/${code}`), {
    status: 'waiting',
    hostClientId,
    players: [player],
    gameState: null,
    createdAt: Date.now(),
  });
}

export async function joinRoom(
  code: string,
  player: RoomPlayer
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const roomRef = ref(db, `las-vegas/rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return { success: false, error: '방을 찾을 수 없습니다.' };

  const room = snapshot.val() as Room;
  if (room.status !== 'waiting') return { success: false, error: '이미 게임이 시작된 방입니다.' };
  if (room.players.length >= 6) return { success: false, error: '방이 꽉 찼습니다 (최대 6명).' };

  if (room.players.some((p) => p.clientId === player.clientId)) {
    return { success: true };
  }

  if (room.players.some((p) => p.color === player.color)) {
    return { success: false, error: '이미 선택된 색상입니다. 다른 색상을 선택해주세요.' };
  }

  await update(roomRef, { players: [...room.players, player] });
  return { success: true };
}

export async function getRoom(code: string): Promise<Room | null> {
  const db = getDb();
  const snapshot = await get(ref(db, `las-vegas/rooms/${code}`));
  return snapshot.exists() ? (snapshot.val() as Room) : null;
}

export async function startGame(code: string, gameState: GameState): Promise<void> {
  const db = getDb();
  await update(ref(db, `las-vegas/rooms/${code}`), { status: 'playing', gameState });
}

export async function updateGameState(code: string, gameState: GameState): Promise<void> {
  const db = getDb();
  await update(ref(db, `las-vegas/rooms/${code}`), { gameState });
}

export async function restartGame(code: string): Promise<void> {
  const db = getDb();
  const snap = await get(ref(db, `las-vegas/rooms/${code}`));
  if (!snap.exists()) return;
  const room = snap.val() as Room;
  const gameState = createInitialState(
    room.players.map(p => ({ name: p.name, color: p.color, clientId: p.clientId }))
  );
  await update(ref(db, `las-vegas/rooms/${code}`), { status: 'playing', gameState });
}

export function subscribeRoom(
  code: string,
  callback: (room: Room | null) => void
): () => void {
  const db = getDb();
  const roomRef = ref(db, `las-vegas/rooms/${code}`);
  const unsub = onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as Room) : null);
  });
  return unsub;
}
