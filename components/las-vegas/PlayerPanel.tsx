'use client';

import { Player } from '@/lib/las-vegas/types';
import { getColorClasses } from '@/lib/las-vegas/gameLogic';

interface PlayerPanelProps {
  players: Player[];
  currentPlayerId: number;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function PlayerPanel({ players, currentPlayerId }: PlayerPanelProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {players.map((player, index) => {
        const cc = getColorClasses(player.color);
        const isActive = player.id === currentPlayerId;
        return (
          <div
            key={player.id}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300',
              isActive
                ? `${cc.light} ${cc.border} border-2 shadow-md scale-105`
                : 'bg-white/5 border-white/10',
            ].join(' ')}
          >
            <span className={`text-base ${isActive ? cc.text : 'text-white/40'}`}>{DICE_FACES[index]}</span>
            <div>
              <p className={`text-xs font-bold ${isActive ? cc.text : 'text-white/60'}`}>
                {player.name}
                {isActive && <span className="ml-1">▶</span>}
              </p>
              <p className={`text-xs ${isActive ? 'text-gray-600' : 'text-white/50'}`}>
                <span className={cc.text}>⚀</span> {player.diceCount}
                {player.whiteDiceCount > 0 && (
                  <span className={isActive ? 'text-gray-400' : 'text-white/40'}> <span className="text-gray-500">⚀</span> {player.whiteDiceCount}</span>
                )}
                {' '}&nbsp;💰 {(player.totalMoney / 10000).toFixed(0)}만
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
