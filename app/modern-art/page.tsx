'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createRoom, joinRoom } from '@/lib/modern-art/firebase-game';
import { ARTISTS } from '@/lib/modern-art/game';

const ACCENT = '#e879f9';
const ACCENT_LO = '#a21caf';

export default function ModernArtSetupPage() {
  const router = useRouter();
  const { uid, nickname } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  const handleCreate = useCallback(async () => {
    if (!uid || !nickname) return;
    setError('');
    setLoading('create');
    try {
      const code = await createRoom(uid, nickname);
      router.push(`/modern-art/room/${code}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`방 생성 실패: ${msg}`);
      setLoading(null);
    }
  }, [uid, nickname, router]);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) { setError('6자리 방 코드를 입력하세요.'); return; }
    if (!uid || !nickname) return;
    setError('');
    setLoading('join');
    try {
      const err = await joinRoom(code, uid, nickname);
      if (err) { setError(err); setLoading(null); return; }
      router.push(`/modern-art/room/${code}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`방 참가 실패: ${msg}`);
      setLoading(null);
    }
  }, [joinCode, uid, nickname, router]);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        {/* ── 상단 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </Link>
          <Link href="/modern-art/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            📖 규칙
          </Link>
        </div>

        {/* ── 게임 히어로 ── */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '8px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>🎨</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 32, letterSpacing: 2, margin: '0 0 4px',
            color: ACCENT, textShadow: `0 0 24px ${ACCENT}88, 0 0 60px ${ACCENT}44`,
          }}>
            MODERN ART
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)', marginBottom: 14 }}>
            모던아트
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {ARTISTS.map(a => (
              <span key={a.name} style={{ fontFamily: 'var(--f-kr)', fontSize: 12, fontWeight: 700, color: a.color }}>
                {a.emoji} {a.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── 메인 패널 ── */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 플레이어 정보 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--dim)' }}>플레이어</span>
              <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 14, color: ACCENT, marginLeft: 4 }}>{nickname}</span>
            </div>

            {/* 방 만들기 */}
            <section>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
              <button
                onClick={handleCreate}
                disabled={loading !== null}
                className="arc-btn"
                style={{ '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties}
              >
                {loading === 'create' ? 'LOADING...' : '🎨 새 방 만들기'}
              </button>
              <p style={{ fontFamily: 'var(--f-kr)', color: 'var(--faint)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                방을 만들고 친구들에게 코드를 공유하세요
              </p>
            </section>

            {/* 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontFamily: 'var(--f-kr)', color: 'var(--faint)', fontSize: 12 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            {/* 방 참가 */}
            <section>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 참가</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="arc-field"
                  style={{ flex: 1, fontFamily: 'var(--f-pix)', fontSize: 14, letterSpacing: 6, textTransform: 'uppercase' }}
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={6}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading !== null}
                  className="arc-btn-ghost"
                  style={{ flexShrink: 0, padding: '0 18px' }}
                >
                  {loading === 'join' ? '...' : '참가'}
                </button>
              </div>
            </section>

            {error && (
              <p style={{
                fontFamily: 'var(--f-kr)', color: 'var(--red)', fontSize: 13,
                background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)',
                borderRadius: 12, padding: '10px 14px', margin: 0,
              }}>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ── 하단 칩 ── */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <span className="arc-chip" style={{ fontSize: 11 }}>👥 2–5P</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🔨 4가지 경매</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🏁 4 ROUNDS</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🌐 온라인</span>
        </div>

      </div>
    </div>
  );
}
