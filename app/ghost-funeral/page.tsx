'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GHOST_CASES } from '@/lib/ghost-funeral/game-data';

const ACCENT = '#a274ff';

function segStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: ACCENT, color: '#fff', boxShadow: `0 3px 0 0 rgba(162,116,255,0.4)` }
    : {};
}

export default function GhostFuneralSetup() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(5);
  const [selectedCase, setSelectedCase] = useState<string>('random');

  const start = () => {
    sessionStorage.setItem('ghost-playerCount', String(playerCount));
    sessionStorage.setItem('ghost-caseId', selectedCase === 'random' ? '' : selectedCase);
    router.push('/ghost-funeral/game/local');
  };

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 로비</Link>
          <Link href="/ghost-funeral/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>📖 규칙</Link>
        </div>

        {/* 타이틀 */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>👻</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 1,
            margin: '8px 0 2px', color: ACCENT,
            textShadow: `0 0 18px rgba(162,116,255,0.6)`,
          }}>
            GHOST&apos;S FUNERAL
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>유령의 장례식</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--faint)' }}>4–8인 · 10–15분 · 추리 심리전</div>
        </div>

        {/* 인원 수 */}
        <div className="arc-panel arc-rise" style={{ padding: 16, marginBottom: 12 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>인원 수</span>
          <div className="arc-seg" style={{ '--c': ACCENT, '--seg-text': '#fff' } as React.CSSProperties}>
            {[4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={playerCount === n ? 'on' : ''}
                style={playerCount === n ? segStyle(true) : {}}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>

        {/* 시나리오 선택 */}
        <div className="arc-panel ticks arc-rise" style={{ padding: 16, marginBottom: 12, animationDelay: '.05s' }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>시나리오</span>

          {/* 랜덤 */}
          <button
            onClick={() => setSelectedCase('random')}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: `2px solid ${selectedCase === 'random' ? ACCENT : 'var(--line-2)'}`,
              background: selectedCase === 'random' ? `rgba(162,116,255,0.12)` : 'var(--surface)',
              color: selectedCase === 'random' ? ACCENT : 'var(--text-2)',
              textAlign: 'left',
              cursor: 'pointer',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 22 }}>🎲</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>랜덤 시나리오</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>매번 다른 사건이 펼쳐집니다</div>
            </div>
            {selectedCase === 'random' && <span style={{ marginLeft: 'auto', color: ACCENT }}>✓</span>}
          </button>

          {/* 개별 시나리오 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GHOST_CASES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: `2px solid ${selectedCase === c.id ? ACCENT : 'var(--line-2)'}`,
                  background: selectedCase === c.id ? `rgba(162,116,255,0.12)` : 'var(--surface)',
                  color: selectedCase === c.id ? ACCENT : 'var(--text-2)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                    {c.ghostName} · {c.ghostJob}
                  </div>
                </div>
                {selectedCase === c.id && <span style={{ marginLeft: 'auto', color: ACCENT }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 시작 */}
        <button
          onClick={start}
          className="arc-btn"
          style={{ background: ACCENT, fontSize: 18, boxShadow: `0 4px 0 0 rgba(100,50,200,0.5)` }}
        >
          👻 게임 시작
        </button>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          GHOST&apos;S FUNERAL · FIND THE CRIMINAL · 4–8 PLAYERS
        </p>
      </div>
    </div>
  );
}
