import type { GhostGameState } from './types';
import { getCaseById, getRandomCase } from './game-data';

// ─── 게임 생성 ────────────────────────────────────────────────

export function createGhostGame(playerCount: number, caseId?: string): GhostGameState {
  const ghostCase = caseId ? getCaseById(caseId) ?? getRandomCase() : getRandomCase();

  // 범인 랜덤 배정
  const criminalIdx = Math.floor(Math.random() * playerCount);

  // 단서 랜덤 배분 (탐정들에게 1개씩, 겹치지 않게)
  const clueCount = ghostCase.investigatorClues.length;
  const shuffledClues = shuffle(Array.from({ length: clueCount }, (_, i) => i));
  const clueAssignments: number[] = [];
  let cluePointer = 0;
  for (let i = 0; i < playerCount; i++) {
    if (i === criminalIdx) {
      clueAssignments.push(-1);
    } else {
      clueAssignments.push(shuffledClues[cluePointer++]);
    }
  }

  return {
    playerCount,
    caseId: ghostCase.id,
    criminalIdx,
    clueAssignments,
    phase: 'role-reveal',
    round: 1,
    revealPlayerIdx: 0,
    roleShowing: false,
    votePlayerIdx: 0,
    voteShowing: false,
    votes: Array(playerCount).fill(null),
  };
}

// ─── 역할 공개 단계 ───────────────────────────────────────────

export function showRole(state: GhostGameState): GhostGameState {
  return { ...state, roleShowing: true };
}

export function confirmRole(state: GhostGameState): GhostGameState {
  const next = state.revealPlayerIdx + 1;
  if (next >= state.playerCount) {
    // 모든 플레이어 확인 완료 → 라운드 1 사건 카드로
    return { ...state, roleShowing: false, phase: 'event-card', round: 1 };
  }
  return { ...state, roleShowing: false, revealPlayerIdx: next };
}

// ─── 라운드 진행 ──────────────────────────────────────────────

export function startDiscussion(state: GhostGameState): GhostGameState {
  return { ...state, phase: 'discussion' };
}

export function nextRound(state: GhostGameState): GhostGameState {
  if (state.round < 3) {
    return { ...state, phase: 'event-card', round: state.round + 1 };
  }
  // 3라운드 후 → 투표
  return { ...state, phase: 'vote', votePlayerIdx: 0, voteShowing: false };
}

// ─── 투표 단계 ────────────────────────────────────────────────

export function showVote(state: GhostGameState): GhostGameState {
  return { ...state, voteShowing: true };
}

export function castVote(state: GhostGameState, suspectedIdx: number): GhostGameState {
  const newVotes = [...state.votes];
  newVotes[state.votePlayerIdx] = suspectedIdx;
  const nextVoterIdx = state.votePlayerIdx + 1;

  if (nextVoterIdx >= state.playerCount) {
    // 모든 투표 완료 → 결과
    return { ...state, votes: newVotes, phase: 'result' };
  }

  return { ...state, votes: newVotes, votePlayerIdx: nextVoterIdx, voteShowing: false };
}

// ─── 결과 계산 ────────────────────────────────────────────────

export function getVoteTally(votes: (number | null)[], playerCount: number): number[] {
  const tally = Array(playerCount).fill(0);
  for (const v of votes) {
    if (v !== null) tally[v]++;
  }
  return tally;
}

export function getMostVotedIdx(tally: number[]): number {
  return tally.indexOf(Math.max(...tally));
}

export function isCriminalCaught(criminalIdx: number, tally: number[]): boolean {
  const maxVotes = Math.max(...tally);
  const mostVotedIdx = tally.indexOf(maxVotes);
  // 동률이면 범인이 잡힌 것으로 보지 않음
  const tieCount = tally.filter(v => v === maxVotes).length;
  if (tieCount > 1) return false;
  return mostVotedIdx === criminalIdx;
}

// ─── 유틸 ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
