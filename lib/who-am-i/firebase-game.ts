import { ref, set, get, push, update, onValue } from 'firebase/database'
import { getDb } from '@/lib/firebase'
import type {
  WhoAmIRoom, WhoAmIPlayer, WhoAmIPlayerData, PlayerColor, RawChatMessage, ChatMessage,
} from './types'

export function toPlayerList(players: Record<string, WhoAmIPlayerData>): WhoAmIPlayer[] {
  if (!players) return []
  return Object.entries(players)
    .map(([clientId, data]) => ({ clientId, ...data }))
    .sort((a, b) => a.joinedAt - b.joinedAt)
}

export function toMessageList(messages: Record<string, RawChatMessage> | undefined): ChatMessage[] {
  if (!messages) return []
  return Object.entries(messages)
    .map(([id, msg]) => ({ id, ...msg }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// 오답 횟수에 따른 쿨다운 (초)
// 1회 오답: 페널티 없음, 2회: 10초, 3회: 10초, 4회: 30초, 5회: 60초, 6회~: 120초
export function getPenaltySeconds(wrongAttempts: number): number {
  if (wrongAttempts <= 1) return 0
  if (wrongAttempts === 2) return 10
  if (wrongAttempts === 3) return 10
  if (wrongAttempts === 4) return 30
  if (wrongAttempts === 5) return 60
  return 120
}

export async function createRoom(
  code: string,
  hostClientId: string,
  player: { clientId: string; name: string; color: PlayerColor },
): Promise<void> {
  const db = getDb()
  const playerData: WhoAmIPlayerData = {
    name: player.name,
    color: player.color,
    assignedWord: '',
    solved: false,
    wrongAttempts: 0,
    nextAttemptAt: 0,
    joinedAt: Date.now(),
  }
  await set(ref(db, `who-am-i/rooms/${code}`), {
    status: 'waiting',
    hostClientId,
    players: { [player.clientId]: playerData },
    createdAt: Date.now(),
  })
}

export async function joinRoom(
  code: string,
  player: { clientId: string; name: string; color: PlayerColor },
): Promise<{ success: boolean; error?: string }> {
  const db = getDb()
  const roomRef = ref(db, `who-am-i/rooms/${code}`)
  const snap = await get(roomRef)

  if (!snap.exists()) return { success: false, error: '방을 찾을 수 없습니다.' }

  const room = snap.val() as WhoAmIRoom
  if (room.status !== 'waiting') return { success: false, error: '이미 게임이 시작된 방입니다.' }

  const players = room.players ?? {}
  if (players[player.clientId]) return { success: true } // 이미 참가 중
  if (Object.keys(players).length >= 8) return { success: false, error: '방이 꽉 찼습니다 (최대 8명).' }

  const playerData: WhoAmIPlayerData = {
    name: player.name,
    color: player.color,
    assignedWord: '',
    solved: false,
    wrongAttempts: 0,
    nextAttemptAt: 0,
    joinedAt: Date.now(),
  }
  await set(ref(db, `who-am-i/rooms/${code}/players/${player.clientId}`), playerData)
  return { success: true }
}

// 내 차례에 다음 플레이어의 단어를 제출
export async function assignWord(
  code: string,
  targetClientId: string,
  word: string,
): Promise<void> {
  const db = getDb()
  await set(ref(db, `who-am-i/rooms/${code}/players/${targetClientId}/assignedWord`), word)
}

export async function startGame(code: string): Promise<void> {
  const db = getDb()
  await update(ref(db, `who-am-i/rooms/${code}`), { status: 'playing' })
}

// 결과 화면으로 전환 (모든 클라이언트가 결과 화면을 봄)
export async function finishGame(code: string): Promise<void> {
  const db = getDb()
  await update(ref(db, `who-am-i/rooms/${code}`), { status: 'result' })
}

// 방 완전 종료 (모든 클라이언트를 로비로 이동)
export async function closeRoom(code: string): Promise<void> {
  const db = getDb()
  await update(ref(db, `who-am-i/rooms/${code}`), { status: 'finished' })
}

// 정답 제출 처리
export async function submitAnswer(
  code: string,
  clientId: string,
  isCorrect: boolean,
  currentWrongAttempts: number,
): Promise<void> {
  const db = getDb()
  if (isCorrect) {
    await update(ref(db, `who-am-i/rooms/${code}/players/${clientId}`), { solved: true })
  } else {
    const newAttempts = currentWrongAttempts + 1
    const penaltyMs = getPenaltySeconds(newAttempts) * 1000
    const nextAttemptAt = penaltyMs > 0 ? Date.now() + penaltyMs : 0
    await update(ref(db, `who-am-i/rooms/${code}/players/${clientId}`), {
      wrongAttempts: newAttempts,
      nextAttemptAt,
    })
  }
}

export async function sendMessage(code: string, msg: RawChatMessage): Promise<void> {
  const db = getDb()
  await push(ref(db, `who-am-i/rooms/${code}/messages`), msg)
}

export function subscribeRoom(
  code: string,
  callback: (room: WhoAmIRoom | null) => void,
): () => void {
  const db = getDb()
  const roomRef = ref(db, `who-am-i/rooms/${code}`)
  const unsub = onValue(roomRef, snap => {
    callback(snap.exists() ? (snap.val() as WhoAmIRoom) : null)
  })
  return unsub
}
