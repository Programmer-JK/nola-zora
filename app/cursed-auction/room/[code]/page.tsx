'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom,
  startGame,
  registerPresence,
} from '@/lib/cursed-auction/firebase-game';
import type { AuctionRoom, AuctionPlayer } from '@/lib/cursed-auction/types';
import { MIN_PLAYERS, MAX_PLAYERS } from '@/lib/cursed-auction/game-data';
import { QRCodeSVG } from 'qrcode.react';

const ACCENT = '#f59e0b';

export default function CursedAuctionWaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<AuctionRoom | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const uid = getGuestUid() ?? '';

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    registerPresence(code, uid).then(c => { cleanup = c; });

    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/cursed-auction'); return; }
      setRoom(r);
      if (r.status === 'playing') router.replace(`/cursed-auction/game/${code}`);
    });

    return () => { unsub(); cleanup?.(); };
  }, [code, router, uid]);

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
  const canStart = isHost && room.players.length >= MIN_PLAYERS && room.players.length <= MAX_PLAYERS;
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/cursed-auction?code=${code}` : '';

  return (
    <div className="cabinet">
      <div className="crt" />

      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* 헤더 */}
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 20, marginTop: 10 }}>
          <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>🏺</div>
          <p className="arc-lbl" style={{ marginBottom: 4 }}>저주받은 경매장 — 대기실</p>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 20, letterSpacing: 2, color: ACCENT, textShadow: `0 0 14px rgba(245,158,11,0.5)` }}>
            CURSED AUCTION
          </div>
        </div>

        {/* 방 코드 & QR */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px', textAlign: 'center', marginBottom: 14 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 코드</span>
          <div style={{ fontFamily: 'var(--f-pix)', fontSize: 26, letterSpacing: 8, color: ACCENT, textShadow: `0 0 14px rgba(245,158,11,0.5)`, marginBottom: 14 }}>
            {code}
          </div>

          <div style={{ display: 'inline-block', padding: 10, borderRadius: 12, background: '#fff', marginBottom: 12, boxShadow: `0 0 18px rgba(245,158,11,0.2)` }}>
            <QRCodeSVG
              value={joinUrl}
              size={110}
              bgColor="#ffffff"
              fgColor="#1a0a00"
              level="M"
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 10 }}>QR 스캔 또는 코드 직접 입력</p>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 12 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* 참가자 목록 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="arc-lbl">참가자 ({room.players.length}/{MAX_PLAYERS})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="arc-chip" style={{ fontSize: 11 }}>
                🪙 초기 금화 12개
              </span>
              <span className="arc-chip" style={{ fontSize: 11 }}>
                🔍 감정 1회
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {room.players.map((p: AuctionPlayer, i: number) => {
              const isMe = p.clientId === uid;
              const isRoomHost = room.hostClientId === p.clientId;
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderColor: isMe ? `rgba(245,158,11,0.4)` : 'var(--line)',
                    background: isMe ? 'rgba(245,158,11,0.06)' : undefined,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: p.color, flexShrink: 0,
                    boxShadow: isMe ? `0 0 8px ${p.color}` : 'none',
                  }} />
                  <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, color: isMe ? ACCENT : 'var(--text-2)', flex: 1 }}>
                    {p.name}
                  </span>
                  {isRoomHost && <span className="arc-badge" style={{ background: ACCENT, color: '#000', fontSize: 10 }}>HOST</span>}
                  {isMe && <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>나</span>}
                </div>
              );
            })}

            {room.players.length < MIN_PLAYERS && (
              <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 4 }}>
                최소 {MIN_PLAYERS}명 필요 ({MIN_PLAYERS - room.players.length}명 더 필요)
              </p>
            )}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* 시작 버튼 */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="arc-btn"
            style={{ background: canStart ? ACCENT : 'var(--surface-2)', color: canStart ? '#000' : 'var(--dim)', fontWeight: 700, fontSize: 18 }}
          >
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 4 }}>▶</span>
            {starting
              ? 'LOADING...'
              : canStart
                ? '게임 시작'
                : room.players.length < MIN_PLAYERS
                  ? `최소 ${MIN_PLAYERS}명 필요 (현재 ${room.players.length}명)`
                  : `최대 ${MAX_PLAYERS}명 초과`
            }
          </button>
        ) : (
          <p className="pix blink" style={{ fontSize: 14, color: 'var(--dim)', textAlign: 'center' }}>
            호스트가 게임을 시작하길 기다리는 중...
          </p>
        )}

        <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 20, textAlign: 'center' }}>
          CURSED AUCTION · {MIN_PLAYERS}–{MAX_PLAYERS} PLAYERS
        </p>
      </div>
    </div>
  );
}
