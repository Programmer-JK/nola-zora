'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import { subscribeRoom, startGame, updateRoomLiarCount, type LiarOnlineRoom } from '@/lib/liar/firebase-game';
import { QRCodeSVG } from 'qrcode.react';

const ACCENT = '#e84242';

export default function LiarWaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<LiarOnlineRoom | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const uid = getGuestUid() ?? '';

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/liar'); return; }
      setRoom(r);
      if (r.status === 'playing') router.replace(`/liar/game/${code}`);
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
  const canStart = isHost && room.players.length >= 3;

  return (
    <div className="cabinet">
      <div className="crt" />

      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24 }}>
          <p className="arc-lbl" style={{ marginBottom: 6 }}>라이어 게임 — 온라인 대기실</p>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 24, letterSpacing: 2, color: ACCENT, textShadow: `0 0 14px rgba(232,66,66,0.5)` }}>
            LIAR GAME
          </div>
          <div style={{ fontSize: 40, marginTop: 10 }}>🕵️</div>
        </div>

        {/* 방 코드 */}
        <div className="arc-panel ticks arc-rise" style={{ width: '100%', maxWidth: 340, padding: '20px 18px', textAlign: 'center', marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 코드</span>
          <div style={{ fontFamily: 'var(--f-pix)', fontSize: 26, letterSpacing: 8, color: ACCENT, textShadow: `0 0 14px rgba(232,66,66,0.5)`, marginBottom: 14 }}>
            {code}
          </div>

          <div style={{ display: 'inline-block', padding: 10, borderRadius: 12, background: '#fff', marginBottom: 14, boxShadow: `0 0 18px rgba(232,66,66,0.2)` }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/liar?code=${code}`}
              size={120}
              bgColor="#ffffff"
              fgColor="#1a0809"
              level="M"
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 12 }}>QR 스캔 또는 코드 직접 입력</p>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 12 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* 라이어 수 (호스트만 변경 가능) */}
        {isHost && (
          <div className="arc-panel arc-rise" style={{ width: '100%', maxWidth: 340, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="arc-lbl">라이어 수</span>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>최대 {Math.floor((room.players.length - 1) / 2)}명</span>
            </div>
            <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
              {Array.from({ length: Math.max(1, Math.floor((room.players.length - 1) / 2)) }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={room.liarCount === n ? 'on' : ''}
                  style={room.liarCount === n ? { background: ACCENT, color: '#fff', boxShadow: `0 3px 0 0 rgba(232,66,66,0.4)` } : {}}
                  onClick={() => updateRoomLiarCount(code, n)}
                >
                  {n}명
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 플레이어 목록 */}
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="arc-lbl">참가자 ({room.players.length}/8)</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="arc-chip" style={{ fontSize: 11 }}>
                🕵️ 라이어 {room.liarCount}명
              </span>
              <span className="arc-chip" style={{ fontSize: 11 }}>
                {room.mode === 'fake' ? '⚡ 거짓' : '기본'}
              </span>
            </div>
          </div>
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
                    borderColor: isMe ? `rgba(232,66,66,0.35)` : 'var(--line)',
                    background: isMe ? 'rgba(232,66,66,0.06)' : undefined,
                  }}
                >
                  <span className="pix" style={{ fontSize: 8, color: 'var(--faint)', width: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 700, color: isMe ? ACCENT : 'var(--text-2)' }}>{p.name}</span>
                  {isRoomHost && <span className="arc-badge" style={{ background: ACCENT, color: '#fff' }}>HOST</span>}
                  {isMe && <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>나</span>}
                </div>
              );
            })}
            {room.players.length < 3 && (
              <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 4 }}>
                최소 3명 필요 — 다른 플레이어가 참가하길 기다리는 중...
              </p>
            )}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div style={{ width: '100%', maxWidth: 340 }}>
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="arc-btn"
              style={{ background: ACCENT, fontSize: 18 }}
            >
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 2 }}>▶</span>
              {starting ? 'LOADING...' : canStart ? '게임 시작' : `최소 3명 필요 (현재 ${room.players.length}명)`}
            </button>
          ) : (
            <p className="pix blink" style={{ fontSize: 15, color: 'var(--dim)', textAlign: 'center' }}>
              호스트가 게임을 시작하길 기다리는 중...
            </p>
          )}
        </div>

        <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 20 }}>
          LIAR GAME · {room.mode === 'fake' ? '거짓 라이어' : '기본'}
        </p>
      </div>
    </div>
  );
}
