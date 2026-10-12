'use client';

import Link from 'next/link';

const ACCENT = '#f59e0b';

export default function CursedAuctionRules() {
  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/cursed-auction" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 돌아가기</Link>
        </div>

        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 24px' }}>
          <div className="arc-float" style={{ fontSize: 52, lineHeight: 1 }}>🏺</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 26, letterSpacing: 1, margin: '10px 0 4px', color: ACCENT }}>
            CURSED AUCTION
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)' }}>저주받은 경매장</div>
          <p style={{ color: 'var(--dim)', fontSize: 12.5, marginTop: 8 }}>4~6인 · 6라운드 · 10~15분</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 목표 */}
          <div className="arc-panel arc-rise">
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>🎯 목표</div>
            <p style={{ color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.7 }}>
              6라운드가 끝났을 때 <strong>보물 점수 합계 + 남은 금화</strong>가 가장 높은 플레이어가 우승합니다.
            </p>
          </div>

          {/* 준비 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.04s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>⚙️ 게임 준비</div>
            <ul style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 2, paddingLeft: 18 }}>
              <li>4~6명이 참가합니다.</li>
              <li>각 플레이어는 <strong>금화 12개</strong>로 시작합니다.</li>
              <li>각 플레이어는 게임 전체에서 <strong>감정 1회</strong>를 사용할 수 있습니다.</li>
            </ul>
          </div>

          {/* 라운드 진행 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.08s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>🔄 라운드 진행 순서</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['1', '보물 3장 공개', '이름, 단서, 위험 등급이 공개됩니다. 실제 효과는 비공개.'],
                ['2', '토론 & 감정 (30초)', '자유롭게 대화하세요. 원하면 보물 하나를 비밀 감정할 수 있습니다.'],
                ['3', '비밀 입찰 (15초)', '보물 하나를 골라 금화 1~4개를 걸거나 포기합니다. 제출 전까지 타인의 선택은 모릅니다.'],
                ['4', '동시 공개', '모든 입찰이 한 번에 공개됩니다.'],
                ['5', '낙찰 & 점수 갱신', '최고 입찰자가 낙찰받고 금화를 지불합니다. 보물의 실제 효과가 공개됩니다.'],
              ].map(([num, title, desc]) => (
                <div key={num} style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: ACCENT,
                    color: '#000', fontWeight: 900, fontSize: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{num}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 낙찰 규칙 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.12s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>🔨 낙찰 규칙</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['🏆 한 명만 입찰', '해당 플레이어 낙찰'],
                ['🏆 최고 입찰이 유일', '최고 입찰자 낙찰, 금화 차감'],
                ['❌ 최고 입찰 동점', '낙찰 실패, 금화 유지'],
                ['❌ 아무도 입찰 안 함', '미낙찰 처리'],
                ['✅ 패찰', '금화 차감 없음'],
              ].map(([sit, res]) => (
                <div key={sit} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)',
                }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{sit}</span>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>{res}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 위험 등급 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.16s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>⚠️ 위험 등급</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['🟢', '낮음', '15% 저주', '안전 시 +2 또는 +3점', '저주 시 -3점'],
                ['🟡', '보통', '30% 저주', '안전 시 +3 또는 +5점', '저주 시 -3점'],
                ['🔴', '높음', '45% 저주', '안전 시 +5 또는 +6점', '저주 시 -4점'],
              ].map(([emoji, level, pct, safe, curse]) => (
                <div key={level} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)',
                }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>위험 {level} · {pct}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 2 }}>
                      {safe} &nbsp;|&nbsp; {curse}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 감정 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.20s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>🔍 감정 (1회 한정)</div>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7 }}>
              토론 단계에서 보물 하나를 선택해 <strong>실제 점수와 저주 여부를 본인만</strong> 확인합니다.
              감정 사실과 결과를 다른 플레이어에게 알릴지, 거짓으로 말할지는 자유입니다.
            </p>
          </div>

          {/* 최종 점수 */}
          <div className="arc-panel arc-rise" style={{ animationDelay: '.24s' }}>
            <div className="arc-lbl" style={{ color: ACCENT, marginBottom: 10 }}>🏅 최종 점수</div>
            <div style={{
              textAlign: 'center', padding: '16px 0', fontFamily: 'var(--f-title)',
              fontSize: 22, color: ACCENT,
            }}>
              최종 점수 = 보물 점수 합계 + 남은 금화
            </div>
            <p style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center' }}>
              동점 시 남은 금화가 더 많은 플레이어 우승. 그래도 같으면 공동 우승.
            </p>
          </div>

        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 28, lineHeight: 1.8 }}>
          CURSED AUCTION · TRUST NO ONE · BID WISELY
        </p>
      </div>
    </div>
  );
}
