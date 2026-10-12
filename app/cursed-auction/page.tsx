'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginGuest, getGuestNickname, getGuestUid } from '@/lib/auth';
import { createRoom, joinRoom } from '@/lib/cursed-auction/firebase-game';
import { PLAYER_COLORS, MIN_PLAYERS, MAX_PLAYERS } from '@/lib/cursed-auction/game-data';

const ACCENT = '#f59e0b';

function segStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: ACCENT, color: '#000', boxShadow: `0 3px 0 0 rgba(245,158,11,0.4)`, fontWeight: 700 }
    : {};
}

function ColorPicker({
  selected,
  onChange,
  takenColors,
}: {
  selected: string;
  onChange: (c: string) => void;
  takenColors?: string[];
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PLAYER_COLORS.map(c => {
        const taken = takenColors?.includes(c.id) && c.id !== selected;
        return (
          <button
            key={c.id}
            onClick={() => !taken && onChange(c.id)}
            disabled={taken}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: taken ? 'not-allowed' : 'pointer',
              background: c.hex,
              opacity: taken ? 0.3 : 1,
              outline: selected === c.id ? `3px solid #fff` : '3px solid transparent',
              outlineOffset: 2,
              boxShadow: selected === c.id ? `0 0 12px ${c.hex}` : 'none',
              transition: 'outline .15s, box-shadow .15s',
            }}
            title={c.label}
          />
        );
      })}
    </div>
  );
}

function CursedAuctionSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('red');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getGuestNickname();
    if (saved) setNickname(saved);
    const uid = getGuestUid();
    const codeParam = searchParams.get('code');
    if (!codeParam) return;
    setJoinCode(codeParam.toUpperCase());
    if (!saved || !uid) return;
    setLoading('join');
    loginGuest(saved)
      .then(u => joinRoom(codeParam.toUpperCase(), u, saved, color))
      .then(err => {
        if (!err) {
          router.push(`/cursed-auction/room/${codeParam.toUpperCase()}`);
        } else {
          setError(err);
          setLoading(null);
        }
      })
      .catch(() => { setError('오류가 발생했습니다. 다시 시도해 주세요.'); setLoading(null); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    setError(''); setLoading('create');
    const uid = await loginGuest(nickname.trim());
    const code = await createRoom(uid, nickname.trim(), PLAYER_COLORS.find(c => c.id === color)?.hex ?? '#ef4444');
    router.push(`/cursed-auction/room/${code}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('방 코드를 입력하세요.'); return; }
    setError(''); setLoading('join');
    const uid = await loginGuest(nickname.trim());
    const err = await joinRoom(code, uid, nickname.trim(), PLAYER_COLORS.find(c => c.id === color)?.hex ?? '#ef4444');
    if (err) { setError(err); setLoading(null); return; }
    router.push(`/cursed-auction/room/${code}`);
  };

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* 상단 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 로비</Link>
          <Link href="/cursed-auction/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>📖 규칙</Link>
        </div>

        {/* 히어로 */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🏺</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 30, letterSpacing: 1, margin: '10px 0 2px', color: ACCENT, textShadow: `0 0 18px rgba(245,158,11,0.5)` }}>
            CURSED AUCTION
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>저주받은 경매장</div>
          <p style={{ color: 'var(--dim)', fontSize: 12, marginTop: 8 }}>
            {MIN_PLAYERS}~{MAX_PLAYERS}인 · 6라운드 · 비밀 입찰 · 심리전
          </p>
        </div>

        {/* 설정 패널 */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 닉네임 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="arc-lbl">내 닉네임</span>
                <span style={{ fontSize: 12, color: nickname.length >= 10 ? 'var(--red)' : 'var(--faint)' }}>
                  {nickname.length}/10
                </span>
              </div>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={10}
                placeholder="닉네임 입력..."
                className="arc-field"
                style={{ fontWeight: 600 }}
              />
            </div>

            {/* 색상 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>내 색상</span>
              <ColorPicker selected={color} onChange={setColor} />
            </div>

            {error && (
              <p style={{ color: 'var(--red)', fontSize: 13, margin: 0, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px' }}>
                {error}
              </p>
            )}

            {/* 방 만들기 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
              <button
                onClick={handleCreate}
                disabled={loading !== null}
                className="arc-btn"
                style={{ background: ACCENT, color: '#000', fontWeight: 700 }}
              >
                {loading === 'create' ? 'LOADING...' : '새 방 만들기'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ color: 'var(--faint)', fontSize: 12 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            {/* 방 참가 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 참가</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="방 코드 6자리"
                  className="arc-field"
                  style={{ flex: 1, letterSpacing: 4, fontFamily: 'var(--f-pix)', fontSize: 12 }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading !== null}
                  className="arc-btn-ghost"
                  style={{ flexShrink: 0 }}
                >
                  {loading === 'join' ? '...' : '참가'}
                </button>
              </div>
            </div>

          </div>
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          CURSED AUCTION · {MIN_PLAYERS}–{MAX_PLAYERS} PLAYERS · TRUST NO ONE
        </p>
      </div>
    </div>
  );
}

export default function CursedAuctionSetup() {
  return (
    <Suspense>
      <CursedAuctionSetupInner />
    </Suspense>
  );
}
