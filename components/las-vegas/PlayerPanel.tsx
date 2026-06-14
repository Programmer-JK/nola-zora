'use client';

import { Player } from '@/lib/las-vegas/types';
import { getColorHex } from '@/lib/las-vegas/gameLogic';

interface PlayerPanelProps {
  players: Player[];
  currentPlayerId: number;
}

export default function PlayerPanel({ players, currentPlayerId }: PlayerPanelProps) {
  return (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;
        const hex = getColorHex(player.color);
        return (
          <div
            key={player.id}
            className="arc-panel"
            style={{
              flex: '1 1 90px', padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 9,
              borderColor: isActive ? hex : 'var(--line)',
              boxShadow: isActive ? `0 0 0 1px ${hex}, 0 0 18px -4px ${hex}` : 'none',
              transition: 'all .2s',
            }}
          >
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: hex, boxShadow: `0 0 8px ${hex}`, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 14,
                lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {player.name}
                {isActive && (
                  <span className="pix" style={{ fontSize: 7, color: hex, marginLeft: 6 }}>TURN</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--f-disp)', fontSize: 12, color: 'var(--coin)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                {(player.totalMoney / 10000).toFixed(0)}억
                {player.diceCount > 0 && (
                  <span style={{ color: hex, fontSize: 10 }}>🎲{player.diceCount}</span>
                )}
                {player.whiteDiceCount > 0 && (
                  <span style={{ color: 'var(--dim)', fontSize: 10 }}>🏦{player.whiteDiceCount}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
