'use client';

import { useEffect, useState } from 'react';
import { GameState, WHITE_PLAYER_ID } from '@/lib/las-vegas/types';
import {
  getScoringBreakdown,
  CasinoScoringResult,
  CasinoAward,
  getColorClasses,
} from '@/lib/las-vegas/gameLogic';

interface Props {
  gameState: GameState; // phase='scoring' 상태
  onProceed: () => void;
  proceedLabel?: string;
  proceedDisabled?: boolean;
}

const STEP_DELAY_MS = 750;

export default function ScoringAnimationModal({
  gameState,
  onProceed,
  proceedLabel = '다음 라운드 →',
  proceedDisabled = false,
}: Props) {
  const breakdown = getScoringBreakdown(gameState);

  const [visibleCount, setVisibleCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // 플레이어별 이번 라운드 획득 금액
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
    <div className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center py-6 px-4">
        <div className="w-full max-w-sm">
          {/* 헤더 */}
          <div className="text-center py-5">
            <span className="text-5xl">🏛️</span>
            <h2 className="text-2xl font-black text-amber-400 mt-2 tracking-wide">
              라운드 {gameState.round} 결산
            </h2>
          </div>

          {/* 카지노별 결과 — 하나씩 등장 */}
          <div className="space-y-2.5">
            {breakdown.map((result, idx) => (
              <div
                key={result.casinoId}
                className="transition-all duration-500 ease-out"
                style={{
                  opacity: idx < visibleCount ? 1 : 0,
                  transform: idx < visibleCount ? 'translateY(0)' : 'translateY(16px)',
                  pointerEvents: idx < visibleCount ? 'auto' : 'none',
                }}
              >
                <CasinoCard result={result} players={gameState.players} />
              </div>
            ))}
          </div>

          {breakdown.length === 0 && (
            <p className="text-center text-white/30 text-sm py-4">이번 라운드 배치 없음</p>
          )}

          {/* 총 수익 요약 + 진행 버튼 */}
          <div
            className="mt-3 transition-all duration-500 ease-out"
            style={{
              opacity: showSummary ? 1 : 0,
              transform: showSummary ? 'translateY(0)' : 'translateY(16px)',
              pointerEvents: showSummary ? 'auto' : 'none',
            }}
          >
            <div className="bg-black/40 border border-amber-400/20 rounded-2xl p-4">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
                💰 이번 라운드 수익
              </p>
              <div className="space-y-2 mb-4">
                {[...playerEarnings]
                  .sort((a, b) => b.earned - a.earned)
                  .map((p) => {
                    const cc = getColorClasses(p.color);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cc.bg}`} />
                        <span className="flex-1 font-bold text-white/80 text-sm truncate">
                          {p.name}
                        </span>
                        <span
                          className={`font-black text-sm ${
                            p.earned > 0 ? 'text-emerald-400' : 'text-white/30'
                          }`}
                        >
                          {p.earned > 0 ? `+${(p.earned / 10000).toFixed(0)}만원` : '−'}
                        </span>
                        <span className="text-amber-400/60 text-xs font-bold">
                          합 {((p.totalMoney + p.earned) / 10000).toFixed(0)}만
                        </span>
                      </div>
                    );
                  })}
              </div>
              <button
                onClick={onProceed}
                disabled={proceedDisabled}
                className="w-full py-3 rounded-2xl font-black text-black bg-amber-400 hover:bg-amber-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {proceedLabel}
              </button>
            </div>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

function CasinoCard({
  result,
  players,
}: {
  result: CasinoScoringResult;
  players: GameState['players'];
}) {
  const getName = (id: number) =>
    id === WHITE_PLAYER_ID ? '중립' : (players.find((p) => p.id === id)?.name ?? '?');
  const getColor = (id: number) => players.find((p) => p.id === id)?.color ?? 'red';
  const cc = (id: number) =>
    getColorClasses(id === WHITE_PLAYER_ID ? 'red' : getColor(id));

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      {/* 카지노 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-amber-400 font-black text-base">카지노 {result.casinoId}</span>
        <span className="text-white/35 text-xs">
          총 {(result.totalPot / 10000).toFixed(0)}만원
        </span>
      </div>

      {/* 배치된 주사위 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {result.placedDice.map((pd, i) => {
          const isNeutral = pd.playerId === WHITE_PLAYER_ID;
          const c = cc(pd.playerId);
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                isNeutral ? 'bg-white/10 text-white/50' : `${c.light} ${c.text}`
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  isNeutral ? 'bg-white/40' : c.bg
                }`}
              />
              {getName(pd.playerId)} ×{pd.count}
            </span>
          );
        })}
      </div>

      {/* 결과 */}
      <div className="space-y-1 border-t border-white/10 pt-2.5">
        {result.awards.map((award, i) => (
          <AwardRow key={i} award={award} isFirst={i === 0} getName={getName} cc={cc} />
        ))}
        {result.awards.length === 0 && (
          <p className="text-white/25 text-xs">배당 없음</p>
        )}
      </div>
    </div>
  );
}

function AwardRow({
  award,
  isFirst,
  getName,
  cc,
}: {
  award: CasinoAward;
  isFirst: boolean;
  getName: (id: number) => string;
  cc: (id: number) => ReturnType<typeof getColorClasses>;
}) {
  if (award.type === 'win') {
    const c = cc(award.playerIds[0]);
    return (
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-xs w-3">✓</span>
        <span className={`font-bold text-sm ${c.text}`}>{getName(award.playerIds[0])}</span>
        <span className="flex-1" />
        <span className="text-emerald-400 font-black text-sm">
          +{(award.amount / 10000).toFixed(0)}만원
        </span>
        {isFirst && <span className="text-xs">🏆</span>}
      </div>
    );
  }

  if (award.type === 'neutral') {
    return (
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span className="w-3">✗</span>
        <span>중립 승리 — {(award.amount / 10000).toFixed(0)}만원 소멸</span>
      </div>
    );
  }

  // tie
  const names = award.playerIds
    .filter((id) => id !== WHITE_PLAYER_ID)
    .map(getName)
    .join(', ');
  const hasNeutral = award.playerIds.includes(WHITE_PLAYER_ID);
  const tieNames = [names, hasNeutral ? '중립' : ''].filter(Boolean).join(', ');

  return (
    <div className="flex items-center gap-2 text-xs text-white/40">
      <span className="w-3">≈</span>
      <span>동점 ({tieNames}) — 건너뜀</span>
    </div>
  );
}
