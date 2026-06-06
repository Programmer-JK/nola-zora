import {
  ref, set, get, push, onValue, off, serverTimestamp,
  runTransaction, onChildAdded, DataSnapshot, update,
} from 'firebase/database'
import { getDb } from '@/lib/firebase'
import { DrawnCard } from '@/lib/card-game/game-logic'

// ── 타입 ────────────────────────────────────────────────
export interface RoomMember {
  name: string
  score: number
  ready: boolean
}

export interface GameState {
  drawnCards: DrawnCard[]
  buzzedBy: string | null
  buzzedAt: number | null
  votingOpen: boolean
  round: number
}

export interface ChatMessage {
  id: string
  uid: string
  name: string
  text: string
  at: number
}

export interface RoomMeta {
  host: string
  hostName: string
  mode: 'basic' | 'genre'
  infiniteMode: boolean
  timerSeconds: number   // 0 = 타이머 없음
  status: 'waiting' | 'playing' | 'finished'
  createdAt: number
}

export interface Room {
  meta: RoomMeta
  members: Record<string, RoomMember>
  gameState: GameState
  votes: Record<string, 'yes' | 'no'>
  chat: Record<string, Omit<ChatMessage, 'id'>>
}

// ── 룸 생성 ───────────────────────────────────────────
export async function createRoom(
  roomId: string,
  uid: string,
  hostName: string,
  mode: 'basic' | 'genre',
  infiniteMode: boolean,
): Promise<void> {
  const db = getDb()
  const meta: RoomMeta = {
    host: uid,
    hostName,
    mode,
    infiniteMode,
    timerSeconds: 60,
    status: 'waiting',
    createdAt: Date.now(),
  }
  await set(ref(db, `card-game/rooms/${roomId}/meta`), meta)
  await set(ref(db, `card-game/rooms/${roomId}/members/${uid}`), {
    name: hostName,
    score: 0,
    ready: false,
  })
  await set(ref(db, `card-game/rooms/${roomId}/gameState`), {
    drawnCards: [],
    buzzedBy: null,
    buzzedAt: null,
    votingOpen: false,
    round: 0,
  })
}

// ── 룸 참여 ───────────────────────────────────────────
export async function joinRoom(roomId: string, uid: string, name: string): Promise<{ meta: RoomMeta }> {
  const db = getDb()
  const metaSnap = await get(ref(db, `card-game/rooms/${roomId}/meta`))
  if (!metaSnap.exists()) throw new Error('존재하지 않는 방입니다.')
  const meta = metaSnap.val() as RoomMeta
  if (meta.status === 'finished') throw new Error('이미 종료된 방입니다.')

  await set(ref(db, `card-game/rooms/${roomId}/members/${uid}`), {
    name,
    score: 0,
    ready: false,
  })
  return { meta }
}

// ── 게임 시작 ─────────────────────────────────────────
export async function startGame(roomId: string): Promise<void> {
  const db = getDb()
  await set(ref(db, `card-game/rooms/${roomId}/meta/status`), 'playing')
}

// ── 카드 업데이트 ──────────────────────────────────────
export async function updateDrawnCards(
  roomId: string,
  cards: DrawnCard[],
  nextRound?: number,
): Promise<void> {
  const db = getDb()
  const gameState: Record<string, unknown> = {
    drawnCards: cards,
    buzzedBy: null,
    buzzedAt: null,
    votingOpen: false,
  }
  if (nextRound !== undefined) gameState.round = nextRound
  // gameState와 votes를 단일 원자적 write로 처리 → Firebase 이벤트 1번만 발생
  await update(ref(db, `card-game/rooms/${roomId}`), {
    gameState,
    votes: {},
  })
}

// ── 버즈인 ────────────────────────────────────────────
export async function buzzIn(roomId: string, uid: string): Promise<boolean> {
  const db = getDb()
  let succeeded = false
  await runTransaction(ref(db, `card-game/rooms/${roomId}/gameState/buzzedBy`), current => {
    if (current !== null) return
    succeeded = true
    return uid
  })
  if (succeeded) {
    await set(ref(db, `card-game/rooms/${roomId}/gameState/buzzedAt`), serverTimestamp())
  }
  return succeeded
}

// ── 투표 ──────────────────────────────────────────────
export async function castVote(roomId: string, uid: string, vote: 'yes' | 'no'): Promise<void> {
  const db = getDb()
  await set(ref(db, `card-game/rooms/${roomId}/votes/${uid}`), vote)
}

// ── 투표 결과 → 점수 반영 ──────────────────────────────
export async function resolveVotes(
  roomId: string,
  buzzedUid: string,
  votes: Record<string, 'yes' | 'no'>,
  members: Record<string, RoomMember>,
): Promise<void> {
  const db = getDb()
  const yesCount = Object.values(votes).filter(v => v === 'yes').length
  const noCount = Object.values(votes).filter(v => v === 'no').length
  if (yesCount > noCount) {
    const current = members[buzzedUid]?.score ?? 0
    await set(ref(db, `card-game/rooms/${roomId}/members/${buzzedUid}/score`), current + 1)
  }
  await update(ref(db, `card-game/rooms/${roomId}/gameState`), {
    votingOpen: false,
    buzzedBy: null,
    buzzedAt: null,
  })
}

// ── 투표 열기 ─────────────────────────────────────────
export async function openVoting(roomId: string): Promise<void> {
  const db = getDb()
  await set(ref(db, `card-game/rooms/${roomId}/gameState/votingOpen`), true)
}

// ── 게임 종료 ─────────────────────────────────────────
export async function endOnlineGame(roomId: string): Promise<void> {
  const db = getDb()
  await set(ref(db, `card-game/rooms/${roomId}/meta/status`), 'finished')
}

// ── 채팅 전송 ─────────────────────────────────────────
export async function sendChatMessage(roomId: string, uid: string, name: string, text: string): Promise<void> {
  const db = getDb()
  await push(ref(db, `card-game/rooms/${roomId}/chat`), {
    uid,
    name,
    text,
    at: Date.now(),
  })
}

// ── 실시간 구독 ───────────────────────────────────────
export function subscribeRoom(roomId: string, callback: (room: Room) => void): () => void {
  const db = getDb()
  const roomRef = ref(db, `card-game/rooms/${roomId}`)
  const unsub = onValue(roomRef, snap => {
    if (snap.exists()) callback(snap.val() as Room)
  })
  return unsub
}

export function subscribeChatAdded(
  roomId: string,
  callback: (msg: ChatMessage) => void,
): () => void {
  const db = getDb()
  const chatRef = ref(db, `card-game/rooms/${roomId}/chat`)
  const handler = (snap: DataSnapshot) => {
    callback({ id: snap.key!, ...(snap.val() as Omit<ChatMessage, 'id'>) })
  }
  onChildAdded(chatRef, handler)
  return () => off(chatRef, 'child_added', handler)
}

// ── 호스트 설정 변경 ──────────────────────────────────
export async function updateRoomMeta(
  roomId: string,
  updates: Partial<Pick<RoomMeta, 'mode' | 'infiniteMode' | 'timerSeconds'>>,
): Promise<void> {
  const db = getDb()
  for (const [key, value] of Object.entries(updates)) {
    await set(ref(db, `card-game/rooms/${roomId}/meta/${key}`), value)
  }
}
