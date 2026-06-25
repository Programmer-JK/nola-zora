'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom, updateGameState, registerPresence, finishGame,
  type LiarOnlineRoom,
} from '@/lib/liar/firebase-game';
import { selectOnlineCategory, restartOnlineGame } from '@/lib/liar/game-logic';
import { ALL_CATEGORIES, WORD_CATEGORIES } from '@/lib/liar/game-data';
import type { OnlineLiarGameState } from '@/lib/liar/types';

const ACCENT = '#e84242';
const LIAR_COLOR = '#e84242';
const WORD_COLOR = '#36e0cf';

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

// ─── 카테고리 선택 (호스트용) ─────────────────────────────────

function CategorySelectScreen({
  isHost, onSelect,
}: { isHost: boolean; onSelect: (cat: string) => void }) {
  if (!isHost) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>호스트가 카테고리를 선택 중...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 18px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎲</div>
        <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', margin: '0 0 6px' }}>카테고리 선택</h2>
        <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>하나를 골라서 랜덤 단어를 뽑아요</p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="arc-btn-ghost"
            style={{ padding: '14px 8px', borderRadius: 14, fontSize: 14, fontWeight: 600, textAlign: 'center', width: '100%' }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 내 역할 카드 ─────────────────────────────────────────────

function RoleCard({ isLiar, word, liarWord, category, mode }: {
  isLiar: boolean; word: string; liarWord: string; category: string; mode: 'normal' | 'fake';
}) {
  const isFake = mode === 'fake';
  const showWord = isLiar ? (isFake ? liarWord : null) : word;
  const isKnownLiar = isLiar && !isFake;

  return (
    <div className="liar-reveal" style={{
      width: '100%', maxWidth: 320,
      background: isKnownLiar ? 'rgba(232,66,66,0.12)' : 'rgba(54,224,207,0.10)',
      border: `2px solid ${isKnownLiar ? LIAR_COLOR : WORD_COLOR}`,
      borderRadius: 24, padding: '24px 20px', textAlign: 'center',
      boxShadow: `0 0 40px -8px ${isKnownLiar ? LIAR_COLOR : WORD_COLOR}`,
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{isKnownLiar ? '🕵️' : '🎯'}</div>
      {isKnownLiar ? (
        <>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 28, color: LIAR_COLOR, textShadow: `0 0 16px rgba(232,66,66,0.6)` }}>라이어</div>
          <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, background: 'rgba(232,66,66,0.1)', border: `1px solid rgba(232,66,66,0.3)` }}>
            <p style={{ fontSize: 11, color: 'var(--faint)', margin: '0 0 2px' }}>카테고리만 알고 있어요</p>
            <p style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: LIAR_COLOR, margin: 0 }}>{category}</p>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>카테고리: {category}</div>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 36, color: WORD_COLOR, textShadow: `0 0 16px rgba(54,224,207,0.6)` }}>
            {showWord}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────

