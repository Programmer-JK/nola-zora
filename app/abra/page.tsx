'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginGuest, getGuestNickname } from '@/lib/auth';
import { createRoom, joinRoom } from '@/lib/abra/firebase-game';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

function LocalSetup({ goalScore }: { goalScore: number }) {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(4);
  const [names, setNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4', '플레이어 5', '플레이어 6']);

  const handleStart = () => {
    const params = new URLSearchParams({
      players: names.slice(0, playerCount).join(','),
      goalScore: String(goalScore),
    });
    router.push(`/abra/game/local?${params}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>플레이어 수</span>
        <div className="arc-seg" style={{ '--c': 'var(--violet)', '--seg-text': '#fff' } as React.CSSProperties}>
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
            <button key={n} onClick={() => setPlayerCount(n)} className={playerCount === n ? 'on' : ''}>{n}명</button>
          ))}
        </div>
      </section>

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>플레이어 이름</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="arc-badge" style={{ background: 'var(--surface-3)', color: 'var(--dim)', flexShrink: 0 }}>{i + 1}</span>
              <input
                type="text"
                value={names[i]}
                onChange={e => { const next = [...names]; next[i] = e.target.value; setNames(next); }}
                maxLength={10}
                className="arc-field"
                style={{ flex: 1, fontWeight: 600 }}
                placeholder={`플레이어 ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </section>

      <button onClick={handleStart} className="arc-btn arc-btn--violet" style={{ fontSize: 18 }}>
        <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 2 }}>▶</span>
        게임 시작
      </button>
    </div>
  );
}

function OnlineSetup({ goalScore }: { goalScore: number }) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getGuestNickname();
    if (saved) setNickname(saved);
  }, []);

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    setError(''); setLoading('create');
    const uid = await loginGuest(nickname.trim());
    const code = await createRoom(uid, nickname.trim(), goalScore);
    router.push(`/abra/room/${code}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('방 코드를 입력하세요.'); return; }
    setError(''); setLoading('join');
    const uid = await loginGuest(nickname.trim());
    const err = await joinRoom(code, uid, nickname.trim());
    if (err) { setError(err); setLoading(null); return; }
    router.push(`/abra/room/${code}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>내 닉네임</span>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={10}
          placeholder="닉네임 입력..."
          className="arc-field"
          style={{ fontWeight: 600 }}
        />
      </section>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, margin: 0, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
        <button onClick={handleCreate} disabled={loading !== null} className="arc-btn arc-btn--violet">
          {loading === 'create' ? 'LOADING...' : '새 방 만들기'}
        </button>
        <p style={{ color: 'var(--faint)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>방을 만들고 친구에게 코드를 공유하세요</p>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ color: 'var(--faint)', fontSize: 12 }}>또는</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 참가</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
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
      </section>

      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--faint)' }}>
        <span>🔮 2~6명</span>
        <span>🏆 목표 점수 {goalScore}점</span>
      </div>
    </div>
  );
}

type Mode = 'local' | 'online';

export default function AbraSetup() {
  const [mode, setMode] = useState<Mode>('local');
  const [goalScore, setGoalScore] = useState(8);

  return (
    <div className="cabinet">
      <div className="crt" />

      <div className="arc-screen" style={{ '--c': 'var(--violet)' } as React.CSSProperties}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </Link>
          <Link href="/abra/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            📖 규칙
          </Link>
        </div>

        {/* Hero */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🔮</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 36, letterSpacing: 1, margin: '6px 0 2px', color: 'var(--violet)', textShadow: '0 0 18px rgba(162,116,255,.55)' }}>
            ABRACA...WHAT?
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>아브라카왓</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <span className="arc-chip" style={{ fontSize: 11 }}>🔮 마법사 배틀</span>
            <span className="arc-chip" style={{ fontSize: 11 }}>👥 2~6명</span>
            <span className="arc-chip" style={{ fontSize: 11 }}>🎲 주사위 + 정보 추론</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="arc-seg" style={{ marginBottom: 18, '--c': 'var(--violet)', '--seg-text': '#fff' } as React.CSSProperties}>
          {(['local', 'online'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={mode === m ? 'on' : ''}>
              {m === 'local' ? '🖥️ 로컬 플레이' : '🌐 온라인'}
            </button>
          ))}
        </div>

        {/* Goal score */}
        <div className="arc-panel arc-rise" style={{ padding: 16, marginBottom: 12 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>목표 점수</span>
          <div className="arc-seg" style={{ '--c': 'var(--violet)', '--seg-text': '#fff' } as React.CSSProperties}>
            {[6, 8, 10].map(s => (
              <button key={s} onClick={() => setGoalScore(s)} className={goalScore === s ? 'on' : ''}>{s}점</button>
            ))}
          </div>
        </div>

        {/* Mode UI */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px', animationDelay: '.08s' }}>
          {mode === 'local'
            ? <LocalSetup goalScore={goalScore} />
            : <OnlineSetup goalScore={goalScore} />
          }
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          ABRACA...WHAT? · SPELL &amp; BLUFF · 2–6 PLAYERS
        </p>
      </div>
    </div>
  );
}
