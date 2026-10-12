import {
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  remove,
  runTransaction,
} from 'firebase/database';
import { getDb } from '@/lib/firebase';
import type {
  AuctionRoom,
  AuctionPlayer,
  Bid,
  AppraisalResult,
  RoundResult,
  Treasure,
  Phase,
} from './types';
import { generateRoundTreasures, resolveBids } from './game-logic';
import {
  DEFAULT_SETTINGS,
  INITIAL_COINS,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from './game-data';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArr<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val as Record<string, T>)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => (val as Record<string, T>)[k]);
}

function sanitizeRoom(raw: unknown): AuctionRoom {
  const r = raw as AuctionRoom;
  return {
    ...r,
    players: toArr<AuctionPlayer>(r.players),
    treasures: toArr<Treasure>(r.treasures),
    bids: r.bids ?? {},
    appraisals: r.appraisals ?? {},
    roundResults: toArr<RoundResult>(r.roundResults).map(result => ({
      ...result,
      treasures: toArr<Treasure>(result.treasures),
      bids: toArr<Bid>(result.bids),
    })),
    usedTreasureIds: toArr<string>(r.usedTreasureIds),
    settings: r.settings ?? DEFAULT_SETTINGS,
  };
}

export function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

function roomRef(code: string) {
  return ref(getDb(), `cursed-auction/rooms/${code}`);
}

// ─── Room management ─────────────────────────────────────────────────────────

export async function createRoom(
  hostClientId: string,
  hostName: string,
  hostColor: string,
): Promise<string> {
  const code = generateRoomCode();
  const hostPlayer: AuctionPlayer = {
    clientId: hostClientId,
    name: hostName,
    color: hostColor,
    coins: INITIAL_COINS,
    score: 0,
    appraisalUsed: false,
    isConnected: true,
  };
  const room: AuctionRoom = {
    code,
    status: 'waiting',
    hostClientId,
    players: [hostPlayer],
    roundNumber: 0,
    phase: 'WAITING',
    deadlineAt: 0,
    version: 0,
    treasures: [],
    bids: {},
    appraisals: {},
    roundResults: [],
    usedTreasureIds: [],
    settings: DEFAULT_SETTINGS,
    createdAt: Date.now(),
  };
  await set(roomRef(code), room);
  return code;
}

export async function joinRoom(
  code: string,
  clientId: string,
  name: string,
  color: string,
): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = sanitizeRoom(snap.val());
  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  if (room.players.some(p => p.clientId === clientId)) return null; // 재접속
  if (room.players.length >= MAX_PLAYERS) return `방이 가득 찼습니다. (최대 ${MAX_PLAYERS}명)`;
  const newPlayer: AuctionPlayer = {
    clientId,
    name,
    color,
    coins: INITIAL_COINS,
    score: 0,
    appraisalUsed: false,
    isConnected: true,
  };
  await update(roomRef(code), { players: [...room.players, newPlayer] });
  return null;
}

export async function getRoom(code: string): Promise<AuctionRoom | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return null;
  return sanitizeRoom(snap.val());
}

export function subscribeRoom(
  code: string,
  cb: (room: AuctionRoom | null) => void,
): () => void {
  return onValue(roomRef(code), snap => {
    if (!snap.exists()) { cb(null); return; }
    cb(sanitizeRoom(snap.val()));
  });
}

export async function registerPresence(
  code: string,
  clientId: string,
): Promise<() => void> {
  const pRef = ref(getDb(), `cursed-auction/rooms/${code}/presence/${clientId}`);
  await set(pRef, true);
  onDisconnect(pRef).remove();
  return () => { remove(pRef); };
}

// ─── Game start ───────────────────────────────────────────────────────────────

export async function startGame(code: string, clientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = sanitizeRoom(snap.val());
  if (room.hostClientId !== clientId) return '호스트만 게임을 시작할 수 있습니다.';
  if (room.status !== 'waiting') return '이미 시작된 게임입니다.';
  if (room.players.length < MIN_PLAYERS) return `최소 ${MIN_PLAYERS}명이 필요합니다. (현재 ${room.players.length}명)`;

  const roundNumber = 1;
  const treasures = generateRoundTreasures(roundNumber, []);
  const usedIds = treasures.map(t => t.id);

  await update(roomRef(code), {
    status: 'playing',
    phase: 'DISCUSSION' as Phase,
    roundNumber,
    treasures,
    bids: {},
    appraisals: {},
    usedTreasureIds: usedIds,
    deadlineAt: Date.now() + room.settings.discussionSeconds * 1000,
    version: 1,
  });
  return null;
}

// ─── Phase transitions (atomic via runTransaction) ────────────────────────────

