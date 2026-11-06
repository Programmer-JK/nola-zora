import { ref, set, get, onValue, runTransaction } from 'firebase/database';
import { getDb } from '@/lib/firebase';
import { createGame, apply, type Action, type GameState } from './game';

export type RoomPlayer = { clientId: string; name: string };
export type Room = {
  code: string;
  status: 'waiting' | 'playing';
  hostClientId: string;
  players: RoomPlayer[];
  game: GameState | null;
};
// 게임 상태는 JSON 문자열로 저장 — Firebase가 빈 배열/null을 지우는 문제를 피한다
type RawRoom = Omit<Room, 'game' | 'players'> & { players?: RoomPlayer[]; game?: string };

const MAX_PLAYERS = 5;
const roomRef = (code: string) => ref(getDb(), `modern-art/rooms/${code}`);

export async function createRoom(clientId: string, name: string): Promise<string> {
  let code = '';
  do code = String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
  while ((await get(roomRef(code))).exists());
  const room: RawRoom = { code, status: 'waiting', hostClientId: clientId, players: [{ clientId, name }] };
  await set(roomRef(code), room);
  return code;
}

export async function joinRoom(code: string, clientId: string, name: string): Promise<string | null> {
  let err: string | null = null;
  const res = await runTransaction(roomRef(code), (r: RawRoom | null) => {
    if (!r) return r; // 첫 호출은 캐시가 비어 null일 수 있음 — 서버 값으로 재시도됨
    const players = r.players ?? [];
    if (players.some(p => p.clientId === clientId)) { err = null; return; }
    if (r.status !== 'waiting') { err = '이미 시작된 게임입니다.'; return; }
    if (players.length >= MAX_PLAYERS) { err = `방이 가득 찼습니다. (최대 ${MAX_PLAYERS}인)`; return; }
    err = null;
    return { ...r, players: [...players, { clientId, name }] };
  });
  if (!res.snapshot.exists()) return '방을 찾을 수 없습니다.';
  return err;
}

export async function startGame(code: string, clientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const r = snap.val() as RawRoom;
  const players = r.players ?? [];
  if (r.hostClientId !== clientId) return '호스트만 시작할 수 있습니다.';
  if (players.length < 2) return '2명 이상 필요합니다.';
  const game = createGame(players.map(p => ({ id: p.clientId, name: p.name })));
  await set(roomRef(code), { ...r, status: 'playing', game: JSON.stringify(game) });
  return null;
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  return onValue(roomRef(code), snap => {
    if (!snap.exists()) return cb(null);
    const r = snap.val() as RawRoom;
    cb({ ...r, players: r.players ?? [], game: r.game ? JSON.parse(r.game) : null });
  });
}

/** 액션을 트랜잭션으로 적용. 실패 시 에러 메시지 반환 */
export async function act(code: string, clientId: string, action: Action): Promise<string | null> {
  let err: string | null = null;
  await runTransaction(ref(getDb(), `modern-art/rooms/${code}/game`), (raw: string | null) => {
    if (!raw) return raw;
    const g = JSON.parse(raw) as GameState;
    try {
      err = null;
      return JSON.stringify(apply(g, g.players.findIndex(p => p.id === clientId), action));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      return; // abort
    }
  });
  return err;
}
