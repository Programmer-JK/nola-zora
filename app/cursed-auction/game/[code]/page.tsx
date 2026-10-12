'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom,
  submitBid,
  submitAppraisal,
  advanceFromDiscussion,
  advanceFromBidding,
  advanceFromRoundResult,
  restartGame,
  registerPresence,
} from '@/lib/cursed-auction/firebase-game';
import type { AuctionRoom, Treasure, AuctionPlayer, AppraisalResult } from '@/lib/cursed-auction/types';
import { getFinalScore, rankPlayers, riskLabel, riskColor, riskEmoji } from '@/lib/cursed-auction/game-logic';

const ACCENT = '#f59e0b';

// ─── Timer display ────────────────────────────────────────────────────────────

function useCountdown(deadlineAt: number): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadlineAt]);
  return secs;
}

function Timer({ deadlineAt, warn = 5 }: { deadlineAt: number; warn?: number }) {
  const secs = useCountdown(deadlineAt);
  const isWarn = secs <= warn && secs > 0;
  return (
    <span style={{
      fontFamily: 'var(--f-pix)', fontSize: 13,
      color: isWarn ? '#ef4444' : ACCENT,
      textShadow: isWarn ? '0 0 10px #ef4444' : `0 0 8px ${ACCENT}`,
      animation: isWarn ? 'blink 0.7s step-end infinite' : 'none',
    }}>
      🕐 {secs}s
    </span>
  );
}

// ─── Treasure card ────────────────────────────────────────────────────────────

function TreasureCard({
  treasure,
  showSecret,
  onAppraise,
  canAppraise,
  myAppraisal,
  bidCount,
  bids,
  myClientId,
  isResult,
}: {
  treasure: Treasure;
  showSecret: boolean;
  onAppraise?: () => void;
  canAppraise?: boolean;
  myAppraisal?: AppraisalResult | null;
  bidCount?: number;
  bids?: Record<string, { amount: number; clientId: string }>;
  myClientId?: string;
  isResult?: boolean;
}) {
  const isAppraisedByMe = myAppraisal?.treasureId === treasure.id;
  const rColor = riskColor(treasure.riskLevel);

  return (
    <div
      className="arc-panel"
      style={{
        flex: 1,
        minWidth: 0,
        padding: '14px 12px',
        border: isResult && treasure.status === 'sold' && treasure.winnerClientId === myClientId
          ? `2px solid ${ACCENT}`
          : undefined,
        boxShadow: isResult && treasure.status === 'sold' && treasure.winnerClientId === myClientId
          ? `0 0 16px rgba(245,158,11,0.4)`
          : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 위험도 색상 줄 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: rColor, opacity: 0.7 }} />

      {/* 보물 이름 */}
      <div style={{ fontFamily: 'var(--f-title)', fontSize: 14, color: 'var(--text)', marginBottom: 6, paddingTop: 4 }}>
        {treasure.name}
      </div>

      {/* 단서 */}
      <p style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5, marginBottom: 8, minHeight: 34 }}>
        {treasure.clue}
      </p>

      {/* 위험 등급 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>{riskEmoji(treasure.riskLevel)}</span>
        <span style={{ fontSize: 11, color: rColor, fontWeight: 700 }}>위험 {riskLabel(treasure.riskLevel)}</span>
      </div>

      {/* 실제 효과 (showSecret 또는 감정 결과) */}
      {showSecret ? (
        <div style={{
          padding: '6px 8px', borderRadius: 6,
          background: treasure.isCursed ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${treasure.isCursed ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: treasure.isCursed ? '#ef4444' : '#22c55e' }}>
            {treasure.isCursed ? `💀 저주 ${treasure.actualScore}점` : `✨ 안전 +${treasure.actualScore}점`}
          </span>
        </div>
      ) : isAppraisedByMe ? (
        <div style={{
          padding: '6px 8px', borderRadius: 6,
          background: myAppraisal!.isCursed ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${myAppraisal!.isCursed ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: myAppraisal!.isCursed ? '#ef4444' : '#22c55e' }}>
            🔍 {myAppraisal!.isCursed ? `저주 ${myAppraisal!.actualScore}점` : `안전 +${myAppraisal!.actualScore}점`}
          </span>
        </div>
      ) : null}

      {/* 결과 페이즈: 낙찰 상태 */}
      {isResult && (
        <div style={{ marginBottom: 6 }}>
          {treasure.status === 'sold' && (
            <div style={{ fontSize: 11.5, color: ACCENT, fontWeight: 700 }}>
              🏆 낙찰 {treasure.winningBid}금화
            </div>
          )}
          {treasure.status === 'tied' && (
            <div style={{ fontSize: 11.5, color: '#a855f7', fontWeight: 700 }}>⚡ 동점 — 낙찰 실패</div>
          )}
          {treasure.status === 'unsold' && (
            <div style={{ fontSize: 11.5, color: 'var(--dim)' }}>— 미낙찰</div>
          )}
        </div>
      )}

      {/* 입찰 수 뱃지 */}
      {typeof bidCount === 'number' && bidCount > 0 && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(245,158,11,0.2)', border: `1px solid rgba(245,158,11,0.4)`,
          borderRadius: 10, padding: '2px 6px', fontSize: 10, color: ACCENT,
        }}>
          {bidCount}명 입찰
        </span>
      )}

      {/* 감정 버튼 (DISCUSSION) */}
      {onAppraise && canAppraise && !isAppraisedByMe && (
        <button
          onClick={onAppraise}
          className="arc-btn-ghost"
          style={{ width: '100%', fontSize: 11, padding: '7px 0', marginTop: 4 }}
        >
          🔍 감정하기
        </button>
      )}
    </div>
  );
}