/**
 * DISCUSSION → BIDDING
 * 타이머 만료 시 호출. 이미 전환됐으면 no-op.
 */
export async function advanceFromDiscussion(code: string): Promise<boolean> {
  let advanced = false;
  await runTransaction(roomRef(code), data => {
    if (!data || data.phase !== 'DISCUSSION') return;
    const room = sanitizeRoom(data);
    advanced = true;
    return {
      ...data,
      phase: 'BIDDING' as Phase,
      deadlineAt: Date.now() + room.settings.biddingSeconds * 1000,
      version: (data.version ?? 0) + 1,
    };
  });
  return advanced;
}

/**
 * BIDDING → ROUND_RESULT
 * 타이머 만료 또는 전원 입찰 완료 시 호출.
 * 입찰 해결, 금화/점수 갱신, 보물 상태 업데이트를 원자적으로 처리.
 */
export async function advanceFromBidding(code: string): Promise<boolean> {
  let advanced = false;
  await runTransaction(roomRef(code), data => {
    if (!data || data.phase !== 'BIDDING') return;
    const room = sanitizeRoom(data);

    const { updatedTreasures, playerUpdates } = resolveBids(room.treasures, room.bids);

    const updatedPlayers = room.players.map(p => {
      const upd = playerUpdates[p.clientId] ?? { coinsDelta: 0, scoreDelta: 0 };
      return {
        ...p,
        coins: p.coins + upd.coinsDelta,
        score: p.score + upd.scoreDelta,
      };
    });

    const roundResult: RoundResult = {
      roundNumber: room.roundNumber,
      treasures: updatedTreasures,
      bids: Object.values(room.bids),
    };

    advanced = true;
    return {
      ...data,
      treasures: updatedTreasures,
      players: updatedPlayers,
      roundResults: [...room.roundResults, roundResult],
      phase: 'ROUND_RESULT' as Phase,
      deadlineAt: Date.now() + room.settings.resultSeconds * 1000,
      version: (data.version ?? 0) + 1,
    };
  });
  return advanced;
}

/**
 * ROUND_RESULT → DISCUSSION (다음 라운드) 또는 → GAME_OVER
 * 새 라운드 보물은 트랜잭션 외부에서 미리 생성해 클로저로 전달.
 */
export async function advanceFromRoundResult(code: string): Promise<boolean> {
  // 현재 상태 확인 → 다음 라운드 보물 미리 생성
  const snap = await get(roomRef(code));
  if (!snap.exists()) return false;
  const current = sanitizeRoom(snap.val());
  if (current.phase !== 'ROUND_RESULT') return false;

  const isLastRound = current.roundNumber >= current.settings.totalRounds;
  const nextRoundNumber = current.roundNumber + 1;

  const newTreasures = isLastRound
    ? null
    : generateRoundTreasures(nextRoundNumber, current.usedTreasureIds);

  const newUsedIds = newTreasures
    ? [...current.usedTreasureIds, ...newTreasures.map(t => t.id)]
    : current.usedTreasureIds;

  let advanced = false;
  await runTransaction(roomRef(code), data => {
    if (!data || data.phase !== 'ROUND_RESULT') return;
    const room = sanitizeRoom(data);
    const last = room.roundNumber >= room.settings.totalRounds;

    if (last) {
      advanced = true;
      return {
        ...data,
        phase: 'GAME_OVER' as Phase,
        status: 'finished',
        version: (data.version ?? 0) + 1,
      };
    }

    if (!newTreasures) return; // abort (shouldn't happen)

    advanced = true;
    return {
      ...data,
      phase: 'DISCUSSION' as Phase,
      roundNumber: room.roundNumber + 1,
      treasures: newTreasures,
      bids: {},
      appraisals: {},   // 다음 라운드 감정 결과 초기화
      usedTreasureIds: newUsedIds,
      deadlineAt: Date.now() + room.settings.discussionSeconds * 1000,
      version: (data.version ?? 0) + 1,
    };
  });
  return advanced;
}

// ─── Player actions ───────────────────────────────────────────────────────────

/**
 * 입찰 제출 (또는 포기: treasureId=null).
 * 검증, 저장, 전원 완료 시 즉시 해결까지 단일 트랜잭션으로 처리.
 * race condition 없이 중복 제출과 이중 해결을 원천 차단.
 */
