'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid, getGuestNickname } from '@/lib/auth';
import { subscribeRoom, startGame, type OnlineRoom } from '@/lib/guryongtu/firebase-game';

const ACCENT = '#ff3333';

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
      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>

        {/* 타이틀 */}
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24 }}>
          <p className="arc-lbl" style={{ marginBottom: 6 }}>구룡투 — 대기실</p>
          <div className="pix" style={{
            fontSize: 22, letterSpacing: 4,
            color: ACCENT, textShadow: `0 0 16px ${ACCENT}88`,
          }}>
            🐉 구룡투
          </div>
          <div className="pix" style={{ fontSize: 7, color: 'var(--dim)', marginTop: 6 }}>
            NINE DRAGONS DUEL
          </div>
        </div>

        {/* 방 코드 */}
        <div className="arc-panel ticks arc-rise" style={{ width: '100%', maxWidth: 340, padding: '20px 18px', textAlign: 'center', marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 코드</span>
          <div className="pix" style={{
            fontSize: 26, letterSpacing: 8,
            color: ACCENT, textShadow: `0 0 14px ${ACCENT}66`,
            marginBottom: 14,
          }}>
            {code}
          </div>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 12 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* 참가자 목록 */}
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>
            참가자 ({room.players.length}/2)
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
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    borderColor: isMe ? `${ACCENT}55` : 'var(--line)',
                    background: isMe ? `${ACCENT}0a` : undefined,
                  }}
                >
                  <span className="pix" style={{
                    fontSize: 14, width: 20, textAlign: 'center',
                    color: i === 0 ? ACCENT : '#4488ff',
                  }}>
                    {i === 0 ? '🔴' : '🔵'}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'var(--f-body)', fontWeight: 700, color: isMe ? ACCENT : 'var(--text-2)' }}>
                    {p.name}
                  </span>
                  {isRoomHost && (
                    <span className="arc-badge" style={{ background: ACCENT, color: '#fff', fontSize: 9 }}>
                      HOST
                    </span>
                  )}
                  {isMe && <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>나</span>}
                </div>
              );
            })}
            {room.players.length < 2 && (
              <div className="arc-panel-inset" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 16px', borderStyle: 'dashed', opacity: 0.5,
              }}>
                <p className="pix blink" style={{ fontSize: 8, color: 'var(--faint)' }}>
                  상대방을 기다리는 중...
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p style={{
            color: 'var(--red)', fontSize: 13,
            background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            width: '100%', maxWidth: 340, textAlign: 'center',
          }}>
            {error}
          </p>
        )}

        {/* 시작 / 대기 */}
        <div style={{ width: '100%', maxWidth: 340 }}>
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="arc-btn"
              style={{ background: ACCENT, borderColor: ACCENT, color: '#fff', fontSize: 16 }}
            >
              <span className="pix" style={{ fontSize: 10, marginRight: 6 }}>▶</span>
              {starting ? 'LOADING...' : canStart ? '대결 시작!' : `상대방 대기 중 (${room.players.length}/2)`}
            </button>
          ) : (
            <p className="pix blink" style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center' }}>
              호스트가 시작하길 기다리는 중...
            </p>
          )}
        </div>

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', marginTop: 20 }}>
          2인 전용 · BEST OF 3 GAMES
        </p>
      </div>
    </div>
  );
}
