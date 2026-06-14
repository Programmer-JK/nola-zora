'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid, getGuestNickname } from '@/lib/auth';
import { subscribeRoom, startGame, type OnlineRoom } from '@/lib/modern-art/firebase-game';
import { ARTISTS } from '@/lib/modern-art/game-data';

export default function WaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const uid = getGuestUid() ?? '';
  const nickname = getGuestNickname() ?? '';

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/modern-art'); return; }
      setRoom(r);
      if (r.status === 'playing') router.replace(`/modern-art/game/${code}`);
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

      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
        {/* 타이틀 */}
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24 }}>
          <p className="arc-lbl" style={{ marginBottom: 6 }}>모던 아트 — 온라인 대기실</p>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 2 }} className="neon-cyan">
            MODERN ART
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {ARTISTS.map(a => <span key={a.id} style={{ fontSize: 22 }}>{a.avatar}</span>)}
          </div>
        </div>

        {/* 방 코드 */}
        <div className="arc-panel ticks arc-rise" style={{ width: '100%', maxWidth: 340, padding: '20px 18px', textAlign: 'center', marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 코드</span>
          <div style={{ fontFamily: 'var(--f-pix)', fontSize: 26, letterSpacing: 8, color: 'var(--cyan)', textShadow: '0 0 14px rgba(54,224,207,.5)', marginBottom: 14 }}>
            {code}
          </div>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 12 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* 참가자 목록 */}
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>
            참가자 ({room.players.length}/5)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {room.players.map((p, i) => {
              const isMe = p.clientId === uid;
              const isRoomHost = room.hostClientId === p.clientId;
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderColor: isMe ? 'rgba(54,224,207,0.35)' : 'var(--line)',
                    background: isMe ? 'rgba(54,224,207,0.06)' : undefined,
                  }}
                >
                  <span className="pix" style={{ fontSize: 8, color: 'var(--faint)', width: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: 'var(--f-body)', fontWeight: 700, color: isMe ? 'var(--cyan)' : 'var(--text-2)' }}>
                    {p.name}
                  </span>
                  {isRoomHost && <span className="arc-badge" style={{ background: 'var(--cyan)', color: '#06231f' }}>HOST</span>}
                  {isMe && <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>나</span>}
                </div>
              );
            })}
            {room.players.length < 2 && (
              <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 4 }}>
                다른 플레이어가 참가하길 기다리는 중...
              </p>
            )}
          </div>
        </div>

        {/* 오류 */}
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* 시작 / 대기 */}
        <div style={{ width: '100%', maxWidth: 340 }}>
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="arc-btn arc-btn--cyan"
              style={{ fontSize: 18 }}
            >
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 2 }}>▶</span>
              {starting ? 'LOADING...' : canStart ? '게임 시작' : `최소 2명 필요 (현재 ${room.players.length}명)`}
            </button>
          ) : (
            <p className="pix blink" style={{ fontSize: 8, color: 'var(--dim)', textAlign: 'center' }}>
              호스트가 게임을 시작하길 기다리는 중...
            </p>
          )}
        </div>

        <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 20 }}>
          {room.maxRounds}라운드 게임
        </p>
      </div>
    </div>
  );
}