export async function submitBid(
  code: string,
  clientId: string,
  treasureId: string | null,
  amount: number,
): Promise<string | null> {
  let errorMsg: string | null = null;

  await runTransaction(roomRef(code), data => {
    errorMsg = null; // 트랜잭션 재시도 시 초기화
    if (!data) { errorMsg = '방을 찾을 수 없습니다.'; return; }
    const room = sanitizeRoom(data);

    if (room.phase !== 'BIDDING') { errorMsg = '입찰 단계가 아닙니다.'; return; }
    if (Date.now() > room.deadlineAt + 2000) { errorMsg = '입찰 마감 시간이 지났습니다.'; return; }

    const player = room.players.find(p => p.clientId === clientId);
    if (!player) { errorMsg = '참가자가 아닙니다.'; return; }
    if (room.bids[clientId]) { errorMsg = '이미 입찰하셨습니다.'; return; }

    if (treasureId !== null) {
      const treasure = room.treasures.find(t => t.id === treasureId);
      if (!treasure) { errorMsg = '유효하지 않은 보물입니다.'; return; }
      if (amount < 1 || amount > 4) { errorMsg = '입찰 금액은 1~4 금화여야 합니다.'; return; }
      if (amount > player.coins) { errorMsg = `금화가 부족합니다. (보유: ${player.coins}개)`; return; }
    }

    const bid: Bid = {
      clientId,
      treasureId,
      amount: treasureId === null ? 0 : amount,
      submittedAt: Date.now(),
    };

    const newBids = { ...room.bids, [clientId]: bid };
    const allDone = room.players.every(p => newBids[p.clientId]);

    if (allDone) {
      // 마지막 입찰자 → 즉시 해결까지 한 번에 커밋
      const { updatedTreasures, playerUpdates } = resolveBids(room.treasures, newBids);
      const updatedPlayers = room.players.map(p => {
        const upd = playerUpdates[p.clientId] ?? { coinsDelta: 0, scoreDelta: 0 };
        return { ...p, coins: p.coins + upd.coinsDelta, score: p.score + upd.scoreDelta };
      });
      const roundResult: RoundResult = {
        roundNumber: room.roundNumber,
        treasures: updatedTreasures,
        bids: Object.values(newBids),
      };
      return {
        ...data,
        bids: newBids,
        treasures: updatedTreasures,
        players: updatedPlayers,
        roundResults: [...room.roundResults, roundResult],
        phase: 'ROUND_RESULT' as Phase,
        deadlineAt: Date.now() + room.settings.resultSeconds * 1000,
        version: (data.version ?? 0) + 1,
      };
    }

    return { ...data, bids: newBids };
  });

  return errorMsg;
}

/**
 * 보물 감정.
 * 해당 플레이어에게만 실제 효과를 공개하고 사용 횟수를 차감.
 */
export async function submitAppraisal(
  code: string,
  clientId: string,
  treasureId: string,
): Promise<{ result: AppraisalResult | null; error: string | null }> {
  let appraisalResult: AppraisalResult | null = null;
  let errorMsg: string | null = null;

  await runTransaction(roomRef(code), data => {
    if (!data) { errorMsg = '방을 찾을 수 없습니다.'; return; }
    const room = sanitizeRoom(data);

    if (room.phase !== 'DISCUSSION') { errorMsg = '토론 단계에서만 감정할 수 있습니다.'; return; }

    const playerIdx = room.players.findIndex(p => p.clientId === clientId);
    if (playerIdx === -1) { errorMsg = '참가자가 아닙니다.'; return; }
    if (room.players[playerIdx].appraisalUsed) { errorMsg = '감정 기능을 이미 사용했습니다.'; return; }

    const treasure = room.treasures.find(t => t.id === treasureId);
    if (!treasure) { errorMsg = '유효하지 않은 보물입니다.'; return; }

    const result: AppraisalResult = {
      treasureId,
      actualScore: treasure.actualScore,
      isCursed: treasure.isCursed,
      roundNumber: room.roundNumber,
    };

    const updatedPlayers = [...room.players];
    updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], appraisalUsed: true };
    appraisalResult = result;

    return {
      ...data,
      players: updatedPlayers,
      appraisals: {
        ...(data.appraisals ?? {}),
        [clientId]: result,
      },
    };
  });

  return { result: appraisalResult, error: errorMsg };
}

// ─── Restart ─────────────────────────────────────────────────────────────────

export async function restartGame(code: string, clientId: string): Promise<string | null> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return '방을 찾을 수 없습니다.';
  const room = sanitizeRoom(snap.val());
  if (room.hostClientId !== clientId) return '호스트만 재시작할 수 있습니다.';

  const resetPlayers = room.players.map(p => ({
    ...p,
    coins: INITIAL_COINS,
    score: 0,
    appraisalUsed: false,
  }));

  await update(roomRef(code), {
    status: 'waiting',
    phase: 'WAITING' as Phase,
    roundNumber: 0,
    treasures: [],
    bids: {},
    appraisals: {},
    roundResults: [],
    usedTreasureIds: [],
    deadlineAt: 0,
    version: 0,
    players: resetPlayers,
  });
  return null;
}

export { sanitizeRoom };
