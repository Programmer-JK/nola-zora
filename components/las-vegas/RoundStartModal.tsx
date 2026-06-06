'use client';

import { useEffect, useState } from 'react';
import { Casino } from '@/lib/las-vegas/types';

interface RoundStartModalProps {
  casinos: Casino[];
  round: number;
  totalRounds: number;
  onStart: () => void;
}

const CASINO_ACCENT = [
  'border-red-500/60 bg-red-950/60',
  'border-blue-500/60 bg-blue-950/60',
  'border-emerald-500/60 bg-emerald-950/60',
  'border-yellow-500/60 bg-yellow-950/60',
  'border-purple-500/60 bg-purple-950/60',
  'border-orange-500/60 bg-orange-950/60',
];

const CASINO_NUM_COLOR = [
  'text-red-400', 'text-blue-400', 'text-emerald-400',
  'text-yellow-400', 'text-purple-400', 'text-orange-400',
];

function getBillStyle(value: number): { bg: string; text: string } {
  if (value >= 90000) return { bg: 'bg-amber-300',   text: 'text-black' };
  if (value >= 80000) return { bg: 'bg-amber-400',   text: 'text-black' };
  if (value >= 70000) return { bg: 'bg-yellow-400',  text: 'text-black' };
  if (value >= 60000) return { bg: 'bg-yellow-500',  text: 'text-black' };
  if (value >= 50000) return { bg: 'bg-red-500',     text: 'text-white' };
  if (value >= 40000) return { bg: 'bg-orange-500',  text: 'text-white' };
  if (value >= 30000) return { bg: 'bg-purple-500',  text: 'text-white' };
  if (value >= 20000) return { bg: 'bg-cyan-600',    text: 'text-white' };
  return                     { bg: 'bg-emerald-600', text: 'text-white' };
}

const CASINO_STAGGER = 130; // ms between each casino appearing
const CARD_STAGGER   = 70;  // ms between each money card within a casino
const ANIM_DURATION  = 450; // ms for card-deal-in

export default function RoundStartModal({
  casinos,
  round,
  totalRounds,
  onStart,
}: RoundStartModalProps) {
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    // Wait until the last card of the last casino has finished animating
    const lastCasinoIdx = casinos.length - 1;
    const lastCardIdx = Math.max(...casinos.map((c) => c.moneyCards.length)) - 1;
    const lastAnimStart = lastCasinoIdx * CASINO_STAGGER + (lastCardIdx + 1) * CARD_STAGGER;
    const t = setTimeout(() => setCanStart(true), lastAnimStart + ANIM_DURATION + 200);
    return () => clearTimeout(t);
  }, [casinos]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-[#12121e] border border-amber-400/20 rounded-3xl p-5 w-full max-w-md mx-4 shadow-2xl">

        {/* Header */}
        <div className="text-center mb-5 slide-up">
          <div className="text-4xl mb-1">🎰</div>
          <h2 className="text-2xl font-black gold-text tracking-wide">라운드 {round}</h2>
          <p className="text-white/40 text-xs mt-1">
            {round} / {totalRounds} · 카지노별 상금이 배정되었습니다
          </p>
        </div>

        {/* 3×2 casino grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {casinos.map((casino, idx) => (
            <div
              key={casino.id}
              className={`card-deal-in border rounded-2xl p-2 flex flex-col gap-1 ${CASINO_ACCENT[(casino.id - 1) % CASINO_ACCENT.length]}`}
              style={{ animationDelay: `${idx * CASINO_STAGGER}ms` }}
            >
              {/* Casino number */}
              <div className={`text-center text-xs font-black ${CASINO_NUM_COLOR[(casino.id - 1) % CASINO_NUM_COLOR.length]}`}>
                {casino.id}번
              </div>

              {/* Money cards dealt in */}
              {casino.moneyCards.map((card, i) => {
                const bill = getBillStyle(card.value);
                return (
                  <div
                    key={i}
                    className={`card-deal-in text-center rounded-lg py-0.5 text-[11px] font-black ${bill.bg} ${bill.text}`}
                    style={{
                      animationDelay: `${idx * CASINO_STAGGER + (i + 1) * CARD_STAGGER}ms`,
                      opacity: i === 0 ? 1 : Math.max(0.5, 0.9 - i * 0.15),
                    }}
                  >
                    {(card.value / 10000).toFixed(0)}만
                  </div>
                );
              })}

              {/* Total */}
              <div className="text-center text-white/35 text-[10px] font-bold mt-0.5">
                계 {(casino.moneyCards.reduce((s, c) => s + c.value, 0) / 10000).toFixed(0)}만
              </div>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`w-full py-3 rounded-2xl font-black text-sm tracking-widest transition-all duration-300 ${
            canStart
              ? 'bg-amber-400 text-black hover:bg-amber-300 hover:scale-105 active:scale-95 pulse-glow'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {canStart ? `라운드 ${round} 시작! →` : '상금 배정 중...'}
        </button>
      </div>
    </div>
  );
}
