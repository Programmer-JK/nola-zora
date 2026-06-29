'use client'

import Link from 'next/link'

const ACCENT = '#f97316'

const RULES = [
  {
    step: '01',
    title: '방 입장',
    desc: '방을 만들거나 방 코드로 참가합니다. 최대 8명까지 참가 가능합니다.',
  },
  {
    step: '02',
    title: '단어 선정',
    desc: '채팅으로 협의한 뒤, 다른 플레이어의 이마에 붙일 단어를 선정 버튼으로 확정합니다. 모든 플레이어의 단어가 선정되면 게임을 시작할 수 있습니다.',
  },
  {
    step: '03',
    title: '게임 플레이',
    desc: '내 이마의 단어는 보이지 않습니다! 채팅으로 다른 플레이어에게 예/아니오로 답할 수 있는 질문을 하며 내 단어를 추리하세요.',
  },
  {
    step: '04',
    title: '정답 제출',
    desc: '정답을 알 것 같으면 정답 칸에 입력하고 제출하세요. 대소문자는 구분하지 않습니다.',
  },
]

const PENALTIES = [
  { attempt: '1회 오답', penalty: '페널티 없음', color: 'var(--green)' },
  { attempt: '2회 오답', penalty: '10초 대기', color: 'var(--gold)' },
  { attempt: '3회 오답', penalty: '10초 대기', color: 'var(--gold)' },
  { attempt: '4회 오답', penalty: '30초 대기', color: ACCENT },
  { attempt: '5회 오답', penalty: '1분 대기', color: 'var(--red)' },
  { attempt: '6회+ 오답', penalty: '2분 대기', color: 'var(--red)' },
]

export default function WhoAmIRules() {
  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/who-am-i" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 뒤로</Link>
        </div>

        <div className="arc-pop" style={{ textAlign: 'center', margin: '8px 0 20px' }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>🤔</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 1, margin: '8px 0 2px', color: ACCENT }}>
            WHO AM I?
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text)' }}>나는 누구? — 규칙</div>
        </div>

        {/* 게임 흐름 */}
        <div style={{ marginBottom: 20 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 12, color: ACCENT }}>게임 흐름</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RULES.map(r => (
              <div
                key={r.step}
                className="arc-panel-inset"
                style={{ display: 'flex', gap: 14, padding: '12px 14px', alignItems: 'flex-start' }}
              >
                <div style={{
                  fontFamily: 'var(--f-pix)', fontSize: 11, color: ACCENT,
                  background: `${ACCENT}1a`, borderRadius: 8,
                  padding: '4px 8px', flexShrink: 0, lineHeight: 1.5,
                }}>
                  {r.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 페널티 표 */}
        <div style={{ marginBottom: 20 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 12, color: ACCENT }}>오답 페널티</span>
          <div className="arc-panel" style={{ padding: '4px 0', overflow: 'hidden' }}>
            {PENALTIES.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < PENALTIES.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--dim)' }}>{row.attempt}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: row.color }}>{row.penalty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 팁 */}
        <div className="arc-panel" style={{ padding: '14px', marginBottom: 20 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10, color: ACCENT }}>팁</span>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '예/아니오로 답할 수 있는 질문이 가장 효과적입니다.',
              '다른 플레이어의 단어를 참고해 카테고리를 좁혀가세요.',
              '채팅으로 힌트를 요청할 수도 있습니다 (선택 사항).',
              '정답은 대소문자를 구분하지 않습니다.',
              '단어 선정 단계에서는 채팅에 단어를 직접 쓰지 마세요 — 해당 플레이어도 채팅을 볼 수 있습니다.',
            ].map((tip, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5 }}>{tip}</li>
            ))}
          </ul>
        </div>

        <Link
          href="/who-am-i"
          className="arc-btn"
          style={{ background: ACCENT, display: 'block', textAlign: 'center', textDecoration: 'none' }}
        >
          게임 시작하기
        </Link>

        <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
          WHO AM I? · 2–8인 · PARTY GAME
        </p>

      </div>
    </div>
  )
}
