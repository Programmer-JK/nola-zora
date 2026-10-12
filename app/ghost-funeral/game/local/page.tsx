'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createGhostGame,
  showRole, confirmRole,
  startDiscussion, nextRound,
  showVote, castVote,
  getVoteTally, getMostVotedIdx, isCriminalCaught,
} from '@/lib/ghost-funeral/game-logic';
import { getCaseById } from '@/lib/ghost-funeral/game-data';
import type { GhostGameState } from '@/lib/ghost-funeral/types';

const ACCENT = '#a274ff';
const CRIMINAL_COLOR = '#ff5a4d';
const DETECTIVE_COLOR = '#36e0cf';

// ─── 넘기기 화면 ──────────────────────────────────────────────

function PassScreen({
  playerNum,
  label,
  sublabel,
  btnLabel,
  onReady,
  accentColor = ACCENT,
}: {
  playerNum: number;
  label: string;
  sublabel: string;
  btnLabel: string;
  onReady: () => void;
  accentColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', gap: 28, textAlign: 'center', padding: '0 32px',
    }}>
      <div style={{ fontSize: 64 }}>👻</div>
      <div>
        <p style={{ color: 'var(--faint)', fontSize: 14, margin: '0 0 6px' }}>{sublabel}</p>
        <p style={{ fontFamily: 'var(--f-disp)', fontSize: 52, color: accentColor, textShadow: `0 0 20px ${accentColor}88`, margin: 0 }}>
          {playerNum}번
        </p>
        <p style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', margin: '4px 0 0' }}>{label}</p>
      </div>
      <button
        onClick={onReady}
        className="arc-btn"
        style={{ background: accentColor, fontSize: 16, width: '100%', maxWidth: 300 }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

// ─── 역할 카드 ────────────────────────────────────────────────

function RoleCard({
  state,
  onConfirm,
}: {
  state: GhostGameState;
  onConfirm: () => void;
}) {
  const ghostCase = getCaseById(state.caseId)!;
  const playerIdx = state.revealPlayerIdx;
  const isCriminal = playerIdx === state.criminalIdx;
  const clueIdx = state.clueAssignments[playerIdx];
  const myClue = !isCriminal ? ghostCase.investigatorClues[clueIdx] : null;

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 역할 뱃지 */}
      <div style={{
        textAlign: 'center',
        padding: '20px 16px',
        borderRadius: 18,
        background: isCriminal
          ? `linear-gradient(135deg, rgba(255,90,77,0.15), rgba(255,90,77,0.05))`
          : `linear-gradient(135deg, rgba(54,224,207,0.15), rgba(54,224,207,0.05))`,
        border: `2px solid ${isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR}44`,
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>{isCriminal ? '💀' : '🔍'}</div>
        <div style={{
          fontFamily: 'var(--f-disp)', fontSize: 24,
          color: isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR,
          textShadow: `0 0 12px ${isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR}88`,
        }}>
          {isCriminal ? '범인' : '탐정'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--faint)', marginTop: 4 }}>
          {isCriminal ? '당신이 범인입니다. 들키지 마세요.' : '당신은 탐정입니다. 범인을 찾아내세요.'}
        </div>
      </div>

      {/* 사건 개요 (모두 동일) */}
      <div className="arc-panel" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 6, letterSpacing: 1 }}>CASE FILE</div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
          {ghostCase.ghostName} ({ghostCase.ghostAge}세) · {ghostCase.ghostJob}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{ghostCase.publicInfo}</div>
      </div>

      {/* 비밀 정보 */}
      <div style={{
        padding: 16,
        borderRadius: 14,
        border: `2px solid ${isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR}44`,
        background: 'var(--surface)',
      }}>
        <div style={{
          fontSize: 11, marginBottom: 8, letterSpacing: 1,
          color: isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR,
        }}>
          {isCriminal ? '💀 범인만 아는 비밀' : '🔍 나만 아는 단서'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
          {isCriminal ? ghostCase.criminalSecret : myClue}
        </div>
      </div>

      {/* 목표 */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: 'var(--surface-2)',
        fontSize: 12,
        color: 'var(--text-2)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text)' }}>목표: </strong>
        {isCriminal
          ? '자연스럽게 진술에 섞여들고, 토론에서 의심을 다른 플레이어에게 돌리세요. 최다 득표를 피하면 승리합니다.'
          : '각 라운드에서 단서와 사건 카드를 종합해 범인을 추리하세요. 범인에게 최다 투표가 모이면 탐정 팀 승리입니다.'}
      </div>

      <button
        onClick={onConfirm}
        className="arc-btn"
        style={{
          background: isCriminal ? CRIMINAL_COLOR : DETECTIVE_COLOR,
          color: '#000',
          fontSize: 15,
          boxShadow: `0 4px 0 0 ${isCriminal ? '#c03028' : '#1ca898'}`,
        }}
      >
        확인했습니다 ✓
      </button>
    </div>
  );
}

