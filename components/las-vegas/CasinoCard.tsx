'use client';

import { Casino, Player, WHITE_PLAYER_ID } from '@/lib/las-vegas/types';
import { getColorClasses } from '@/lib/las-vegas/gameLogic';

interface CasinoCardProps {
  casino: Casino;
  players: Player[];
  isHighlighted?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
}

// Background theme per casino
const CASINO_THEMES = [
  { bg: 'from-red-950/80 to-red-900/60',     border: 'border-red-700/40',    accent: 'bg-red-600/30',    num: 'text-red-300' },
  { bg: 'from-blue-950/80 to-blue-900/60',   border: 'border-blue-700/40',   accent: 'bg-blue-600/30',   num: 'text-blue-300' },
  { bg: 'from-emerald-950/80 to-green-900/60', border: 'border-green-700/40', accent: 'bg-green-600/30', num: 'text-green-300' },
  { bg: 'from-yellow-950/80 to-yellow-900/60', border: 'border-yellow-700/40', accent: 'bg-yellow-600/30', num: 'text-yellow-300' },
  { bg: 'from-purple-950/80 to-purple-900/60', border: 'border-purple-700/40', accent: 'bg-purple-600/30', num: 'text-purple-300' },
  { bg: 'from-orange-950/80 to-orange-900/60', border: 'border-orange-700/40', accent: 'bg-orange-600/30', num: 'text-orange-300' },
];

// Denomination colors — each value gets a distinct "bill" color
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

export default function CasinoCard({
  casino,
  players,
  isHighlighted = false,
  isSelectable = false,
  onSelect,
}: CasinoCardProps) {
  const totalMoney = casino.moneyCards.reduce((sum, c) => sum + c.value, 0);
  const theme = CASINO_THEMES[(casino.id - 1) % CASINO_THEMES.length];

  return (
    <div
      onClick={isSelectable ? onSelect : undefined}
      className={[
        'relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-200',
        `bg-gradient-to-b ${theme.bg} ${theme.border}`,
        isSelectable ? 'cursor-pointer hover:scale-105 hover:brightness-125' : '',
        isHighlighted ? 'scale-105 ring-2 ring-amber-400 shadow-lg shadow-amber-400/30 brightness-125' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Casino header */}
      <div className={`flex items-center justify-between px-2.5 pt-2.5 pb-1.5`}>
        <div className={`flex items-center gap-1.5`}>
          <div className={`w-7 h-7 rounded-lg ${theme.accent} flex items-center justify-center font-black text-base ${theme.num}`}>
            {casino.id}
          </div>
          <div className="flex flex-col">
            <span className="text-white/30 text-[9px] leading-none uppercase tracking-wider">Casino</span>
            <span className={`text-[10px] font-bold ${theme.num}`}>
              {(totalMoney / 10000).toFixed(0)}억
            </span>
          </div>
        </div>
        {isSelectable && (
          <span className="text-[10px] text-amber-300 font-black animate-pulse">▶ 선택</span>
        )}
      </div>

      {/* Money cards — shown as denomination bills */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {casino.moneyCards.length === 0 ? (
          <p className="text-white/20 text-[10px] text-center py-1.5 italic">상금 없음</p>
        ) : (
          casino.moneyCards.map((card, i) => {
            const bill = getBillStyle(card.value);
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-1.5 py-[3px] rounded-md text-[11px] font-black ${bill.bg} ${bill.text}`}
                style={{ opacity: i === 0 ? 1 : Math.max(0.45, 0.85 - i * 0.12) }}
              >
                {/* Left symbol — prize rank */}
                <span className="text-xs [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.7))]">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <span>{(card.value / 10000).toFixed(0)}억</span>
              </div>
            );
          })
        )}
      </div>

      {/* Placed dice */}
      {casino.placedDice.length > 0 && (
        <div className="border-t border-white/10 mx-2 pt-1.5 pb-2 flex flex-col gap-0.5">
          {casino.placedDice
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((pd) => {
              if (pd.playerId === WHITE_PLAYER_ID) {
                return (
                  <div key="white" className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                    <span className="text-white/40 text-[10px] flex-1 truncate">중립</span>
                    <span className="text-[10px] font-bold text-white/50">{pd.count}</span>
                  </div>
                );
              }
              const player = players.find((p) => p.id === pd.playerId);
              if (!player) return null;
              const cc = getColorClasses(player.color);
              return (
                <div key={pd.playerId} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${cc.bg} flex-shrink-0`} />
                  <span className="text-white/60 text-[10px] flex-1 truncate">{player.name}</span>
                  <span className={`text-[10px] font-bold ${cc.text}`}>{pd.count}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
