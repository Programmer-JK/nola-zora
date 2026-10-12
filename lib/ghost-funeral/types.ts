// ─── 게임 시나리오 ────────────────────────────────────────────

export interface GhostCase {
  id: string;
  title: string;
  emoji: string;
  ghostName: string;
  ghostAge: number;
  ghostJob: string;
  publicInfo: string;          // 모두에게 공개되는 사건 개요
  criminalSecret: string;      // 범인만 아는 비밀 (사망 경위 + 동기)
  eventCards: [string, string, string]; // 라운드 1~3에 공개되는 사건 카드
  investigatorClues: string[]; // 탐정들에게 1개씩 배분되는 단서 (최소 8개)
}

// ─── 게임 진행 상태 ───────────────────────────────────────────

export type GhostPhase =
  | 'role-reveal'   // 역할 공개 (차례대로 폰 넘기기)
  | 'event-card'    // 라운드별 사건 카드 공개
  | 'discussion'    // 토론 단계
  | 'vote'          // 투표 (차례대로 폰 넘기기)
  | 'result';       // 결과 공개

export interface GhostGameState {
  playerCount: number;
  caseId: string;
  criminalIdx: number;         // 범인 플레이어 인덱스 (0-based)
  clueAssignments: number[];   // clueAssignments[playerIdx] = 단서 인덱스 (-1: 범인)

  phase: GhostPhase;
  round: number;               // 현재 라운드 (1 ~ 3)

  // 역할 공개 진행
  revealPlayerIdx: number;
  roleShowing: boolean;

  // 투표 진행
  votePlayerIdx: number;
  voteShowing: boolean;
  votes: (number | null)[];    // votes[voterIdx] = 지목한 플레이어 인덱스
}
