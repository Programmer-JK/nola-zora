'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGuestUid } from '@/lib/auth';
import { subscribeRoom, startGame, type OnlineRoom } from '@/lib/guryongtu/firebase-game';

const ACCENT = '#ff3333';
const ACCENT_LO = '#b51a1a';

export default function GuryongtuWaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const uid = getGuestUid() ?? '';

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/guryongtu'); return; }
      setRoom(r);
      if (r.status === 'playing') router.replace(`/guryongtu/game/${code}`);
    });
    return unsub;
  }, [code, router]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    const err = await startGame(code, uid);
    if (err) { setError(err); setStarting(false); }
  }, [code, uid]);

  if (!room) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>CONNECTING...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostClientId === uid;
  const canStart = isHost && room.players.length >= 2;

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* ── 상단 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/guryongtu" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 나가기
          </Link>
          <Link href="/guryongtu/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            📖 규칙
          </Link>
        </div>

        {/* ── 히어로 ── */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '8px 0 20px' }}>
          <div className="arc-float" style={{ fontSize: 48, lineHeight: 1, marginBottom: 6 }}>🐉</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 2, margin: '0 0 4px',
            color: ACCENT, textShadow: `0 0 20px ${ACCENT}88`,
          }}>
            NINE DRAGONS
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
            구룡투
          </div>
          <div style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--dim)' }}>대기실</div>
        </div>

        {/* ── 방 코드 ── */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '18px', marginBottom: 12, textAlign: 'center' }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>방 코드</span>
          <div className="pix" style={{
            fontSize: 28, letterSpacing: 10,
            color: ACCENT, textShadow: `0 0 14px ${ACCENT}66`,
            marginBottom: 12,
          }}>
            {code}
          </div>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 13 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* ── 참가자 목록 ── */}
        <div className="arc-panel arc-rise" style={{ padding: '18px', marginBottom: 12, animationDelay: '.06s' }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 12 }}>참가자 ({room.players.length}/2)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {room.players.map((p, i) => {
              const isMe = p.clientId === uid;
              const isRoomHost = room.hostClientId === p.clientId;
              const playerColor = i === 0 ? ACCENT : '#4488ff';
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderColor: isMe ? `${ACCENT}55` : 'var(--line)',
                    background: isMe ? `${ACCENT}0a` : undefined,
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                    {i === 0 ? '🔴' : '🔵'}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 14, color: isMe ? playerColor : 'var(--text-2)' }}>
                    {p.name}
                  </span>
                  {isRoomHost && (
                    <span className="arc-badge" style={{ background: ACCENT, color: '#fff' }}>HOST</span>
                  )}
                  {isMe && <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--faint)' }}>나</span>}
                </div>
              );
            })}
            {room.players.length < 2 && (
              <div className="arc-panel-inset" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 16px', borderStyle: 'dashed', opacity: 0.5,
              }}>
                <p className="blink" style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--faint)', margin: 0 }}>
                  상대방을 기다리는 중...
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p style={{
            fontFamily: 'var(--f-kr)', color: 'var(--red)', fontSize: 13,
            background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
          }}>
            {error}
          </p>
        )}

        {/* ── 시작 / 대기 ── */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="arc-btn"
            style={{ '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties}
          >
            {starting ? 'LOADING...' : canStart ? '⚔️ 대결 시작!' : `상대방 대기 중 (${room.players.length}/2)`}
          </button>
        ) : (
          <p className="blink" style={{ fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--dim)', textAlign: 'center' }}>
            호스트가 시작하길 기다리는 중...
          </p>
        )}

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', marginTop: 20, textAlign: 'center' }}>
          2인 전용 · BEST OF 3 GAMES
        </p>
      </div>
    </div>
  );
}
