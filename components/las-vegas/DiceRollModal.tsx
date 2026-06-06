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
  dice,
  whiteDice,
  playerColor,
  playerName,
  onClose,
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
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={canClose ? onClose : undefined}
      style={{ cursor: canClose ? 'pointer' : 'default' }}
    >
      <div
        className="bg-[#1a1a2e] border border-amber-400/20 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hand + title */}
        <div className="text-center mb-4">
          <span className="text-5xl hand-throw">🤲</span>
          <h2 className="text-lg font-black gold-text mt-1 tracking-wide">주사위 굴리기!</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {playerName}의 차례 · {total}개
          </p>
        </div>

        {/* Casino felt table */}
        <div className="relative bg-emerald-950/70 border border-emerald-700/30 rounded-2xl p-4 overflow-hidden min-h-[6rem] flex flex-wrap gap-3 items-center justify-center mb-5">
          {/* Subtle felt texture */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 6px)',
            }}
          />
          {dice.map((val, idx) => (
            <div
              key={`c-${idx}`}
              className="dice-fly-in relative z-10"
              style={{ animationDelay: `${idx * STAGGER_MS}ms` }}
            >
              <Dice value={val} color={playerColor} size="lg" />
            </div>
          ))}
          {whiteDice.map((val, idx) => (
            <div
              key={`w-${idx}`}
              className="dice-fly-in relative z-10"
              style={{ animationDelay: `${(dice.length + idx) * STAGGER_MS}ms` }}
            >
              <Dice value={val} color="white" size="lg" />
            </div>
          ))}
        </div>

        {/* Action area — crossfades between status and button */}
        <div className="relative h-11">
          <p
            className={`absolute inset-0 flex items-center justify-center text-white/30 text-sm pointer-events-none transition-opacity duration-300 ${
              canClose ? 'opacity-0' : 'animate-pulse opacity-100'
            }`}
          >
            🎲 굴리는 중...
          </p>
          <button
            onClick={onClose}
            className={`absolute inset-0 rounded-2xl font-black text-black bg-amber-400 hover:bg-amber-300 transition-all duration-300 ${
              canClose
                ? 'opacity-100 hover:scale-105 active:scale-95'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            카지노 선택하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