// ─── Score board ──────────────────────────────────────────────────────────────

function ScoreBoard({ players, myClientId, compact }: { players: AuctionPlayer[]; myClientId: string; compact?: boolean }) {
  const ranked = rankPlayers(players);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6 }}>
      {ranked.map((p, i) => {
        const isMe = p.clientId === myClientId;
        const final = getFinalScore(p);
        return (
          <div
            key={p.clientId}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: compact ? '6px 10px' : '8px 12px',
              borderRadius: 8,
              background: isMe ? 'rgba(245,158,11,0.08)' : 'var(--surface-2)',
              border: isMe ? `1px solid rgba(245,158,11,0.3)` : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 12, width: 20, color: 'var(--dim)', fontFamily: 'var(--f-pix)' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: isMe ? 700 : 400, color: isMe ? ACCENT : 'var(--text-2)', fontSize: 12.5 }}>
              {p.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>
              🪙{p.coins}
            </span>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 12, color: isMe ? ACCENT : 'var(--text)', fontWeight: 700 }}>
              {final}pt
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Discussion phase ─────────────────────────────────────────────────────────

function DiscussionPhase({
  room,
  myClientId,
  myPlayer,
}: {
  room: AuctionRoom;
  myClientId: string;
  myPlayer: AuctionPlayer | undefined;
}) {
  const [appraising, setAppraising] = useState(false);
  const [appraisalError, setAppraisalError] = useState('');

  const canAppraise = !!myPlayer && !myPlayer.appraisalUsed;
  const myAppraisal = room.appraisals?.[myClientId] ?? null;

  const handleAppraise = async (treasureId: string) => {
    setAppraisalError('');
    setAppraising(true);
    const { error } = await submitAppraisal(room.code, myClientId, treasureId);
    if (error) setAppraisalError(error);
    setAppraising(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--dim)' }}>
          💬 보물을 살펴보고 자유롭게 대화하세요!
        </p>
      </div>

      {/* 보물 카드 3장 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {room.treasures.map(t => (
          <TreasureCard
            key={t.id}
            treasure={t}
            showSecret={false}
            canAppraise={canAppraise && !appraising}
            onAppraise={() => handleAppraise(t.id)}
            myAppraisal={myAppraisal}
            myClientId={myClientId}
          />
        ))}
      </div>

      {/* 감정 상태 */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className="arc-chip" style={{ fontSize: 11 }}>
          {canAppraise ? '🔍 감정 1회 남음' : '🔍 감정 사용 완료'}
        </span>
        <span className="arc-chip" style={{ fontSize: 11 }}>
          🪙 내 금화: {myPlayer?.coins ?? 0}개
        </span>
      </div>

      {appraisalError && (
        <p style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center' }}>{appraisalError}</p>
      )}

      {/* 플레이어 목록 */}
      <ScoreBoard players={room.players} myClientId={myClientId} compact />
    </div>
  );
}

// ─── Bidding phase ────────────────────────────────────────────────────────────

function BiddingPhase({
  room,
  myClientId,
  myPlayer,
}: {
  room: AuctionRoom;
  myClientId: string;
  myPlayer: AuctionPlayer | undefined;
}) {
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(null);
  const [isPassing, setIsPassing] = useState(false);
  const [amount, setAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const myBid = room.bids?.[myClientId];
  const submitted = !!myBid;

  const handleSelectTreasure = (id: string) => {
    setSelectedTreasureId(id);
    setIsPassing(false);
  };

  const handlePass = () => {
    setIsPassing(true);
    setSelectedTreasureId(null);
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    const err = await submitBid(
      room.code,
      myClientId,
      isPassing ? null : selectedTreasureId,
      isPassing ? 0 : amount,
    );
    if (err) { setSubmitError(err); setSubmitting(false); }
  };

  const canSubmit = !submitted && (isPassing || selectedTreasureId !== null);
  const maxBid = Math.min(4, myPlayer?.coins ?? 0);

  // Bid submission status
  const submittedCount = Object.keys(room.bids ?? {}).length;
  const totalCount = room.players.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {submitted ? (
        <div style={{
          textAlign: 'center', padding: '14px 0',
          color: '#22c55e', fontWeight: 700,
        }}>
          ✓ 입찰 완료! 결과를 기다리는 중...
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
            {submittedCount}/{totalCount}명 제출
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center' }}>
            🪙 보유 금화: <strong style={{ color: ACCENT }}>{myPlayer?.coins ?? 0}개</strong>
          </p>

          {/* 보물 선택 */}
          <div>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>보물 선택</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {room.treasures.map(t => {
                const sel = selectedTreasureId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTreasure(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      background: sel ? `rgba(245,158,11,0.12)` : 'var(--surface-2)',
                      border: sel ? `2px solid ${ACCENT}` : '2px solid transparent',
                      textAlign: 'left', outline: 'none',
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: sel ? `2px solid ${ACCENT}` : '2px solid var(--line)',
                      background: sel ? ACCENT : 'transparent',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: sel ? 700 : 400, color: sel ? ACCENT : 'var(--text-2)', fontSize: 13.5 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: riskColor(t.riskLevel), marginTop: 1 }}>
                        {riskEmoji(t.riskLevel)} 위험 {riskLabel(t.riskLevel)}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 포기 옵션 */}
              <button
                onClick={handlePass}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: isPassing ? 'rgba(239,68,68,0.08)' : 'var(--surface-2)',
                  border: isPassing ? '2px solid rgba(239,68,68,0.5)' : '2px solid transparent',
                  textAlign: 'left', outline: 'none',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: isPassing ? '2px solid #ef4444' : '2px solid var(--line)',
                  background: isPassing ? '#ef4444' : 'transparent',
                }} />
                <span style={{ color: isPassing ? '#ef4444' : 'var(--dim)', fontSize: 13 }}>이번 라운드 포기</span>
              </button>
            </div>
          </div>

          {/* 금액 선택 */}
          {selectedTreasureId && (
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>입찰 금화</span>
              <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#000' } as React.CSSProperties}>
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setAmount(n)}
                    disabled={n > maxBid}
                    className={amount === n ? 'on' : ''}
                    style={amount === n
                      ? { background: ACCENT, color: '#000', boxShadow: `0 3px 0 0 rgba(245,158,11,0.4)`, fontWeight: 700 }
                      : n > maxBid ? { opacity: 0.3, cursor: 'not-allowed' } : {}
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              {selectedTreasureId && (
                <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, textAlign: 'center' }}>
                  입찰 후 남은 금화: {(myPlayer?.coins ?? 0) - amount}개
                </p>
              )}
            </div>
          )}

          {submitError && (
            <p style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center' }}>{submitError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="arc-btn"
            style={{
              background: canSubmit ? ACCENT : 'var(--surface-2)',
              color: canSubmit ? '#000' : 'var(--dim)',
              fontWeight: 700, fontSize: 17,
            }}
          >
            {submitting ? 'LOADING...' : isPassing ? '포기 확정' : canSubmit ? '입찰하기' : '보물을 선택하세요'}
          </button>
        </>
      )}

      {/* 제출 현황 */}
      <div>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 6 }}>제출 현황</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {room.players.map(p => {
            const hasBid = !!room.bids?.[p.clientId];
            const isMe = p.clientId === myClientId;
            return (
              <span
                key={p.clientId}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 8, fontSize: 11,
                  background: hasBid ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)',
                  border: `1px solid ${hasBid ? 'rgba(34,197,94,0.3)' : 'var(--line)'}`,
                  color: hasBid ? '#22c55e' : 'var(--dim)',
                  fontWeight: isMe ? 700 : 400,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                {p.name} {hasBid ? '✓' : '...'}
              </span>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Round result phase ───────────────────────────────────────────────────────

function RoundResultPhase({
  room,
  myClientId,
}: {
  room: AuctionRoom;
  myClientId: string;
}) {
  const bids = room.bids ?? {};
  const bidList = Object.values(bids);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
          라운드 {room.roundNumber} 결과
        </div>
      </div>

      {/* 각 보물 결과 */}
      {room.treasures.map(treasure => {
        const treasureBids = bidList.filter(b => b.treasureId === treasure.id && b.amount > 0);
        const isMyWin = treasure.status === 'sold' && treasure.winnerClientId === myClientId;
        const isMyLoss = treasure.status !== 'sold' && bidList.some(b => b.clientId === myClientId && b.treasureId === treasure.id);

        return (
          <div
            key={treasure.id}
            className="arc-panel"
            style={{
              padding: '14px',
              border: isMyWin ? `2px solid ${ACCENT}` : undefined,
              boxShadow: isMyWin ? `0 0 16px rgba(245,158,11,0.3)` : undefined,
            }}
          >
            {/* 보물 헤더 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--f-title)', fontSize: 15, color: 'var(--text)' }}>
                  {treasure.name}
                </div>
                <div style={{ fontSize: 11, color: riskColor(treasure.riskLevel), marginTop: 2 }}>
                  {riskEmoji(treasure.riskLevel)} 위험 {riskLabel(treasure.riskLevel)}
                </div>
              </div>
              {/* 실제 효과 공개 */}
              <div style={{
                padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                background: treasure.isCursed ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                border: `1px solid ${treasure.isCursed ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: treasure.isCursed ? '#ef4444' : '#22c55e' }}>
                  {treasure.isCursed ? `💀 ${treasure.actualScore}` : `✨ +${treasure.actualScore}`}
                </span>
              </div>
            </div>

            {/* 낙찰 결과 */}
            <div style={{ marginBottom: 8 }}>
              {treasure.status === 'sold' && (
                <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>
                  🏆 낙찰 — {room.players.find(p => p.clientId === treasure.winnerClientId)?.name ?? '?'} ({treasure.winningBid}금화)
                  {isMyWin && <span style={{ fontSize: 11, color: '#22c55e', marginLeft: 6 }}>← 나</span>}
                </div>
              )}
              {treasure.status === 'tied' && (
                <div style={{ fontSize: 13, color: '#a855f7', fontWeight: 700 }}>⚡ 동점 — 낙찰 실패</div>
              )}
              {treasure.status === 'unsold' && (
                <div style={{ fontSize: 13, color: 'var(--dim)' }}>— 아무도 입찰하지 않음</div>
              )}
            </div>

            {/* 입찰 내역 */}
            {treasureBids.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4, fontFamily: 'var(--f-pix)' }}>입찰 내역</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {treasureBids
                    .sort((a, b) => b.amount - a.amount)
                    .map(b => {
                      const bidder = room.players.find(p => p.clientId === b.clientId);
                      const isWinner = treasure.status === 'sold' && treasure.winnerClientId === b.clientId;
                      return (
                        <span
                          key={b.clientId}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 7px', borderRadius: 6, fontSize: 11,
                            background: isWinner ? `rgba(245,158,11,0.15)` : 'var(--surface-2)',
                            border: `1px solid ${isWinner ? `rgba(245,158,11,0.4)` : 'var(--line)'}`,
                            color: isWinner ? ACCENT : 'var(--text-2)',
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: bidder?.color ?? '#888' }} />
                          {bidder?.name ?? '?'}: {b.amount}🪙
                          {isWinner && ' 🏆'}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 현재 점수판 */}
      <div>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>
          {room.roundNumber < room.settings.totalRounds ? '현재 순위' : '최종 순위'}
        </span>
        <ScoreBoard players={room.players} myClientId={myClientId} />
      </div>
    </div>
  );
}

// ─── Game over phase ──────────────────────────────────────────────────────────

function GameOverPhase({
  room,
  myClientId,
  onRestart,
  isHost,
}: {
  room: AuctionRoom;
  myClientId: string;
  onRestart: () => void;
  isHost: boolean;
}) {
  const ranked = rankPlayers(room.players);
  const topScore = getFinalScore(ranked[0]);
  const winners = ranked.filter(p => getFinalScore(p) === topScore && p.coins === ranked[0].coins);
  const isWinner = winners.some(w => w.clientId === myClientId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>

      <div className="arc-pop" style={{ width: '100%', textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: ACCENT }}>게임 종료!</div>
        {isWinner && (
          <div style={{ marginTop: 8, fontFamily: 'var(--f-pix)', fontSize: 10, color: ACCENT, textShadow: `0 0 12px ${ACCENT}` }}>
            🎉 YOU WIN!
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <span className="arc-chip" style={{ fontSize: 12 }}>
            🥇 {winners.map(w => w.name).join(', ')} — {getFinalScore(ranked[0])}점
          </span>
        </div>
      </div>

      {/* 최종 순위 */}
      <div style={{ width: '100%' }}>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>최종 순위</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranked.map((p, i) => {
            const final = getFinalScore(p);
            const isMe = p.clientId === myClientId;
            const isTopWinner = winners.some(w => w.clientId === p.clientId);
            return (
              <div
                key={p.clientId}
                className="arc-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: isMe ? `2px solid ${ACCENT}` : undefined,
                  background: isTopWinner ? 'rgba(245,158,11,0.07)' : undefined,
                }}
              >
                <span style={{ fontSize: 18, width: 28 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isMe ? ACCENT : 'var(--text)' }}>
                    {p.name} {isMe && '(나)'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                    보물 {p.score > 0 ? '+' : ''}{p.score}점 + 금화 {p.coins}개
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: isMe ? ACCENT : 'var(--text)' }}>
                  {final}pt
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {isHost && (
          <button
            onClick={onRestart}
            className="arc-btn"
            style={{ flex: 1, background: ACCENT, color: '#000', fontWeight: 700 }}
          >
            다시 하기
          </button>
        )}
        <a href="/lobby" className="arc-btn-ghost" style={{ flex: 1, textAlign: 'center', display: 'block', padding: '14px 0', textDecoration: 'none' }}>
          로비로
        </a>
      </div>

    </div>
  );
}

// ─── Main game page ───────────────────────────────────────────────────────────

export default function CursedAuctionGame() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<AuctionRoom | null>(null);
  const [restartError, setRestartError] = useState('');
  const advancingRef = useRef(false);

  const uid = getGuestUid() ?? '';

  // Firebase subscription + presence
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    registerPresence(code, uid).then(c => { cleanup = c; });

    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/cursed-auction'); return; }
      if (r.status === 'waiting') { router.replace(`/cursed-auction/room/${code}`); return; }
      setRoom(r);
    });

    return () => { unsub(); cleanup?.(); };
  }, [code, router, uid]);

  // Phase deadline watcher — any client can trigger transitions
  useEffect(() => {
    if (!room || !['DISCUSSION', 'BIDDING', 'ROUND_RESULT'].includes(room.phase)) return;

    const interval = setInterval(async () => {
      if (advancingRef.current) return;
      if (Date.now() < room.deadlineAt) return;

      advancingRef.current = true;
      try {
        if (room.phase === 'DISCUSSION') await advanceFromDiscussion(code);
        else if (room.phase === 'BIDDING') await advanceFromBidding(code);
        else if (room.phase === 'ROUND_RESULT') await advanceFromRoundResult(code);
      } finally {
        advancingRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, room?.version, room?.deadlineAt, code]);

  const handleRestart = useCallback(async () => {
    setRestartError('');
    const err = await restartGame(code, uid);
    if (err) setRestartError(err);
  }, [code, uid]);

  if (!room) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  const myPlayer = room.players.find(p => p.clientId === uid);
  const isHost = room.hostClientId === uid;

  const phaseLabel: Record<string, string> = {
    DISCUSSION: '토론',
    BIDDING: '입찰',
    ROUND_RESULT: '결과 공개',
    GAME_OVER: '게임 종료',
  };

  const phaseColor: Record<string, string> = {
    DISCUSSION: '#3b82f6',
    BIDDING: ACCENT,
    ROUND_RESULT: '#22c55e',
    GAME_OVER: '#a855f7',
  };

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* 상단 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0 10px', marginBottom: 4,
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🏺</span>
            <div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--faint)', letterSpacing: 1 }}>
                ROUND {room.phase !== 'GAME_OVER' ? `${room.roundNumber}/${room.settings.totalRounds}` : 'OVER'}
              </div>
              <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--text)' }}>
                <span style={{
                  padding: '2px 7px', borderRadius: 5, marginRight: 6,
                  background: `rgba(${phaseColor[room.phase] === ACCENT ? '245,158,11' : phaseColor[room.phase] === '#3b82f6' ? '59,130,246' : phaseColor[room.phase] === '#22c55e' ? '34,197,94' : '168,85,247'}, 0.15)`,
                  color: phaseColor[room.phase],
                  fontSize: 12, fontWeight: 700,
                }}>
                  {phaseLabel[room.phase] ?? room.phase}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {['DISCUSSION', 'BIDDING'].includes(room.phase) && (
              <Timer deadlineAt={room.deadlineAt} warn={room.phase === 'BIDDING' ? 5 : 8} />
            )}
            {myPlayer && (
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, color: ACCENT }}>
                🪙{myPlayer.coins}
              </span>
            )}
          </div>
        </div>

        {/* RESULT 페이즈에서는 짧은 타이머 표시 */}
        {room.phase === 'ROUND_RESULT' && (
          <div style={{ textAlign: 'right', marginBottom: 6 }}>
            <Timer deadlineAt={room.deadlineAt} warn={4} />
          </div>
        )}

        {restartError && (
          <p style={{ color: 'var(--red)', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{restartError}</p>
        )}

        {/* 페이즈별 콘텐츠 */}
        {room.phase === 'DISCUSSION' && (
          <DiscussionPhase room={room} myClientId={uid} myPlayer={myPlayer} />
        )}

        {room.phase === 'BIDDING' && (
          <BiddingPhase room={room} myClientId={uid} myPlayer={myPlayer} />
        )}

        {room.phase === 'ROUND_RESULT' && (
          <RoundResultPhase room={room} myClientId={uid} />
        )}

        {room.phase === 'GAME_OVER' && (
          <GameOverPhase
            room={room}
            myClientId={uid}
            onRestart={handleRestart}
            isHost={isHost}
          />
        )}

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          CURSED AUCTION · TRUST NO ONE
        </p>
      </div>
    </div>
  );
}
