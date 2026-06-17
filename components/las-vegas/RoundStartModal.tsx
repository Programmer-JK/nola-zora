'use client';

import { useEffect, useState } from 'react';
import { Casino } from '@/lib/las-vegas/types';

interface RoundStartModalProps {
  casinos: Casino[];
  round: number;
  totalRounds: number;
  onStart: () => void;
}

function getBillColors(value: number): { bg: string; text: string } {
  if (value >= 90000) return { bg: 'var(--gold)',            text: '#1a1206' };
  if (value >= 70000) return { bg: 'rgba(255,183,43,0.5)',  text: 'var(--coin)' };
  if (value >= 50000) return { bg: 'var(--red)',            text: '#fff' };
  if (value >= 30000) return { bg: 'var(--violet)',         text: '#fff' };
  if (value >= 20000) return { bg: 'var(--cyan)',           text: '#06231f' };
  return                     { bg: 'rgba(126,217,87,0.35)', text: 'var(--green)' };
}

// 카지노별 강조 색상
const CASINO_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316',
];

const CASINO_STAGGER = 130;
const CARD_STAGGER   = 70;
const ANIM_DURATION  = 450;

export default function RoundStartModal({ casinos, round, totalRounds, onStart }: RoundStartModalProps) {
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    const lastCasinoIdx = casinos.length - 1;
    const lastCardIdx = Math.max(...casinos.map((c) => c.moneyCards.length)) - 1;
    const lastAnimStart = lastCasinoIdx * CASINO_STAGGER + (lastCardIdx + 1) * CARD_STAGGER;
    const t = setTimeout(() => setCanStart(true), lastAnimStart + ANIM_DURATION + 200);
    return () => clearTimeout(t);
  }, [casinos]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(12,10,18,0.9)', backdropFilter: 'blur(10px)',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      <div className="arc-panel ticks" style={{ width: '100%', maxWidth: 500, padding: '24px 22px' }}>

        {/* 헤더 */}
        <div className="slide-up" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>🎰</div>
          <h2 className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 32, letterSpacing: 1, margin: '0 0 6px' }}>
            라운드 {round}
          </h2>
          <p className="pix" style={{ fontSize: 10, color: 'var(--dim)' }}>
            {round} / {totalRounds} · 카지노별 상금이 배정되었습니다
          </p>
        </div>

        {/* 3×2 카지노 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {casinos.map((casino, idx) => {
            const accentHex = CASINO_COLORS[(casino.id - 1) % CASINO_COLORS.length];
            const total = casino.moneyCards.reduce((s, c) => s + c.value, 0);
            return (
              <div
                key={casino.id}
                className="arc-rise"
                style={{
                  borderRadius: 12, padding: '10px 9px',
                  background: accentHex + '12', border: `1.5px solid ${accentHex}40`,
                  display: 'flex', flexDirection: 'column', gap: 5,
                  animationDelay: `${idx * CASINO_STAGGER}ms`,
                }}
              >
                {/* 번호 */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 7,
                    fontFamily: 'var(--f-disp)', fontSize: 13, color: '#1a1206',
                    background: accentHex, boxShadow: `0 2px 0 ${accentHex}80`,
                  }}>{casino.id}</span>
                </div>

                {/* 지폐 */}
                {casino.moneyCards.map((card, i) => {
                  const bill = getBillColors(card.value);
                  return (
                    <div
                      key={i}
                      className="arc-rise"
                      style={{
                        textAlign: 'center', borderRadius: 5, padding: '3px 0',
                        fontFamily: 'var(--f-disp)', fontSize: 12,
                        background: bill.bg, color: bill.text,
                        opacity: i === 0 ? 1 : Math.max(0.5, 0.9 - i * 0.15),
                        animationDelay: `${idx * CASINO_STAGGER + (i + 1) * CARD_STAGGER}ms`,
                      }}
                    >
                      {(card.value / 10000).toFixed(0)}억
                    </div>
                  );
                })}

                {/* 합계 */}
                <div className="pix" style={{ textAlign: 'center', fontSize: 9, color: 'var(--faint)', marginTop: 2 }}>
                  계 {(total / 10000).toFixed(0)}만
                </div>
              </div>
            );
          })}
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`arc-btn${canStart ? ' pulse-glow' : ''}`}
          style={{ fontSize: 18 }}
        >
          {canStart ? `라운드 ${round} 시작! →` : '상금 배정 중...'}
        </button>
      </div>
    </div>
  );
}
