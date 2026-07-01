'use client';

import { useRouter } from 'next/navigation';

const ACCENT = '#ff3333';

export default function GuryongtuRulesPage() {
  const router = useRouter();

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ paddingTop: 20, paddingBottom: 32 }}>

        {/* 타이틀 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🐉</div>
          <div className="pix" style={{
            fontSize: 16, letterSpacing: 3, color: ACCENT,
            textShadow: `0 0 16px ${ACCENT}88`,
          }}>
            구룡투 규칙
          </div>
          <div className="pix" style={{ fontSize: 7, color: 'var(--dim)', marginTop: 4 }}>
            NINE DRAGONS DUEL — RULES
          </div>
        </div>

        {/* 규칙 섹션들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <RuleSection icon="🎴" title="게임 준비">
            각 플레이어는 <Em>1~9 숫자 타일 9개</Em>를 받습니다.<br />
            타일은 상대에게 보이지 않게 세팅합니다.
          </RuleSection>

          <RuleSection icon="⚔️" title="라운드 진행">
            <b>① 공격자</b> — 램프가 켜진 플레이어가 먼저 타일 1개를 <Em>뒷면으로</Em> 놓습니다.<br />
            <b>② 수비자</b> — 공격자가 놓으면, 상대방도 타일 1개를 놓습니다.<br />
            <b>③ 공개</b> — 두 타일을 동시에 공개합니다.
          </RuleSection>

          <RuleSection icon="🏆" title="승패 결정">
            <Em>숫자가 더 큰 타일</Em>을 낸 사람이 라운드 승리.<br />
            같은 숫자면 <Em>무승부</Em>.<br /><br />
            <div style={{
              background: `${ACCENT}11`, border: `1px solid ${ACCENT}44`,
              borderRadius: 6, padding: '10px 12px', marginTop: 4,
            }}>
              <div className="pix" style={{ fontSize: 9, color: ACCENT, marginBottom: 4 }}>
                ⚡ 특수 규칙
              </div>
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13 }}>
                <Em>1이 9를 이깁니다!</Em> 용의 비밀무기.
              </span>
            </div>
          </RuleSection>

          <RuleSection icon="🔄" title="다음 라운드">
            라운드 <Em>승자가 다음 라운드의 공격자</Em>가 됩니다.<br />
            무승부면 <Em>공격자 유지</Em>.<br />
            사용한 타일은 다시 쓸 수 없습니다.
          </RuleSection>

          <RuleSection icon="🎮" title="게임 종료">
            총 <Em>9라운드</Em>를 진행합니다.<br />
            <Em>5라운드를 먼저 이기면</Em> 게임 즉시 종료.<br />
            9라운드 후 더 많이 이긴 플레이어가 게임 승리.
          </RuleSection>

          <RuleSection icon="🥇" title="최종 승리 (베스트 오브 3)">
            게임이 끝나면 타일을 모두 돌려받고 다시 시작.<br />
            <Em>2게임을 먼저 이기는 사람</Em>이 최종 승자입니다!
          </RuleSection>

          {/* 예시 */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '14px 14px',
          }}>
            <div className="pix" style={{ fontSize: 8, color: 'var(--gold)', marginBottom: 10 }}>
              📖 예시
            </div>
            <div style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--dim)', lineHeight: 1.8 }}>
              <p><b style={{ color: 'var(--text-2)' }}>1라운드</b>: 지훈(공격) <TileEx n={7} /> vs 수진 <TileEx n={2} /> → 지훈 승리</p>
              <p><b style={{ color: 'var(--text-2)' }}>2라운드</b>: 지훈(공격) <TileEx n={9} /> vs 수진 <TileEx n={1} /> → 수진 승리!</p>
              <p style={{ color: ACCENT, fontWeight: 700, marginTop: 6 }}>
                💡 1은 9를 이깁니다 — 용의 비밀무기!
              </p>
            </div>
          </div>

          {/* 전략 팁 */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '14px 14px',
          }}>
            <div className="pix" style={{ fontSize: 8, color: 'var(--cyan)', marginBottom: 10 }}>
              💡 전략 팁
            </div>
            <ul style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--dim)', lineHeight: 2, paddingLeft: 16, margin: 0 }}>
              <li>상대의 남은 타일을 기억하세요</li>
              <li><b style={{ color: ACCENT }}>1</b>은 9에게만 쓰세요. 타이밍이 생명!</li>
              <li>공격자가 유리 — 라운드 승리를 이어가세요</li>
              <li>9라운드를 계산하며 타일을 아끼세요</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          <button
            onClick={() => router.push('/guryongtu')}
            className="arc-btn"
            style={{ background: ACCENT, borderColor: ACCENT, color: '#fff', fontSize: 15 }}
          >
            🐉 게임 시작
          </button>
          <button
            onClick={() => router.push('/lobby')}
            className="arc-btn-ghost"
            style={{ fontSize: 13 }}
          >
            ← 로비로
          </button>
        </div>
      </div>
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: 'var(--text)', fontFamily: 'var(--f-kr)' }}>{children}</strong>
  );
}

function TileEx({ n }: { n: number }) {
  return (
    <span className="pix" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, background: '#1e1e3a', border: '1.5px solid #334',
      borderRadius: 3, fontSize: 9, color: n === 1 ? '#ff3333' : '#ccc',
      verticalAlign: 'middle', margin: '0 2px',
    }}>
      {n}
    </span>
  );
}

function RuleSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span className="pix" style={{ fontSize: 9, color: 'var(--gold)' }}>{title}</span>
      </div>
      <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--dim)', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
