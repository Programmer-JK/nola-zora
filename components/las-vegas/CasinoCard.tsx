'use client';

import { Casino, Player, WHITE_PLAYER_ID } from '@/lib/las-vegas/types';
import { getColorHex } from '@/lib/las-vegas/gameLogic';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const totalMoney = casino.moneyCards.reduce((sum, c) => sum + c.value, 0);
  const sortedDice = [...casino.placedDice].sort((a, b) => b.count - a.count);

  // 모바일에서는 카드 칸이 ~106px로 좁으므로 원래 크기 사용
  const badgeSize  = isMobile ? 22 : 28;
  const badgeFz    = isMobile ? 11 : 14;
  const potentialFz = isMobile ? 9 : 11;
  const totalFz    = isMobile ? 10 : 13;
  const moneyFz    = isMobile ? 10 : 13;
  const moneyPad   = isMobile ? '2px 5px' : '4px 8px';
  const diceFz     = isMobile ? 10 : 12;
  const headerPad  = isMobile ? '7px 8px 5px' : '10px 10px 7px';
  const bodyPad    = isMobile ? '0 8px 8px' : '0 10px 10px';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: headerPad }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
          <span style={{
            width: badgeSize, height: badgeSize, borderRadius: isMobile ? 7 : 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-disp)', fontSize: badgeFz, color: '#1a1206',
            background: 'var(--gold)', boxShadow: '0 2px 0 var(--gold-lo)',
          }}>{casino.id}</span>
          {(potentialCount > 0 || potentialWhiteCount > 0) ? (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', minWidth: 0 }}>
              {potentialCount > 0 && (
                <span style={{
                  fontFamily: 'var(--f-disp)', fontSize: potentialFz, fontWeight: 900,
                  color: getColorHex(currentPlayerColor),
                  background: `${getColorHex(currentPlayerColor)}22`,
                  border: `1px solid ${getColorHex(currentPlayerColor)}66`,
                  borderRadius: 4, padding: '1px 4px', lineHeight: 1.4, flexShrink: 0,
                }}>×{potentialCount}</span>
              )}
              {potentialWhiteCount > 0 && (
                <span style={{
                  fontFamily: 'var(--f-disp)', fontSize: potentialFz, fontWeight: 900,
                  color: '#f0e8d8', background: 'rgba(240,232,216,0.15)',
                  border: '1px solid rgba(240,232,216,0.3)',
                  borderRadius: 4, padding: '1px 4px', lineHeight: 1.4, flexShrink: 0,
                }}>×{potentialWhiteCount}</span>
              )}
            </div>
          ) : (
            <span className="pix" style={{ fontSize: isMobile ? 6 : 8, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CASINO</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {isSelectable && (
            <span className="pix blink" style={{ fontSize: isMobile ? 7 : 9, color: 'var(--gold)' }}>▸</span>
          )}
          <span style={{ fontFamily: 'var(--f-disp)', fontSize: totalFz, color: 'var(--coin)' }}>
            {(totalMoney / 10000).toFixed(0)}억
          </span>
        </div>
      </div>

      {/* 상금 지폐 */}
      <div style={{ padding: bodyPad, display: 'flex', flexDirection: 'column', gap: isMobile ? 3 : 4 }}>
        {casino.moneyCards.length === 0 ? (
          <p style={{ color: 'var(--faint)', fontSize: isMobile ? 9 : 11, textAlign: 'center', padding: '4px 0', margin: 0 }}>상금 없음</p>
        ) : (
          casino.moneyCards.map((card, i) => {
            const bill = getBillColors(card.value);
            return (
              <div key={i} style={{
                padding: moneyPad, borderRadius: isMobile ? 5 : 6,
                fontFamily: 'var(--f-disp)', fontSize: moneyFz,
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
          borderTop: '1px solid var(--line)', margin: isMobile ? '0 8px' : '0 10px',
          padding: isMobile ? '5px 0 7px' : '6px 0 8px', display: 'flex', flexDirection: 'column', gap: isMobile ? 3 : 4,
        }}>
          {sortedDice.map((pd) => {
            const isNeutral = pd.playerId === WHITE_PLAYER_ID;
            const hex = isNeutral
              ? 'rgba(255,255,255,0.35)'
              : getColorHex(players.find((p) => p.id === pd.playerId)?.color ?? 'red');
            const name = isNeutral ? '중립' : (players.find((p) => p.id === pd.playerId)?.name ?? '?');
            return (
              <div key={pd.playerId} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
                <span style={{ width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: '50%', background: hex, boxShadow: isNeutral ? 'none' : `0 0 5px ${hex}`, flexShrink: 0 }} />
                <span style={{ fontSize: diceFz, color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: diceFz, color: hex }}>{pd.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
