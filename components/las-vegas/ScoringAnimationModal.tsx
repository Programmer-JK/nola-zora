'use client';

import { useEffect, useState } from 'react';
import { GameState, WHITE_PLAYER_ID } from '@/lib/las-vegas/types';
import {
  getScoringBreakdown,
  CasinoScoringResult,
  CasinoAward,
  getColorHex,
} from '@/lib/las-vegas/gameLogic';

interface Props {
  gameState: GameState;
  onProceed: () => void;
  proceedLabel?: string;
  proceedDisabled?: boolean;
}

const STEP_DELAY_MS = 750;

export default function ScoringAnimationModal({
  gameState, onProceed, proceedLabel = '다음 라운드 →', proceedDisabled = false,
}: Props) {
  const breakdown = getScoringBreakdown(gameState);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const playerEarnings = gameState.players.map((player) => {
    const earned = breakdown
      .flatMap((c) => c.awards)
      .filter((a) => a.type === 'win' && a.playerIds[0] === player.id)
      .reduce((sum, a) => sum + a.amount, 0);
    return { ...player, earned };
  });

  useEffect(() => {
    if (visibleCount < breakdown.length) {
      const t = setTimeout(() => setVisibleCount((v) => v + 1), STEP_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowSummary(true), 500);
    return () => clearTimeout(t);
  }, [visibleCount, breakdown.length]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(12,10,18,0.9)', backdropFilter: 'blur(10px)',
      overflowY: 'auto',
    }}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* 헤더 */}
          <div style={{ textAlign: 'center', padding: '16px 0 22px' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏛️</div>
            <h2 className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 30, letterSpacing: 1, margin: 0 }}>
              라운드 {gameState.round} 결산
            </h2>
          </div>

          {/* 카지노별 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {breakdown.map((result, idx) => (
              <div
                key={result.casinoId}
                style={{
                  opacity: idx < visibleCount ? 1 : 0,
                  transform: idx < visibleCount ? 'translateY(0)' : 'translateY(16px)',
                  transition: 'opacity .5s ease-out, transform .5s ease-out',
                  pointerEvents: idx < visibleCount ? 'auto' : 'none',
                }}
              >
                <ScoringCasinoCard result={result} players={gameState.players} />
              </div>
            ))}
          </div>

          {breakdown.length === 0 && (
            <p className="pix" style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 10, padding: '16px 0' }}>
              이번 라운드 배치 없음
            </p>
          )}

          {/* 요약 + 진행 버튼 */}
          <div style={{
            marginTop: 14,
            opacity: showSummary ? 1 : 0,
            transform: showSummary ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity .5s ease-out, transform .5s ease-out',
            pointerEvents: showSummary ? 'auto' : 'none',
          }}>
            <div className="arc-panel ticks" style={{ padding: '20px' }}>
              <span className="arc-lbl" style={{ color: 'var(--gold)', display: 'block', marginBottom: 14 }}>
                💰 이번 라운드 수익
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[...playerEarnings]
                  .sort((a, b) => b.earned - a.earned)
                  .map((p) => {
                    const hex = getColorHex(p.color);
                    return (
                      <div key={p.id} className="arc-panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: hex, boxShadow: `0 0 6px ${hex}`, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontFamily: 'var(--f-body)', fontWeight: 700, color: 'var(--text-2)', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                        <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: p.earned > 0 ? 'var(--green)' : 'var(--faint)', fontWeight: 900 }}>
                          {p.earned > 0 ? `+${(p.earned / 10000).toFixed(0)}억` : '—'}
                        </span>
                        <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: 'var(--coin)' }}>
                          합 {((p.totalMoney + p.earned) / 10000).toFixed(0)}억
                        </span>
                      </div>
                    );
                  })}
              </div>
              <button onClick={onProceed} disabled={proceedDisabled} className="arc-btn" style={{ fontSize: 18 }}>
                {proceedLabel}
              </button>
            </div>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

function ScoringCasinoCard({ result, players }: { result: CasinoScoringResult; players: GameState['players'] }) {
  const getName = (id: number) =>
    id === WHITE_PLAYER_ID ? '중립' : (players.find((p) => p.id === id)?.name ?? '?');
  const getHex = (id: number) =>
    id === WHITE_PLAYER_ID ? 'rgba(255,255,255,0.4)' : getColorHex(players.find((p) => p.id === id)?.color ?? 'red');

  return (
    <div className="arc-panel-inset" style={{ padding: '14px 18px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--f-disp)', fontSize: 17, color: 'var(--gold)' }}>카지노 {result.casinoId}</span>
        <span className="pix" style={{ fontSize: 10, color: 'var(--faint)' }}>총 {(result.totalPot / 10000).toFixed(0)}억</span>
      </div>

      {/* 배치된 주사위 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {result.placedDice.map((pd, i) => {
          const hex = getHex(pd.playerId);
          const isNeutral = pd.playerId === WHITE_PLAYER_ID;
          return (
            <span key={i} className="arc-chip" style={{
              fontSize: 13, padding: '4px 10px', gap: 5,
              background: hex + '20', color: isNeutral ? 'var(--faint)' : hex,
              borderColor: hex + '50',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: hex, display: 'inline-block' }} />
              {getName(pd.playerId)} ×{pd.count}
            </span>
          );
        })}
      </div>

      {/* 결과 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        {result.awards.map((award, i) => (
          <AwardRow key={i} award={award} isFirst={i === 0} getName={getName} getHex={getHex} />
        ))}
        {result.awards.length === 0 && (
          <p className="pix" style={{ color: 'var(--faint)', fontSize: 10 }}>배당 없음</p>
        )}
      </div>
    </div>
  );
}

function AwardRow({ award, isFirst, getName, getHex }: {
  award: CasinoAward;
  isFirst: boolean;
  getName: (id: number) => string;
  getHex: (id: number) => string;
}) {
  if (award.type === 'win') {
    const hex = getHex(award.playerIds[0]);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--green)', fontSize: 14, width: 14 }}>✓</span>
        <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, color: hex }}>{getName(award.playerIds[0])}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: 'var(--green)', fontWeight: 900 }}>
          +{(award.amount / 10000).toFixed(0)}억
        </span>
        {isFirst && <span style={{ fontSize: 14 }}>🏆</span>}
      </div>
    );
  }
  if (award.type === 'neutral') {
    return (
      <div className="pix" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--faint)' }}>
        <span style={{ width: 14 }}>✗</span>
        <span>중립 승리 — {(award.amount / 10000).toFixed(0)}억 소멸</span>
      </div>
    );
  }
  const names = award.playerIds.filter((id) => id !== WHITE_PLAYER_ID).map(getName).join(', ');
  const hasNeutral = award.playerIds.includes(WHITE_PLAYER_ID);
  return (
    <div className="pix" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--faint)' }}>
      <span style={{ width: 14 }}>≈</span>
      <span>동점 ({[names, hasNeutral ? '중립' : ''].filter(Boolean).join(', ')}) — 건너뜀</span>
    </div>
  );
}