// ─── 사건 카드 화면 ───────────────────────────────────────────

function EventCardScreen({
  state,
  onStartDiscussion,
}: {
  state: GhostGameState;
  onStartDiscussion: () => void;
}) {
  const ghostCase = getCaseById(state.caseId)!;
  const card = ghostCase.eventCards[state.round - 1];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', gap: 24, textAlign: 'center', padding: '0 16px',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--faint)', letterSpacing: 2, marginBottom: 4 }}>ROUND</div>
        <div style={{ fontFamily: 'var(--f-disp)', fontSize: 64, color: ACCENT, textShadow: `0 0 24px ${ACCENT}88`, lineHeight: 1 }}>
          {state.round}
        </div>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text-2)', marginTop: 4 }}>
          새로운 단서가 발견됐다
        </div>
      </div>

      {/* 사건 카드 */}
      <div style={{
        width: '100%',
        padding: '24px 20px',
        borderRadius: 20,
        background: `linear-gradient(135deg, rgba(162,116,255,0.12), rgba(162,116,255,0.04))`,
        border: `2px solid ${ACCENT}44`,
        boxShadow: `0 0 32px ${ACCENT}22`,
      }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 2, marginBottom: 12 }}>EVIDENCE CARD #{state.round}</div>
        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>{card}</div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
        이 단서를 바탕으로 자유롭게 진술하고 토론하세요.
        {state.round < 3 && <><br />라운드가 끝나면 다음 단서가 공개됩니다.</>}
        {state.round === 3 && <><br />마지막 라운드입니다. 토론 후 투표로 범인을 지목하세요.</>}
      </div>

      <button
        onClick={onStartDiscussion}
        className="arc-btn"
        style={{ background: ACCENT, fontSize: 16, width: '100%', maxWidth: 320, boxShadow: `0 4px 0 0 rgba(100,50,200,0.5)` }}
      >
        토론 시작 →
      </button>
    </div>
  );
}

// ─── 토론 화면 ────────────────────────────────────────────────

function DiscussionScreen({
  state,
  onNext,
}: {
  state: GhostGameState;
  onNext: () => void;
}) {
  const isLastRound = state.round === 3;

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2 }}>ROUND {state.round} · 토론 중</div>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)', marginTop: 4 }}>
          자유 토론
        </div>
      </div>

      {/* 진술 가이드 */}
      <div className="arc-panel" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: ACCENT, marginBottom: 10, letterSpacing: 1 }}>진술 순서</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Array.from({ length: state.playerCount }, (_, i) => (
            <div key={i} style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--line-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--f-disp)', fontSize: 14, color: 'var(--text)',
            }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10, lineHeight: 1.6 }}>
          각자 자신이 아는 단서를 활용해 진술하세요. 범인은 탐정인 척 자연스럽게 섞여드세요.
        </div>
      </div>

      {/* 팁 */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text)' }}>💡 팁: </strong>
        진술할 때 자신의 단서를 직접 읽지 말고, 자연스럽게 이야기에 녹여서 말하세요. 범인은 다른 사람에 대한 의심을 유도하는 전략이 필요합니다.
      </div>

      <button
        onClick={onNext}
        className="arc-btn"
        style={{
          background: isLastRound ? CRIMINAL_COLOR : ACCENT,
          fontSize: 16,
          boxShadow: isLastRound ? `0 4px 0 0 #c03028` : `0 4px 0 0 rgba(100,50,200,0.5)`,
        }}
      >
        {isLastRound ? '⚖️ 투표하기' : `라운드 ${state.round + 1}로 →`}
      </button>
    </div>
  );
}