export default function LiarOnlineGame() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<LiarOnlineRoom | null>(null);
  const [G, setG] = useState<OnlineLiarGameState | null>(null);
  const [liarGuess, setLiarGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWordList, setShowWordList] = useState(false);
  const unregPresenceRef = useRef<(() => void) | null>(null);
  const seenPresentRef = useRef<Set<string>>(new Set());

  const uid = getGuestUid() ?? '';

  useEffect(() => {
    registerPresence(code, uid).then(unreg => { unregPresenceRef.current = unreg; });

    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/liar'); return; }
      if (r.status === 'playing' && r.presence) {
        const presence = r.presence as Record<string, boolean>;
        // 한 번이라도 presence에 나타난 플레이어만 기록
        Object.keys(presence).forEach(id => seenPresentRef.current.add(id));
        // 이전에 접속했던 플레이어가 사라진 경우에만 이탈로 판단
        const missing = r.players.find(
          p => seenPresentRef.current.has(p.clientId) && !presence[p.clientId]
        );
        if (missing) finishGame(code, missing.name);
      }
      setRoom(r);
      if (r.gameState) setG(r.gameState);
    });

    return () => { unsub(); unregPresenceRef.current?.(); };
  }, [code, uid, router]);

  const myIdx = G ? G.players.findIndex(p => p.clientId === uid) : -1;
  const isHost = room?.hostClientId === uid;

  // 카테고리 선택 (호스트)
  const handleCategorySelect = useCallback(async (cat: string) => {
    if (!G || !isHost || submitting) return;
    setSubmitting(true);
    const next = selectOnlineCategory(G, cat);
    await updateGameState(code, next);
    setG(next);
    setSubmitting(false);
  }, [G, isHost, code, submitting]);

  // 라이어 공개 (호스트) → liar-guess 단계
  const handleGoToLiarGuess = useCallback(async () => {
    if (!G || !isHost || submitting) return;
    setSubmitting(true);
    const next = { ...G, phase: 'liar-guess' as const };
    await updateGameState(code, next);
    setG(next);
    setSubmitting(false);
  }, [G, isHost, code, submitting]);

  // 투표 (시민)
  const handleVote = useCallback(async (suspectClientId: string) => {
    if (!G || myIdx < 0 || submitting) return;
    setSubmitting(true);
    const newVotes = { ...G.votes, [uid]: suspectClientId };
    const next: OnlineLiarGameState = { ...G, votes: newVotes };
    await updateGameState(code, next);
    setG(next);
    setSubmitting(false);
  }, [G, myIdx, uid, code, submitting]);

  // 라이어 단어 추측 (라이어)
  const handleLiarGuessSubmit = useCallback(async () => {
    if (!G || myIdx < 0 || !liarGuess.trim() || submitting) return;
    setSubmitting(true);
    const correct = liarGuess.trim() === G.word.trim();
    const next: OnlineLiarGameState = { ...G, liarGuess: liarGuess.trim(), liarGuessCorrect: correct, phase: 'result' };
    await updateGameState(code, next);
    setG(next);
    setLiarGuess('');
    setSubmitting(false);
  }, [G, myIdx, liarGuess, code, submitting]);

  // 라이어 패스 (라이어)
  const handleLiarGuessPass = useCallback(async () => {
    if (!G || myIdx < 0 || submitting) return;
    setSubmitting(true);
    const next: OnlineLiarGameState = { ...G, liarGuess: null, liarGuessCorrect: null, phase: 'result' };
    await updateGameState(code, next);
    setG(next);
    setSubmitting(false);
  }, [G, myIdx, code, submitting]);

  // 결과로 이동 (호스트, liar-guess 단계에서)
  const handleGoToResult = useCallback(async () => {
    if (!G || !isHost || submitting) return;
    setSubmitting(true);
    const next: OnlineLiarGameState = { ...G, phase: 'result' };
    await updateGameState(code, next);
    setG(next);
    setSubmitting(false);
  }, [G, isHost, code, submitting]);

  // 다시 하기 (호스트)
  const handleRestart = useCallback(async () => {
    if (!G || !isHost || submitting) return;
    setSubmitting(true);
    const next = restartOnlineGame(G);
    await updateGameState(code, next);
    setG(next);
    setShowWordList(false);
    setSubmitting(false);
  }, [G, isHost, code, submitting]);

  if (!G || myIdx < 0) {
    return (
      <div className="cabinet"><div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>CONNECTING...</p>
        </div>
      </div>
    );
  }

  const isLiar = G.liarIdxs.includes(myIdx);
  const isFake = G.mode === 'fake';
  const liarNames = G.liarIdxs.map(i => G.players[i]?.name).filter(Boolean).join(', ');

  // 카테고리 단어 목록
  const catData = WORD_CATEGORIES.find(c => c.category === G.category);
  const categoryWords = catData?.words ?? [];

  // 투표 집계
  const voteTally: Record<string, number> = {};
  Object.values(G.votes ?? {}).forEach(suspectId => {
    voteTally[suspectId] = (voteTally[suspectId] ?? 0) + 1;
  });
  const myVote = G.votes?.[uid];

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen">

        {/* 상단 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <span className="arc-lbl">{G.players.length}명</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {G.category && (
              <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(232,66,66,0.08)', border: `1px solid rgba(232,66,66,0.3)` }}>
                <span style={{ fontSize: 13, color: ACCENT, fontFamily: 'var(--f-title)' }}>{G.category}</span>
              </div>
            )}
            <span className="arc-chip" style={{ fontSize: 11 }}>{G.mode === 'fake' ? '⚡ 거짓' : '🕵️ 기본'}</span>
          </div>
        </div>

        {/* 카테고리 선택 단계 */}
        {G.phase === 'category-select' && (
          <CategorySelectScreen isHost={isHost} onSelect={handleCategorySelect} />
        )}

        {/* 토론 단계 — 내 역할 + 단어 목록 + 공개 버튼 */}
        {G.phase === 'waiting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RoleCard isLiar={isLiar} word={G.word} liarWord={G.liarWord} category={G.category} mode={G.mode} />
            </div>

            <div className="arc-panel" style={{ padding: '16px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--faint)', margin: '0 0 4px' }}>카테고리</p>
              <p style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: ACCENT, margin: 0 }}>{G.category}</p>
            </div>

            <div className="arc-panel-inset" style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                순서대로 돌아가며 단어 힌트를 한 마디씩 말하세요.
                {isFake && <span style={{ color: 'var(--gold)' }}> 다른 말을 하는 사람을 찾아요!</span>}
              </p>
            </div>

            {/* 단어 목록 */}
            {categoryWords.length > 0 && (
              <div>
                <button
                  onClick={() => setShowWordList(v => !v)}
                  className="arc-btn-ghost"
                  style={{ width: '100%', fontSize: 13 }}
                >
                  {showWordList ? '▲ 단어 목록 닫기' : '▼ 이 카테고리 단어 목록 보기'}
                </button>
                {showWordList && (
                  <div style={{
                    marginTop: 10, padding: '14px 16px', borderRadius: 14,
                    background: 'var(--surface)', border: '1px solid var(--line-2)',
                    display: 'flex', flexWrap: 'wrap', gap: 8,
                  }}>
                    {categoryWords.map(w => (
                      <span key={w} style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--bg-2)', fontSize: 13, color: 'var(--text-2)' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isHost ? (
              <button onClick={handleGoToLiarGuess} disabled={submitting} className="arc-btn" style={{ background: ACCENT, fontSize: 16 }}>
                🕵️ 라이어 공개
              </button>
            ) : (
              <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'center' }}>
                호스트가 공개 버튼을 누를 때까지 토론하세요...
              </p>
            )}
          </div>
        )}

        {/* 라이어 공개 단계 — 시민: 투표 / 라이어: 정답 맞추기 */}
        {G.phase === 'liar-guess' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(232,66,66,0.10)', border: `1px solid rgba(232,66,66,0.35)`, textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: LIAR_COLOR, margin: '0 0 4px' }}>⚠️ 라이어 공개!</p>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                {isFake
                  ? `라이어는 시민과 다른 단어를 받았어요. 맞히면 역전!`
                  : `라이어가 단어를 맞히면 역전!`
                }
              </p>
            </div>

            {isLiar ? (
              /* 라이어: 정답 맞추기 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(232,66,66,0.08)', border: `1px solid rgba(232,66,66,0.25)`, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: LIAR_COLOR, margin: '0 0 2px' }}>🔍 정답 맞추기</p>
                  {isFake && (
                    <p style={{ fontSize: 13, color: 'var(--gold)', margin: '0 0 2px' }}>
                      당신이 받은 단어: <b>{G.liarWord}</b>
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>카테고리: {G.category} — 하나를 골라요</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {categoryWords.map(w => (
                    <button
                      key={w}
                      onClick={() => setLiarGuess(w)}
                      style={{
                        padding: '12px 8px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                        border: `1.5px solid ${liarGuess === w ? ACCENT : 'var(--line-2)'}`,
                        background: liarGuess === w ? 'rgba(232,66,66,0.15)' : 'var(--bg-2)',
                        color: liarGuess === w ? ACCENT : 'var(--text)',
                        cursor: 'pointer', transition: 'all .1s',
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                {liarGuess && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(232,66,66,0.08)', border: `1px solid rgba(232,66,66,0.3)`, textAlign: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--faint)' }}>선택: </span>
                    <span style={{ fontWeight: 700, color: ACCENT, fontSize: 16 }}>{liarGuess}</span>
                  </div>
                )}
                <button onClick={handleLiarGuessSubmit} disabled={!liarGuess || submitting} className="arc-btn" style={{ background: ACCENT }}>제출</button>
                <button onClick={handleLiarGuessPass} style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>모르겠어요 (패스)</button>
              </div>
            ) : (
              /* 시민: 투표하기 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text)', margin: '0 0 4px' }}>🗳️ 투표하기</p>
                  <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>라이어라고 생각하는 사람을 골라요</p>
                </div>
                {G.players.map((p, i) => {
                  const isMe = p.clientId === uid;
                  const isVotedFor = myVote === p.clientId;
                  const voteCount = voteTally[p.clientId] ?? 0;
                  const isThisLiar = G.liarIdxs.includes(i);
                  return (
                    <button
                      key={p.clientId}
                      onClick={() => !isMe && !G.liarIdxs.includes(myIdx) && handleVote(p.clientId)}
                      disabled={isMe || submitting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 14, border: `1.5px solid ${isVotedFor ? ACCENT : 'var(--line)'}`,
                        background: isVotedFor ? 'rgba(232,66,66,0.1)' : 'var(--surface)',
                        cursor: isMe ? 'default' : 'pointer',
                        opacity: isMe ? 0.5 : 1,
                        transition: 'all .12s',
                        width: '100%', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--faint)', width: 20 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: isVotedFor ? ACCENT : 'var(--text)' }}>
                        {p.name} {isMe && <span style={{ fontSize: 11, color: 'var(--faint)' }}>(나)</span>}
                      </span>
                      {voteCount > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
                          {voteCount}표
                        </span>
                      )}
                      {isVotedFor && <span style={{ fontSize: 13, color: ACCENT }}>✓</span>}
                    </button>
                  );
                })}
                {myVote && (
                  <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', margin: 0 }}>
                    투표 완료 — 라이어가 단어를 추측 중...
                  </p>
                )}
                {isHost && (
                  <button onClick={handleGoToResult} disabled={submitting} className="arc-btn" style={{ background: ACCENT, fontSize: 15, marginTop: 4 }}>
                    결과 공개
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 결과 */}
        {G.phase === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🎭</div>
              <h2 style={{ fontFamily: 'var(--f-disp)', fontSize: 22, color: ACCENT, margin: 0 }}>공개!</h2>
            </div>

            <div className="liar-reveal" style={{
              padding: '20px', borderRadius: 20, textAlign: 'center',
              background: 'rgba(232,66,66,0.1)', border: `2px solid ${LIAR_COLOR}`,
              boxShadow: `0 0 30px -8px ${LIAR_COLOR}`,
            }}>
              <p style={{ fontSize: 12, color: 'var(--faint)', margin: '0 0 4px' }}>{isFake ? '거짓 라이어' : '라이어'}</p>
              <p style={{ fontFamily: 'var(--f-title)', fontSize: 28, color: LIAR_COLOR, margin: 0 }}>{liarNames}</p>
              {isFake && <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>본인도 몰랐어요 😅</p>}
            </div>

            <div className="arc-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '카테고리', value: G.category, color: undefined },
                { label: '시민 단어', value: G.word, color: WORD_COLOR },
                ...(isFake ? [{ label: '라이어 단어', value: G.liarWord, color: 'var(--gold)' }] : []),
                ...(G.liarGuess ? [{ label: '라이어 추측', value: `${G.liarGuess} ${G.liarGuessCorrect ? '✓' : '✗'}`, color: G.liarGuessCorrect ? WORD_COLOR : 'var(--red)' }] : []),
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--faint)' }}>{label}</span>
                  <span style={{ color: color ?? 'var(--text)', fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* 투표 결과 */}
            {Object.keys(G.votes ?? {}).length > 0 && (
              <div className="arc-panel-inset" style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 12, color: 'var(--faint)', margin: '0 0 8px' }}>투표 결과</p>
                {G.players.map((p, i) => {
                  const count = voteTally[p.clientId] ?? 0;
                  if (count === 0) return null;
                  const isThisLiar = G.liarIdxs.includes(i);
                  return (
                    <div key={p.clientId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: isThisLiar ? LIAR_COLOR : 'var(--text-2)' }}>
                        {p.name} {isThisLiar && '🕵️'}
                      </span>
                      <span style={{ fontWeight: 700, color: isThisLiar ? LIAR_COLOR : 'var(--faint)' }}>{count}표</span>
                    </div>
                  );
                })}
              </div>
            )}

            {G.liarGuessCorrect !== null && (
              <div style={{
                padding: '12px', borderRadius: 12, textAlign: 'center',
                background: G.liarGuessCorrect ? 'rgba(54,224,207,0.1)' : 'rgba(255,90,77,0.08)',
                border: `1.5px solid ${G.liarGuessCorrect ? WORD_COLOR : 'rgba(255,90,77,0.3)'}`,
              }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: G.liarGuessCorrect ? WORD_COLOR : 'var(--red)', margin: 0 }}>
                  {G.liarGuessCorrect ? '🎉 라이어 역전성공!' : '🎉 시민 팀 승리!'}
                </p>
              </div>
            )}

            {/* 단어 목록 */}
            {categoryWords.length > 0 && (
              <div>
                <button
                  onClick={() => setShowWordList(v => !v)}
                  className="arc-btn-ghost"
                  style={{ width: '100%', fontSize: 13 }}
                >
                  {showWordList ? '▲ 단어 목록 닫기' : '▼ 이 카테고리 단어 목록 보기'}
                </button>
                {showWordList && (
                  <div style={{
                    marginTop: 10, padding: '14px 16px', borderRadius: 14,
                    background: 'var(--surface)', border: '1px solid var(--line-2)',
                    display: 'flex', flexWrap: 'wrap', gap: 8,
                  }}>
                    {categoryWords.map(w => (
                      <span
                        key={w}
                        style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 13,
                          background: w === G.word ? 'rgba(54,224,207,0.15)' : (w === G.liarWord ? 'rgba(255,215,0,0.15)' : 'var(--bg-2)'),
                          color: w === G.word ? WORD_COLOR : (w === G.liarWord ? 'var(--gold)' : 'var(--text-2)'),
                          fontWeight: (w === G.word || w === G.liarWord) ? 700 : 400,
                        }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isHost ? (
              <button onClick={handleRestart} disabled={submitting} className="arc-btn" style={{ background: ACCENT, fontSize: 16 }}>
                다시 하기
              </button>
            ) : (
              <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'center' }}>호스트가 다시 하기를 누를 때까지 기다려요...</p>
            )}
          </div>
        )}

        {/* 이탈 감지 */}
        {room?.status === 'finished' && room.leftPlayerName && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="arc-panel ticks" style={{ padding: '28px 24px', textAlign: 'center', maxWidth: 320 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>😢</div>
              <p style={{ fontFamily: 'var(--f-title)', fontSize: 20, marginBottom: 8 }}>{room.leftPlayerName}님이 나갔어요</p>
              <button onClick={() => router.push('/liar')} className="arc-btn" style={{ background: ACCENT, width: '100%' }}>처음으로</button>
            </div>
          </div>
        )}

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
          LIAR GAME · {G.players.length}명
        </p>
      </div>
    </div>
  );
}
