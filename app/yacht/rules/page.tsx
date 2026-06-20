'use client';

import { useRouter } from 'next/navigation';

const CATS = [
  { emoji: '1️⃣', name: '1 (Aces)',       desc: '나온 눈 1의 합' },
  { emoji: '2️⃣', name: '2 (Twos)',        desc: '나온 눈 2의 합' },
  { emoji: '3️⃣', name: '3 (Threes)',      desc: '나온 눈 3의 합' },
  { emoji: '4️⃣', name: '4 (Fours)',       desc: '나온 눈 4의 합' },
  { emoji: '5️⃣', name: '5 (Fives)',       desc: '나온 눈 5의 합' },
  { emoji: '6️⃣', name: '6 (Sixes)',       desc: '나온 눈 6의 합' },
  { emoji: '⭐', name: '초이스',            desc: '주사위 5개 총합' },
  { emoji: '4️⃣', name: '포 카드',          desc: '같은 눈 4개 이상 → 그 4개의 합' },
  { emoji: '🏠', name: '풀 하우스',         desc: '3개 + 2개 → 5개 총합' },
  { emoji: '📏', name: 'S. 스트레이트',     desc: '1-2-3-4-5 → 30점 고정' },
  { emoji: '📏', name: 'B. 스트레이트',     desc: '2-3-4-5-6 → 30점 고정' },
  { emoji: '⛵', name: '요트 (YACHT)',      desc: '같은 눈 5개 → 50점 고정' },
];

const ACCENT = 'var(--green)';

export default function YachtRulesPage() {
  const router = useRouter();

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0 8px' }}>
          <button className="arc-btn-ghost" onClick={() => router.back()} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 뒤로
          </button>
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', margin: '8px 0 22px' }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>⛵</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 32, letterSpacing: 1, margin: '8px 0 2px', color: ACCENT }}>
            YACHT
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)' }}>게임 방법</div>
        </div>

        {/* Basic rules */}
        <div className="arc-panel ticks" style={{ padding: 20, marginBottom: 16 }}>
          <span className="arc-lbl" style={{ color: ACCENT }}>기본 규칙</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {[
              { icon: '🎲', text: '주사위 5개를 굴립니다.' },
              { icon: '🔁', text: '한 턴에 최대 3번 굴릴 수 있습니다.' },
              { icon: '🤚', text: '굴린 후, 남길 주사위를 탭해 HOLD 고정합니다.' },
              { icon: '📝', text: '3번 굴린 후 (또는 원할 때) 점수표에서 족보를 선택합니다.' },
              { icon: '❌', text: '한 번 기록한 족보는 변경할 수 없습니다.' },
              { icon: '🗑️', text: '점수가 0이어도 원하는 칸에 버릴 수 있습니다.' },
              { icon: '🏆', text: '12칸을 모두 채우면 합산 — 최고점 플레이어가 승리!' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score categories */}
        <div className="arc-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--line)' }}>
            <span className="arc-lbl" style={{ color: ACCENT }}>족보 12가지</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '4px 16px 8px', fontFamily: 'var(--f-pix)', fontSize: 6.5, letterSpacing: 1, color: 'var(--dim)' }}>
              ▲ 상단 — 같은 눈의 합
            </div>
            {CATS.slice(0, 6).map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                borderBottom: '1px solid var(--line)',
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{c.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{c.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '8px 16px 4px', fontFamily: 'var(--f-pix)', fontSize: 6.5, letterSpacing: 1, color: 'var(--dim)', borderTop: '1px solid var(--line)' }}>
              ▼ 하단 — 족보
            </div>
            {CATS.slice(6).map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                borderBottom: i < CATS.slice(6).length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{c.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="arc-btn"
          onClick={() => router.push('/yacht')}
          style={{ fontSize: 18, background: 'var(--green)', color: '#06230a', borderColor: 'var(--green)', marginBottom: 24 }}
        >
          게임 시작 ⛵
        </button>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginBottom: 24, lineHeight: 1.8 }}>
          ROLL · HOLD · SCORE · WIN
        </p>
      </div>
    </div>
  );
}