// ─── 투표 화면 ────────────────────────────────────────────────

function VoteScreen({
  state,
  onCastVote,
}: {
  state: GhostGameState;
  onCastVote: (idx: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  if (!state.voteShowing) return null;

  const confirm = () => {
    if (selected === null) return;
    onCastVote(selected);
    setSelected(null);
  };

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2, marginBottom: 4 }}>SECRET VOTE</div>
        <div style={{ fontFamily: 'var(--f-disp)', fontSize: 28, color: CRIMINAL_COLOR, textShadow: `0 0 12px ${CRIMINAL_COLOR}88` }}>
          {state.votePlayerIdx + 1}번 플레이어
        </div>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text-2)', marginTop: 4 }}>
          범인이라 생각하는 사람을 지목하세요
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: state.playerCount }, (_, i) => {
          if (i === state.votePlayerIdx) return null; // 자기 자신 제외
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                border: `2px solid ${isSelected ? CRIMINAL_COLOR : 'var(--line-2)'}`,
                background: isSelected ? `rgba(255,90,77,0.15)` : 'var(--surface)',
                color: isSelected ? CRIMINAL_COLOR : 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isSelected ? `rgba(255,90,77,0.2)` : 'var(--surface-2)',
                border: `1px solid ${isSelected ? CRIMINAL_COLOR : 'var(--line-2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--f-disp)', fontSize: 14,
                color: isSelected ? CRIMINAL_COLOR : 'var(--text)',
              }}>
                {i + 1}
              </div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{i + 1}번 플레이어</span>
              {isSelected && <span style={{ marginLeft: 'auto', fontSize: 18 }}>💀</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={confirm}
        disabled={selected === null}
        className="arc-btn"
        style={{
          background: selected !== null ? CRIMINAL_COLOR : 'var(--surface-3)',
          color: selected !== null ? '#fff' : 'var(--faint)',
          fontSize: 16,
          boxShadow: selected !== null ? `0 4px 0 0 #c03028` : 'none',
          transition: 'all 0.15s',
        }}
      >
        {selected !== null ? `${selected + 1}번을 지목합니다` : '플레이어를 선택하세요'}
      </button>
    </div>
  );
}

// ─── 결과 화면 ────────────────────────────────────────────────

