'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PLAYER_COLORS } from '@/lib/las-vegas/types';
import { createInitialState, getColorHex } from '@/lib/las-vegas/gameLogic';
import { Room, subscribeRoom, startGame } from '@/lib/las-vegas/roomService';

const MIN_PLAYERS = 2;

const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function DicePip({ value, color }: { value: number; color: string }) {
  const pips = PIP_MAP[value] || [];
  const size = 28;
  return (
    <div style={{
      width: size, height: size,
      background: `linear-gradient(150deg, ${color}cc 0%, ${color} 100%)`,
      borderRadius: Math.round(size * 0.22),
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gridTemplateRows: 'repeat(3,1fr)',
      padding: size * 0.13,
      gap: size * 0.04,
      boxShadow: `inset 0 2px 3px rgba(255,255,255,.5), inset 0 -2px 4px rgba(0,0,0,.3), 0 0 10px -2px ${color}99`,
      flexShrink: 0,
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          borderRadius: '50%',
          background: pips.includes(i) ? '#1a1206' : 'transparent',
        }} />
      ))}
    </div>
  );
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { uid } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsub = subscribeRoom(code, (r) => {
      if (!r) { router.replace('/las-vegas'); return; }
      setRoom(r);
      if (r.status === 'playing') {
        router.replace(`/las-vegas/game/${code}`);
      }
    });
    return unsub;
  }, [code, router]);

  const isHost = uid !== '' && room?.hostClientId === uid;
  const canStart = isHost && (room?.players.length ?? 0) >= MIN_PLAYERS;

  const handleStart = useCallback(async () => {
    if (!room || !canStart) return;
    setStarting(true);
    try {
      const setup = room.players.map((p) => ({
        name: p.name,
        color: p.color,
        clientId: p.clientId,
      }));
      const gameState = createInitialState(setup);
      await startGame(code, gameState);
      router.replace(`/las-vegas/game/${code}`);
    } catch {
      setStarting(false);
    }
  }, [room, canStart, code, router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 28 }}>

        {/* Top bar */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button className="arc-btn-ghost" onClick={() => router.push('/las-vegas')} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 나가기
          </button>
          <div className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 15, letterSpacing: 2 }}>
            LAS VEGAS
          </div>
          <span style={{ width: 80 }} />
        </div>

        {/* Header */}
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 400 }}>
          <div className="arc-float" style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>🏨</div>
          <h1 style={{ fontFamily: 'var(--f-title)', fontSize: 32, margin: '0 0 4px', color: 'var(--text)' }}>대기실</h1>
          <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2 }}>WAITING ROOM</div>
        </div>

        {/* Room code */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <span className="arc-lbl" style={{ color: 'var(--gold)', marginBottom: 8, display: 'block', textAlign: 'center' }}>ROOM CODE — 친구에게 공유하세요</span>
          <button
            onClick={handleCopy}
            className="arc-panel ticks"
            style={{
              width: '100%', padding: '18px 22px', textAlign: 'center', cursor: 'pointer',
              border: `1.5px solid ${copied ? 'var(--green)' : 'var(--line-2)'}`,
              boxShadow: copied ? '0 0 0 1px var(--green), 0 0 18px -4px var(--green)' : '0 0 0 1px var(--gold), 0 0 22px -8px var(--gold)',
              transition: 'all .2s',
            }}
          >
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 34, letterSpacing: '0.35em', color: copied ? 'var(--green)' : 'var(--text)' }}>
              {code}
            </div>
            <div className="pix" style={{ fontSize: 8, color: copied ? 'var(--green)' : 'var(--dim)', marginTop: 8, letterSpacing: 1 }}>
              {copied ? '✓ COPIED!' : 'TAP TO COPY'}
            </div>
          </button>
        </div>

        {/* Player list */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span className="arc-lbl" style={{ color: 'var(--gold)' }}>PLAYERS</span>
            <span className="arc-badge">{room.players.length}/6</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {room.players.map((player, i) => {
              const hex = getColorHex(player.color);
              const colorInfo = PLAYER_COLORS.find((c) => c.color === player.color);
              const isMe = player.clientId === uid;
              const isRoomHost = player.clientId === room.hostClientId;
              return (
                <div
                  key={player.clientId}
                  className="arc-rise"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 16,
                    background: isMe ? `color-mix(in srgb, ${hex} 10%, var(--surface))` : 'var(--surface)',
                    border: `1.5px solid ${isMe ? hex : 'var(--line)'}`,
                    boxShadow: isMe ? `0 0 0 1px ${hex}33, 0 0 14px -4px ${hex}66` : 'none',
                    transition: 'all .2s',
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  <DicePip value={i + 1} color={hex} />
                  <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isMe ? hex : 'var(--text)' }}>
                    {player.name}
                    {isMe && <span style={{ fontWeight: 400, color: 'var(--dim)', fontSize: 12, marginLeft: 6 }}>(나)</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {isRoomHost && (
                      <span className="arc-badge" style={{ background: 'var(--gold)' }}>HOST</span>
                    )}
                    {colorInfo && (
                      <span className="arc-chip" style={{ fontSize: 10, padding: '3px 8px', background: `color-mix(in srgb, ${hex} 15%, var(--surface-2))`, border: `1.5px solid ${hex}55` }}>
                        {colorInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 16,
                  border: '1.5px dashed var(--line)',
                  color: 'var(--faint)', fontSize: 14,
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px dashed var(--line-2)', flexShrink: 0 }} />
                <span style={{ fontStyle: 'italic' }}>대기 중...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div style={{ width: '100%', maxWidth: 400 }}>
          {isHost ? (
            <button
              className="arc-btn"
              onClick={handleStart}
              disabled={!canStart || starting}
              style={{ fontSize: 18 }}
            >
              {starting ? '게임 시작 중...' : canStart ? '게임 시작 🎲' : `최소 ${MIN_PLAYERS}명 필요`}
            </button>
          ) : (
            <div className="arc-panel" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div className="pix blink" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: 1 }}>WAITING FOR HOST</div>
              <div style={{ color: 'var(--dim)', fontSize: 13, marginTop: 8 }}>
                호스트가 게임을 시작할 때까지 대기 중...
              </div>
            </div>
          )}
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          INSERT COIN · WAIT FOR PLAYERS · HAVE FUN
        </p>
      </div>
    </div>
  );
}
