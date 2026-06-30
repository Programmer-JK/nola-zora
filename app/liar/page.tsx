'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginGuest, getGuestNickname } from '@/lib/auth';
import { createRoom, joinRoom } from '@/lib/liar/firebase-game';
import type { OnlineLiarMode } from '@/lib/liar/types';

const ACCENT = '#e84242';
type PlayMode = 'local' | 'online';

function segStyle(active: boolean): React.CSSProperties {
  return active ? { background: ACCENT, color: '#fff', boxShadow: `0 3px 0 0 rgba(232,66,66,0.4)` } : {};
}

function LocalSetup({ mode }: { mode: OnlineLiarMode }) {
  const router = useRouter();
  const [count, setCount] = useState(4);
  const [liarCount, setLiarCount] = useState(1);

  const maxLiars = Math.floor((count - 1) / 2);

  const handleCountChange = (n: number) => {
    setCount(n);
    if (liarCount > Math.floor((n - 1) / 2)) setLiarCount(1);
  };

  const start = () => {
    sessionStorage.setItem('liar-count', String(count));
    sessionStorage.setItem('liar-liarCount', String(liarCount));
    sessionStorage.setItem('liar-mode', mode);
    router.push('/liar/game/local');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>인원 수</span>
        <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
          {[3, 4, 5, 6, 7, 8].map(n => (
            <button key={n} onClick={() => handleCountChange(n)} className={count === n ? 'on' : ''} style={count === n ? segStyle(true) : {}}>
              {n}명
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>라이어 수</span>
        <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
          {Array.from({ length: maxLiars }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setLiarCount(n)} className={liarCount === n ? 'on' : ''} style={liarCount === n ? segStyle(true) : {}}>
              {n}명
            </button>
          ))}
        </div>
      </div>
      <button onClick={start} className="arc-btn" style={{ background: ACCENT, fontSize: 18 }}>
        게임 시작
      </button>
    </div>
  );
}

function OnlineSetup({ mode }: { mode: OnlineLiarMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getGuestNickname();
    if (saved) setNickname(saved);
    const codeParam = searchParams.get('code');
    if (!codeParam) return;
    const upperCode = codeParam.toUpperCase();
    setJoinCode(upperCode);
    if (!saved) return;
    setLoading('join');
    loginGuest(saved)
      .then(uid => joinRoom(upperCode, uid, saved))
      .then(err => {
        if (!err) {
          router.push(`/liar/room/${upperCode}`);
        } else {
          setError(err);
          setLoading(null);
        }
      })
      .catch(() => {
        setError('오류가 발생했습니다. 다시 시도해 주세요.');
        setLoading(null);
      });
  }, [searchParams, router]);

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    setError(''); setLoading('create');
    const uid = await loginGuest(nickname.trim());
    const code = await createRoom(uid, nickname.trim(), mode);
    router.push(`/liar/room/${code}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('방 코드를 입력하세요.'); return; }
    setError(''); setLoading('join');
    const uid = await loginGuest(nickname.trim());
    const err = await joinRoom(code, uid, nickname.trim());
    if (err) { setError(err); setLoading(null); return; }
    router.push(`/liar/room/${code}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="arc-lbl">내 닉네임</span>
          <span style={{ fontSize: 12, color: nickname.length >= 10 ? 'var(--red)' : 'var(--faint)' }}>{nickname.length}/10</span>
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

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, margin: 0, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <div>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
        <button onClick={handleCreate} disabled={loading !== null} className="arc-btn" style={{ background: ACCENT }}>
          {loading === 'create' ? 'LOADING...' : '새 방 만들기'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ color: 'var(--faint)', fontSize: 12 }}>또는</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

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
          <button onClick={handleJoin} disabled={loading !== null} className="arc-btn-ghost" style={{ flexShrink: 0 }}>
            {loading === 'join' ? '...' : '참가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiarSetupInner() {
  const searchParams = useSearchParams();
  const [playMode, setPlayMode] = useState<PlayMode>(() =>
    searchParams.get('code') ? 'online' : 'local'
  );
  const [mode, setMode] = useState<OnlineLiarMode>('normal');

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 로비</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/liar/words" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>📋 단어</Link>
            <Link href="/liar/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>📖 규칙</Link>
          </div>
        </div>

        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🕵️</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 32, letterSpacing: 1, margin: '8px 0 2px', color: ACCENT, textShadow: `0 0 18px rgba(232,66,66,0.5)` }}>
            LIAR GAME
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>라이어 게임</div>
        </div>

        {/* 플레이 모드 */}
        <div className="arc-seg" style={{ marginBottom: 16, '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
          <button className={playMode === 'local' ? 'on' : ''} style={playMode === 'local' ? segStyle(true) : {}} onClick={() => setPlayMode('local')}>
            🖥️ 로컬
          </button>
          <button className={playMode === 'online' ? 'on' : ''} style={playMode === 'online' ? segStyle(true) : {}} onClick={() => setPlayMode('online')}>
            🌐 온라인
          </button>
        </div>

        {/* 게임 모드 */}
        <div className="arc-panel arc-rise" style={{ padding: 16, marginBottom: 12 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>게임 모드</span>
          <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
            <button className={mode === 'normal' ? 'on' : ''} style={mode === 'normal' ? segStyle(true) : {}} onClick={() => setMode('normal')}>
              🕵️ 기본 라이어
            </button>
            <button className={mode === 'fake' ? 'on' : ''} style={mode === 'fake' ? segStyle(true) : {}} onClick={() => setMode('fake')}>
              ⚡ 거짓 라이어
            </button>
          </div>
          {mode === 'fake' && (
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>
              라이어도 본인이 라이어인 줄 모름. 시민과 다른 단어를 받아요.
            </p>
          )}
        </div>

        {/* 로컬 / 온라인 설정 */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px', animationDelay: '.08s' }}>
          {playMode === 'local'
            ? <LocalSetup mode={mode} />
            : <OnlineSetup mode={mode} />
          }
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          LIAR GAME · FIND THE LIAR · 3–8 PLAYERS
        </p>
      </div>
    </div>
  );
}

export default function LiarSetup() {
  return (
    <Suspense>
      <LiarSetupInner />
    </Suspense>
  );
}
