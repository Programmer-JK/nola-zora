'use client';

import { Player } from '@/lib/las-vegas/types';
import { getColorHex } from '@/lib/las-vegas/gameLogic';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PlayerPanelProps {
  players: Player[];
  currentPlayerId: number;
}

export default function PlayerPanel({ players, currentPlayerId }: PlayerPanelProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{ display: 'flex', gap: isMobile ? 7 : 10, flexWrap: 'wrap' }}>
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;
        const hex = getColorHex(player.color);
        return (
          <div
            key={player.id}
            className="arc-panel"
            style={{
              flex: '1 1 80px', padding: isMobile ? '8px 10px' : '11px 14px',
              display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 11,
              borderColor: isActive ? hex : 'var(--line)',
              boxShadow: isActive ? `0 0 0 1px ${hex}, 0 0 18px -4px ${hex}` : 'none',
              transition: 'all .2s',
            }}
          >
            <span style={{
              width: isMobile ? 10 : 14, height: isMobile ? 10 : 14, borderRadius: '50%',
              background: hex, boxShadow: `0 0 8px ${hex}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: isMobile ? 13 : 16,
                lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {player.name}
                {isActive && (
                  <span className="pix" style={{ fontSize: isMobile ? 6 : 8, color: hex, marginLeft: 5 }}>TURN</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--f-disp)', fontSize: isMobile ? 11 : 14, color: 'var(--coin)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                {(player.totalMoney / 10000).toFixed(0)}억
                {player.diceCount > 0 && (
                  <span style={{ color: hex, fontSize: isMobile ? 10 : 12 }}>🎲{player.diceCount}</span>
                )}
                {player.whiteDiceCount > 0 && (
                  <span style={{ color: 'var(--dim)', fontSize: isMobile ? 10 : 12 }}>🏦{player.whiteDiceCount}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
