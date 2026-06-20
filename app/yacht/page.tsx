'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import { PLAYER_COLORS } from '@/lib/yacht/game-logic';
import type { PlayerSetup } from '@/lib/yacht/types';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 6;
const DEFAULT_NAMES = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4', '플레이어 5', '플레이어 6'];

const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function DicePip({ value, selected }: { value: number; selected: boolean }) {
  const pips = PIP_MAP[value] || [];
  const s = 44;
  const activeHex = '#7ed957';
  return (
    <div style={{
      width: s, height: s,
      background: selected
        ? `linear-gradient(150deg, ${activeHex}cc 0%, ${activeHex} 100%)`
        : 'rgba(0,0,0,.3)',
      borderRadius: Math.round(s * 0.22),
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gridTemplateRows: 'repeat(3,1fr)',
      padding: s * 0.13,
      gap: s * 0.04,
      boxShadow: selected
        ? `inset 0 2px 3px rgba(255,255,255,.5), inset 0 -3px 5px rgba(0,0,0,.25), 0 0 18px -2px ${activeHex}99`
        : 'inset 0 1px 2px rgba(255,255,255,.05)',
      transition: 'background .2s, box-shadow .2s',
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          borderRadius: '50%',
          background: pips.includes(i) ? (selected ? '#06230a' : 'var(--dim)') : 'transparent',
        }} />
      ))}
    </div>
  );
}

export default function YachtSetupPage() {
  const router = useRouter();
  const { nickname } = useAuth();
  const { soundEnabled: musicOn, toggleSound: toggleMusic } = useSoundEnabled();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerSetup[]>(() =>
    DEFAULT_NAMES.map((name, i) => ({
      name: i === 0 ? nickname : name,
      color: PLAYER_COLORS[i].hex,
    }))
  );

  useEffect(() => {
    const audio = new Audio('/opening.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (musicOn) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [musicOn]);

  const handleCountChange = (n: number) => {
    setPlayerCount(n);
  };

  const handleNameChange = (i: number, name: string) => {
    setPlayers(prev => prev.map((p, idx) => idx === i ? { ...p, name } : p));
  };

  const handleColorChange = (i: number, color: string) => {
    setPlayers(prev => prev.map((p, idx) => idx === i ? { ...p, color } : p));
  };

  const handleStart = () => {
    const setup = players.slice(0, playerCount).map(p => ({
      name: p.name.trim() || '플레이어',
      color: p.color,
    }));
    const params = new URLSearchParams();
    params.set('setup', JSON.stringify(setup));
    router.push(`/yacht/game?${params.toString()}`);
  };

  const usedColors = players.slice(0, playerCount).map(p => p.color);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': 'var(--green)' } as React.CSSProperties}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <button className="arc-btn-ghost" onClick={() => router.push('/lobby')} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </button>
          <button className="arc-btn-ghost" onClick={toggleMusic} style={{ width: 40, height: 40, padding: 0, borderRadius: 11, fontSize: 16 }}>
            {musicOn ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Logo */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 54, lineHeight: 1 }}>⛵</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 40, letterSpacing: 1, margin: '6px 0 2px',
            color: 'var(--green)', textShadow: '0 0 18px rgba(126,217,87,.5)',
          }}>YACHT</h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>요트 주사위</div>
          <Link href="/yacht/rules">
            <span className="arc-chip" style={{ marginTop: 12, cursor: 'pointer', display: 'inline-flex' }}>📖 게임 방법</span>
          </Link>
        </div>

        {/* Player setup panel */}
        <div className="arc-panel ticks" style={{ padding: 22 }}>
          {/* Player count */}
          <span className="arc-lbl" style={{ color: 'var(--green)' }}>PLAYERS · 1–6</span>
          <div style={{ display: 'flex', gap: 9, marginTop: 12, marginBottom: 22, justifyContent: 'space-between' }}>
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                style={{
                  flex: 1, aspectRatio: '1', borderRadius: 13, cursor: 'pointer',
                  border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform .12s',
                  transform: playerCount === n ? 'scale(1.08)' : 'none',
                  padding: playerCount === n ? 0 : 6,
                }}
              >
                <DicePip value={n} selected={playerCount === n} />
              </button>
            ))}
          </div>

          {/* Player name + color */}
          <span className="arc-lbl" style={{ color: 'var(--green)' }}>PLAYER SETUP</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {players.slice(0, playerCount).map((p, i) => {
              const isUsed = (color: string) => usedColors.includes(color) && color !== p.color;
              return (
                <div key={i} className="arc-panel-inset arc-rise" style={{ padding: 12, animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: p.color,
                      boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px ${p.color}, 0 0 14px ${p.color}`,
                    }} />
                    <input
                      type="text"
                      className="arc-field"
                      style={{ padding: '8px 12px', fontSize: 15, background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--line-2)', borderRadius: 0 }}
                      value={p.name}
                      maxLength={12}
                      onChange={e => handleNameChange(i, e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 9, marginTop: 11, paddingLeft: 2 }}>
                    {PLAYER_COLORS.map(c => {
                      const taken = isUsed(c.hex);
                      return (
                        <button
                          key={c.id}
                          disabled={taken}
                          onClick={() => !taken && handleColorChange(i, c.hex)}
                          style={{
                            width: 24, height: 24, borderRadius: '50%', border: 'none',
                            cursor: taken ? 'not-allowed' : 'pointer',
                            background: c.hex,
                            opacity: taken ? 0.18 : p.color === c.hex ? 1 : 0.55,
                            transform: p.color === c.hex ? 'scale(1.25)' : 'none',
                            boxShadow: p.color === c.hex ? `0 0 0 2px var(--bg), 0 0 0 4px ${c.hex}, 0 0 14px ${c.hex}` : 'none',
                            transition: 'all .15s',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="arc-btn"
            style={{ marginTop: 20, fontSize: 20, background: 'var(--green)', color: '#06230a', borderColor: 'var(--green)' }}
            onClick={handleStart}
          >
            게임 시작 ⛵
          </button>
          {playerCount === 1 && (
            <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
              SOLO MODE · 내 최고 점수에 도전!
            </p>
          )}
        </div>

        {/* Rule chips */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <span className="arc-chip" style={{ fontSize: 11 }}>🎲 주사위 5개</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🔁 턴당 3번 굴림</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>📋 족보 12칸</span>
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          ALL 12 CATS · HIGHEST TOTAL WINS
        </p>
      </div>
    </div>
  );
}