function ResultScreen({
  state,
  onRestart,
  onHome,
}: {
  state: GhostGameState;
  onRestart: () => void;
  onHome: () => void;
}) {
  const ghostCase = getCaseById(state.caseId)!;
  const tally = getVoteTally(state.votes, state.playerCount);
  const mostVotedIdx = getMostVotedIdx(tally);
  const caught = isCriminalCaught(state.criminalIdx, tally);

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 승패 */}
      <div style={{
        textAlign: 'center', padding: '28px 16px', borderRadius: 20,
        background: caught
          ? `linear-gradient(135deg, rgba(54,224,207,0.12), rgba(54,224,207,0.04))`
          : `linear-gradient(135deg, rgba(255,90,77,0.15), rgba(255,90,77,0.04))`,
        border: `2px solid ${caught ? DETECTIVE_COLOR : CRIMINAL_COLOR}44`,
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{caught ? '🎉' : '💀'}</div>
        <div style={{
          fontFamily: 'var(--f-disp)', fontSize: 26,
          color: caught ? DETECTIVE_COLOR : CRIMINAL_COLOR,
          textShadow: `0 0 16px ${caught ? DETECTIVE_COLOR : CRIMINAL_COLOR}88`,
        }}>
          {caught ? '탐정 팀 승리!' : '범인 탈출 성공!'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
          {caught
            ? `${state.criminalIdx + 1}번 플레이어가 범인으로 적발됐습니다.`
            : `${state.criminalIdx + 1}번 플레이어가 범인이었지만 탈출에 성공했습니다.`}
        </div>
      </div>

      {/* 투표 결과 */}
      <div className="arc-panel" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: ACCENT, marginBottom: 10, letterSpacing: 1 }}>VOTE RESULT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tally.map((votes, i) => {
            const isCriminalPlayer = i === state.criminalIdx;
            const isMostVoted = i === mostVotedIdx;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: isMostVoted ? `rgba(162,116,255,0.1)` : 'var(--surface-2)',
                border: `1px solid ${isMostVoted ? ACCENT : 'transparent'}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: isCriminalPlayer ? `rgba(255,90,77,0.2)` : 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: isCriminalPlayer ? CRIMINAL_COLOR : 'var(--text-2)',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
                  {i + 1}번 플레이어
                  {isCriminalPlayer && <span style={{ fontSize: 11, color: CRIMINAL_COLOR, marginLeft: 6 }}>💀 범인</span>}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: votes }, (_, j) => (
                    <span key={j} style={{ fontSize: 16 }}>💀</span>
                  ))}
                </div>
                <span style={{
                  fontFamily: 'var(--f-disp)', fontSize: 18,
                  color: isMostVoted ? ACCENT : 'var(--faint)',
                  minWidth: 24, textAlign: 'right',
                }}>
                  {votes}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 사건 전체 공개 */}
      <div className="arc-panel" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: CRIMINAL_COLOR, marginBottom: 10, letterSpacing: 1 }}>CASE REVEAL</div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>
          {ghostCase.emoji} {ghostCase.title} — 진실
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
          {ghostCase.criminalSecret}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onHome} className="arc-btn-ghost" style={{ flex: 1, fontSize: 14 }}>
          ← 처음으로
        </button>
        <button
          onClick={onRestart}
          className="arc-btn"
          style={{ flex: 2, background: ACCENT, fontSize: 14, boxShadow: `0 3px 0 0 rgba(100,50,200,0.5)` }}
        >
          👻 다시 하기
        </button>
      </div>
    </div>
  );
}

// ─── 메인 게임 ────────────────────────────────────────────────

export default function GhostFuneralLocal() {
  const router = useRouter();
  const [state, setState] = useState<GhostGameState | null>(null);

  useEffect(() => {
    const playerCount = parseInt(sessionStorage.getItem('ghost-playerCount') ?? '5', 10);
    const caseId = sessionStorage.getItem('ghost-caseId') ?? '';
    setState(createGhostGame(playerCount, caseId || undefined));
  }, []);

  if (!state) return null;

  const handleRestart = () => {
    const playerCount = parseInt(sessionStorage.getItem('ghost-playerCount') ?? '5', 10);
    const caseId = sessionStorage.getItem('ghost-caseId') ?? '';
    setState(createGhostGame(playerCount, caseId || undefined));
  };

  // ─ phase: role-reveal ─
  if (state.phase === 'role-reveal') {
    if (!state.roleShowing) {
      return (
        <div className="cabinet">
          <div className="crt" />
          <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
            <PassScreen
              playerNum={state.revealPlayerIdx + 1}
              label="플레이어"
              sublabel="기기를 받고 버튼을 누르세요"
              btnLabel="내 역할 보기 →"
              onReady={() => setState(showRole(state))}
              accentColor={ACCENT}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <RoleCard state={state} onConfirm={() => setState(confirmRole(state))} />
        </div>
      </div>
    );
  }

  // ─ phase: event-card ─
  if (state.phase === 'event-card') {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <EventCardScreen
            state={state}
            onStartDiscussion={() => setState(startDiscussion(state))}
          />
        </div>
      </div>
    );
  }

  // ─ phase: discussion ─
  if (state.phase === 'discussion') {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <DiscussionScreen
            state={state}
            onNext={() => setState(nextRound(state))}
          />
        </div>
      </div>
    );
  }

  // ─ phase: vote ─
  if (state.phase === 'vote') {
    if (!state.voteShowing) {
      return (
        <div className="cabinet">
          <div className="crt" />
          <div className="arc-screen" style={{ '--c': CRIMINAL_COLOR } as React.CSSProperties}>
            <PassScreen
              playerNum={state.votePlayerIdx + 1}
              label="플레이어, 기기를 받으세요"
              sublabel="비밀 투표"
              btnLabel="투표하기 →"
              onReady={() => setState(showVote(state))}
              accentColor={CRIMINAL_COLOR}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': CRIMINAL_COLOR } as React.CSSProperties}>
          <VoteScreen
            state={state}
            onCastVote={(idx) => setState(castVote(state, idx))}
          />
        </div>
      </div>
    );
  }

  // ─ phase: result ─
  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
        <ResultScreen
          state={state}
          onRestart={handleRestart}
          onHome={() => router.push('/ghost-funeral')}
        />
      </div>
    </div>
  );
}
