'use client';

import { useEffect, useState } from 'react';
import Dice from './Dice';

interface DiceRollModalProps {
  dice: number[];
  whiteDice: number[];
  playerColor: string;
  playerName: string;
  onClose: () => void;
}

const STAGGER_MS = 130;
const ANIM_DURATION_MS = 1100;

export default function DiceRollModal({
  dice, whiteDice, playerColor, playerName, onClose,
}: DiceRollModalProps) {
  const [canClose, setCanClose] = useState(false);
  const total = dice.length + whiteDice.length;

  useEffect(() => {
    const delay = (total - 1) * STAGGER_MS + ANIM_DURATION_MS;
    const t = setTimeout(() => setCanClose(true), delay);
    return () => clearTimeout(t);
  }, [total]);

  return (
    <div
      onClick={canClose ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(12,10,18,0.88)', backdropFilter: 'blur(10px)',
        cursor: canClose ? 'pointer' : 'default',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="arc-panel ticks arc-pop"
        style={{ maxWidth: 360, width: '100%', margin: '0 16px', padding: '22px 18px' }}
      >
        {/* 타이틀 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span className="hand-throw" style={{ fontSize: 44, display: 'block' }}>🤲</span>
          <h2 className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 20, letterSpacing: 1, margin: '4px 0 2px' }}>
            주사위 굴리기!
          </h2>
          <p className="pix" style={{ fontSize: 8, color: 'var(--dim)' }}>
            {playerName}의 차례 · {total}개
          </p>
        </div>

        {/* 주사위 테이블 */}
        <div
          className="arc-panel-inset"
          style={{
            padding: '14px', minHeight: 96, marginBottom: 16,
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,35,18,0.7)', borderColor: 'rgba(54,224,207,0.18)',
          }}
        >
          {dice.map((val, idx) => (
            <div key={`c-${idx}`} className="dice-fly-in" style={{ animationDelay: `${idx * STAGGER_MS}ms` }}>
              <Dice value={val} color={playerColor} size="lg" />
            </div>
          ))}
          {whiteDice.map((val, idx) => (
            <div key={`w-${idx}`} className="dice-fly-in" style={{ animationDelay: `${(dice.length + idx) * STAGGER_MS}ms` }}>
              <Dice value={val} color="white" size="lg" />
            </div>
          ))}
        </div>

        {/* 액션 영역 */}
        <div style={{ position: 'relative', height: 44 }}>
          <p style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--dim)', fontSize: 13, pointerEvents: 'none',
            opacity: canClose ? 0 : 1, transition: 'opacity .3s',
          }}>
            🎲 굴리는 중...
          </p>
          <button
            onClick={onClose}
            className="arc-btn"
            style={{
              position: 'absolute', inset: 0, fontSize: 15, borderRadius: 12,
              opacity: canClose ? 1 : 0,
              pointerEvents: canClose ? 'auto' : 'none',
              transition: 'opacity .3s',
            }}
          >
            카지노 선택하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
