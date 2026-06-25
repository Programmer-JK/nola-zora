'use client';

import Link from 'next/link';

const ACCENT = '#e84242';

export default function LiarRules() {
  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen">
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0 8px' }}>
          <Link href="/liar" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 뒤로</Link>
        </div>

        <div style={{ textAlign: 'center', margin: '12px 0 24px' }}>
          <div style={{ fontSize: 48 }}>🕵️</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 26, color: ACCENT, margin: '8px 0 2px', letterSpacing: 1 }}>
            LIAR GAME
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18 }}>게임 방법</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              step: '1', title: '역할 배정',
              desc: '라운드 시작 시 카테고리(예: "과일")가 정해집니다. 한 명의 라이어를 제외한 모든 플레이어는 해당 카테고리의 단어(예: "딸기")를 봅니다. 라이어는 카테고리만 알고 단어는 모릅니다.',
            },
            {
              step: '2', title: '힌트 돌아가기',
              desc: '플레이어들은 순서대로 단어를 설명하는 힌트를 하나씩 말합니다. 라이어는 들키지 않으려고 적당히 맞추려 노력합니다!',
            },
            {
              step: '3', title: '투표',
              desc: '자유롭게 토론한 뒤 "라이어가 누구인지" 투표합니다. 가장 많은 표를 받은 사람이 라이어로 지목됩니다.',
            },
            {
              step: '4', title: '라이어 최후의 역전',
              desc: '라이어가 잡혔다면 단어를 맞힐 기회가 주어집니다. 맞히면 라이어 팀 역전승! 틀리면 시민 팀 승리.',
            },
            {
              step: '점수', title: '점수',
              desc: '라이어 승: 라이어 +2점 / 시민 승: 시민 전원 +1점',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="arc-panel" style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: ACCENT, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--f-disp)', fontSize: 13, color: '#fff',
              }}>
                {step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text)' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}

          <div className="arc-panel" style={{ padding: '14px 16px', borderColor: 'rgba(232,66,66,0.4)', background: 'rgba(232,66,66,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: ACCENT, marginBottom: 6 }}>⚡ 거짓 라이어 모드</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              일부 라운드에서 라이어가 없을 수 있어요. 모든 플레이어가 같은 단어를 받습니다.
              &quot;라이어 없음&quot;에 투표해서 맞히면 전원 +1점! 억울하게 지목된 사람이 있다면 그 사람이 +2점을 얻어요.
            </div>
          </div>

          {/* 로컬 모드 안내 */}
          <div className="arc-panel" style={{ padding: '14px 16px', borderColor: 'rgba(255,183,43,0.35)', background: 'rgba(255,183,43,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold)', marginBottom: 6 }}>📱 로컬 플레이 (폰 돌려보기)</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              한 사람의 폰으로 플레이합니다. 순서대로 폰을 넘겨 자신의 역할을 확인하세요.
              다른 사람에게 보이지 않게 주의! 확인 후 반드시 &quot;가리기&quot; 버튼을 눌러 넘기세요.
            </div>
          </div>
        </div>

        <Link href="/liar" style={{ display: 'block', marginTop: 20 }}>
          <button className="arc-btn" style={{ background: ACCENT, width: '100%', fontSize: 17 }}>
            게임 시작하러 가기
          </button>
        </Link>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 20, lineHeight: 1.8 }}>
          LIAR GAME · BLUFF &amp; DECEIVE
        </p>
      </div>
    </div>
  );
}
