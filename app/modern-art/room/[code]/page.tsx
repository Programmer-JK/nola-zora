'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGuestUid, loginGuest, getGuestNickname } from '@/lib/auth';
import { subscribeRoom, startGame, joinRoom, type Room } from '@/lib/modern-art/firebase-game';
import { QRCodeSVG } from 'qrcode.react';

const ACCENT = '#e879f9';
const ACCENT_LO = '#a21caf';

export default function ModernArtWaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const uid = getGuestUid() ?? '';

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

  const handleJoin = useCallback(async () => {
    const name = joinNickname.trim();
    if (!name) { setJoinError('닉네임을 입력해 주세요'); return; }
    if (name.length > 12) { setJoinError('12자 이내로 입력해 주세요'); return; }
    setJoining(true);
    setJoinError('');
    try {
      if (!getGuestNickname()) await loginGuest(name);
      const currentUid = getGuestUid() ?? '';
      const err = await joinRoom(code, currentUid, name);
      if (err) { setJoinError(err); setJoining(false); }
    } catch {
      setJoinError('입장 중 오류가 발생했습니다.');
      setJoining(false);
    }
  }, [code, joinNickname]);

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
  const isPlayer = room.players.some(p => p.clientId === uid);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* ── 상단 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/modern-art" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 나가기
          </Link>
          <Link href="/modern-art/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            📖 규칙
          </Link>
        </div>

        {/* ── 히어로 ── */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '8px 0 20px' }}>
          <div className="arc-float" style={{ fontSize: 48, lineHeight: 1, marginBottom: 6 }}>🎨</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 2, margin: '0 0 4px',
            color: ACCENT, textShadow: `0 0 20px ${ACCENT}88`,
          }}>
            MODERN ART
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
            모던아트
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
          <div style={{ display: 'inline-block', padding: 10, borderRadius: 12, background: '#fff', marginBottom: 12, boxShadow: `0 0 18px ${ACCENT}33` }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/modern-art/room/${code}`}
              size={120}
              bgColor="#ffffff"
              fgColor="#1a0000"
              level="M"
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 12 }}>QR 스캔 또는 코드 직접 입력</p>
          <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 13 }}>
            {copied ? '✓ 복사됨!' : '코드 복사'}
          </button>
        </div>

        {/* ── 참가자 목록 ── */}
        <div className="arc-panel arc-rise" style={{ padding: '18px', marginBottom: 12, animationDelay: '.06s' }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 12 }}>참가자 ({room.players.length}/5)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {room.players.map((p, i) => {
              const isMe = p.clientId === uid;
              const isRoomHost = room.hostClientId === p.clientId;
              const playerColor = ACCENT;
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
                    {i + 1}
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
            {room.players.length < 5 && (
              <div className="arc-panel-inset" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 16px', borderStyle: 'dashed', opacity: 0.5,
              }}>
                <p className="blink" style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--faint)', margin: 0 }}>
                  플레이어를 기다리는 중...
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

        {/* ── 시작 / 대기 / 참가 ── */}
        {!isPlayer ? (
          <div className="arc-panel arc-rise" style={{ padding: '18px', marginBottom: 12 }}>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 12, textAlign: 'center' }}>방 참가하기</span>
            <input
              className="arc-field"
              style={{ textAlign: 'center', fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 18, letterSpacing: 1, marginBottom: 10 }}
              value={joinNickname}
              maxLength={12}
              placeholder="닉네임 입력"
              onChange={e => { setJoinNickname(e.target.value); setJoinError(''); }}
            />
            {joinError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{joinError}</p>}
            <button
              onClick={handleJoin}
              disabled={joining || room.players.length >= 5}
              className="arc-btn"
              style={{ '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties}
            >
              {joining ? 'LOADING...' : room.players.length >= 5 ? '방이 가득 찼습니다' : '🎨 참가하기'}
            </button>
          </div>
        ) : isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="arc-btn"
            style={{ '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties}
          >
            {starting ? 'LOADING...' : canStart ? '🎨 게임 시작!' : `2명 이상 필요 (${room.players.length}/5)`}
          </button>
        ) : (
          <p className="blink" style={{ fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--dim)', textAlign: 'center' }}>
            호스트가 시작하길 기다리는 중...
          </p>
        )}

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', marginTop: 20, textAlign: 'center' }}>
          2–5인 · 4 ROUNDS · 경매 전략
        </p>
      </div>
    </div>
  );
}
