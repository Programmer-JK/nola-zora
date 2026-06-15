'use client';

import { Casino, Player, WHITE_PLAYER_ID } from '@/lib/las-vegas/types';
import { getColorHex } from '@/lib/las-vegas/gameLogic';

interface CasinoCardProps {
  casino: Casino;
  players: Player[];
  isHighlighted?: boolean;
  isSelectable?: boolean;
  potentialCount?: number;
  potentialWhiteCount?: number;
  currentPlayerColor?: string;
  onSelect?: () => void;
}

function getBillColors(value: number): { bg: string; text: string } {
  if (value >= 90000) return { bg: 'var(--gold)', text: '#1a1206' };
  if (value >= 70000) return { bg: 'rgba(255,183,43,0.5)', text: 'var(--coin)' };
  if (value >= 50000) return { bg: 'var(--red)', text: '#fff' };
  if (value >= 30000) return { bg: 'var(--violet)', text: '#fff' };
  if (value >= 20000) return { bg: 'var(--cyan)', text: '#06231f' };
  return { bg: 'rgba(126,217,87,0.35)', text: 'var(--green)' };
}

export default function CasinoCard({
  casino, players,
  isHighlighted = false, isSelectable = false,
  potentialCount = 0, potentialWhiteCount = 0,
  currentPlayerColor = 'white',
  onSelect,
}: CasinoCardProps) {
  const totalMoney = casino.moneyCards.reduce((sum, c) => sum + c.value, 0);
  const sortedDice = [...casino.placedDice].sort((a, b) => b.count - a.count);

  return (
    <div
      onClick={isSelectable ? onSelect : undefined}
      style={{
        position: 'relative', borderRadius: 14, overflow: 'hidden',
        background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--bg-2) 100%)',
        border: isHighlighted ? '1.5px solid var(--gold)' : '1.5px solid var(--line)',
        boxShadow: isHighlighted ? '0 0 0 1px var(--gold), 0 0 22px -4px var(--gold)' : 'none',
        cursor: isSelectable ? 'pointer' : 'default',
        transform: isHighlighted ? 'translateY(-2px)' : 'none',
        transition: 'all .2s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px 5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-disp)', fontSize: 11, color: '#1a1206',
            background: 'var(--gold)', boxShadow: '0 2px 0 var(--gold-lo)',
          }}>{casino.id}</span>
          {(potentialCount > 0 || potentialWhiteCount > 0) ? (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {potentialCount > 0 && (
                <span style={{
                  fontFamily: 'var(--f-disp)', fontSize: 9, fontWeight: 900,
                  color: getColorHex(currentPlayerColor),
                  background: `${getColorHex(currentPlayerColor)}22`,
                  border: `1px solid ${getColorHex(currentPlayerColor)}66`,
                  borderRadius: 4, padding: '1px 4px', lineHeight: 1.4,
                }}>×{potentialCount}</span>
              )}
              {potentialWhiteCount > 0 && (
                <span style={{
                  fontFamily: 'var(--f-disp)', fontSize: 9, fontWeight: 900,
                  color: '#f0e8d8', background: 'rgba(240,232,216,0.15)',
                  border: '1px solid rgba(240,232,216,0.3)',
                  borderRadius: 4, padding: '1px 4px', lineHeight: 1.4,
                }}>×{potentialWhiteCount}</span>
              )}
            </div>
          ) : (
            <span className="pix" style={{ fontSize: 6, color: 'var(--dim)' }}>CASINO</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isSelectable && (
            <span className="pix blink" style={{ fontSize: 7, color: 'var(--gold)' }}>▸</span>
          )}
          <span style={{ fontFamily: 'var(--f-disp)', fontSize: 10, color: 'var(--coin)' }}>
            {(totalMoney / 10000).toFixed(0)}억
          </span>
        </div>
      </div>

      {/* 상금 지폐 */}
      <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {casino.moneyCards.length === 0 ? (
          <p style={{ color: 'var(--faint)', fontSize: 9, textAlign: 'center', padding: '4px 0', margin: 0 }}>상금 없음</p>
        ) : (
          casino.moneyCards.map((card, i) => {
            const bill = getBillColors(card.value);
            return (
              <div key={i} style={{
                padding: '2px 6px', borderRadius: 5,
                fontFamily: 'var(--f-disp)', fontSize: 10,
                background: bill.bg, color: bill.text,
                opacity: i === 0 ? 1 : Math.max(0.4, 0.88 - i * 0.14),
                display: 'flex', justifyContent: 'flex-end',
              }}>
                {(card.value / 10000).toFixed(0)}억
              </div>
            );
          })
        )}
      </div>
      {/* 배치된 주사위 */}
      {sortedDice.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--line)', margin: '0 8px',
          padding: '5px 0 7px', display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {sortedDice.map((pd) => {
            const isNeutral = pd.playerId === WHITE_PLAYER_ID;
            const hex = isNeutral
              ? 'rgba(255,255,255,0.35)'
              : getColorHex(players.find((p) => p.id === pd.playerId)?.color ?? 'red');
            const name = isNeutral ? '중립' : (players.find((p) => p.id === pd.playerId)?.name ?? '?');
            return (
              <div key={pd.playerId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, boxShadow: isNeutral ? 'none' : `0 0 5px ${hex}`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 10, color: hex }}>{pd.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
