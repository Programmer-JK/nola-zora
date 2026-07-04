'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT = '#e84242';

const STEPS = [
  {
    title: '라이어 게임',
    desc: '시민들 사이에 숨어든 라이어를 찾아라!\n모두가 단어를 설명하는 척하며\n라이어를 속이거나, 라이어를 찾아내세요.',
  },
  {
    title: '역할 배정',
    desc: '라운드 시작 시 카테고리가 정해집니다.\n시민은 카테고리의 단어를 봅니다.\n라이어는 카테고리만 알고 단어는 모릅니다!',
  },
  {
    title: '힌트 돌아가기',
    desc: '플레이어들이 순서대로 단어를 설명하는\n힌트를 하나씩 말합니다.\n라이어는 들키지 않으려 애씁니다!',
  },
  {
    title: '토론 & 투표',
    desc: '자유롭게 토론한 뒤\n"라이어가 누구인지" 투표합니다.\n가장 많은 표를 받은 사람이 라이어로 지목됩니다.',
  },
  {
    title: '라이어의 역전',
    desc: '라이어가 잡혔다면 단어를 맞힐 기회!\n맞히면 라이어 역전승 🎉\n틀리면 시민 팀 승리.',
  },
  {
    title: '점수',
    desc: '라이어 탈출 성공 또는 단어 맞히기 → 라이어 +2점\n시민이 라이어를 잡고 단어도 틀림 → 시민 전원 +1점',
  },
  {
    title: '⚡ 거짓 라이어 모드',
    desc: '일부 라운드에서 라이어가 없을 수 있어요.\n모든 플레이어가 같은 단어를 받습니다.\n"라이어 없음"에 투표해서 맞히면 전원 +1점!\n억울하게 지목된 사람은 +2점.',
  },
];

function PlayerBadge({ label, isLiar, delay = 0 }: { label: string; isLiar?: boolean; delay?: number }) {
  return (
    <div
      className="bounce-in"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: isLiar ? `${ACCENT}22` : 'rgba(255,255,255,0.07)',
        border: `1.5px solid ${isLiar ? `${ACCENT}88` : 'rgba(255,255,255,0.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        boxShadow: isLiar ? `0 0 10px ${ACCENT}44` : undefined,
      }}>
        {isLiar ? '🕵️' : '👤'}
      </div>
      <span style={{
        fontFamily: 'var(--f-kr)', fontSize: 9,
        color: isLiar ? ACCENT : 'rgba(255,255,255,0.3)',
      }}>
        {label}
      </span>
    </div>
  );
}

function Visual({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="bounce-in" style={{ fontSize: 60, lineHeight: 1 }}>🕵️</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {['시민', '시민', '라이어', '시민'].map((label, i) => (
              <PlayerBadge key={i} label={label} isLiar={label === '라이어'} delay={200 + i * 80} />
            ))}
          </div>
          <span className="bounce-in pix" style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, animationDelay: '620ms' }}>
            FIND THE LIAR
          </span>
        </div>
      );

    case 1:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* 카테고리 */}
          <div
            className="bounce-in"
            style={{
              padding: '8px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,0.6)',
              animationDelay: '0ms',
            }}
          >
            카테고리: <strong style={{ color: 'var(--text)' }}>과일</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* 시민 카드 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                className="bounce-in"
                style={{
                  width: 56, height: 72, borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--text)',
                  fontWeight: 700, animationDelay: '200ms',
                }}
              >
                딸기
              </div>
              <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: 'rgba(255,255,255,0.3)', animationDelay: '280ms' }}>시민</span>
            </div>
            {/* 라이어 카드 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                className="bounce-in"
                style={{
                  width: 56, height: 72, borderRadius: 10,
                  background: `${ACCENT}11`, border: `1.5px solid ${ACCENT}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, animationDelay: '400ms',
                  boxShadow: `0 0 12px ${ACCENT}22`,
                }}
              >
                ❓
              </div>
              <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: `${ACCENT}99`, animationDelay: '480ms' }}>라이어</span>
            </div>
          </div>
        </div>
      );

    case 2:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {[
            { name: '플레이어 1', hint: '"빨갛고 달콤해요"', delay: 0 },
            { name: '플레이어 2', hint: '"여름에 맛있죠"', delay: 180 },
            { name: '라이어', hint: '"음... 건강에 좋아요"', isLiar: true, delay: 360 },
            { name: '플레이어 4', hint: '"씨가 겉에 있어요"', delay: 540 },
          ].map(({ name, hint, isLiar, delay }) => (
            <div
              key={name}
              className="bounce-in"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isLiar ? `${ACCENT}0d` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isLiar ? `${ACCENT}33` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '8px 12px', width: '100%', maxWidth: 260,
                animationDelay: `${delay}ms`,
              }}
            >
              <span style={{ fontSize: 14 }}>{isLiar ? '🕵️' : '👤'}</span>
              <div>
                <div style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: isLiar ? ACCENT : 'rgba(255,255,255,0.3)' }}>{name}</div>
                <div style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: isLiar ? `${ACCENT}cc` : 'rgba(255,255,255,0.6)', marginTop: 1 }}>{hint}</div>
              </div>
            </div>
          ))}
        </div>
      );

    case 3:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { target: '플레이어 2', votes: 1, delay: 0 },
              { target: '라이어', votes: 3, isLiar: true, delay: 200 },
              { target: '플레이어 4', votes: 0, delay: 400 },
            ].map(({ target, votes, isLiar, delay }) => (
              <div
                key={target}
                className="bounce-in"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  animationDelay: `${delay}ms`,
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: isLiar ? `${ACCENT}22` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${isLiar ? `${ACCENT}77` : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {isLiar ? '🕵️' : '👤'}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: votes }).map((_, i) => (
                    <span key={i} style={{ fontSize: 12 }}>🗳️</span>
                  ))}
                  {votes === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </div>
                <span style={{ fontFamily: 'var(--f-kr)', fontSize: 9, color: isLiar ? ACCENT : 'rgba(255,255,255,0.3)' }}>{target}</span>
              </div>
            ))}
          </div>
          <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: `${ACCENT}aa`, animationDelay: '650ms' }}>
            라이어 지목!
          </span>
        </div>
      );

    case 4:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span className="bounce-in" style={{ fontSize: 40 }}>🕵️</span>
            <div>
              <div
                className="bounce-in"
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: `${ACCENT}11`, border: `1px solid ${ACCENT}44`,
                  fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--text)',
                  animationDelay: '200ms',
                }}
              >
                정답: <strong style={{ color: ACCENT }}>딸기</strong> ?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              className="bounce-in"
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(60,200,60,0.12)', border: '1px solid rgba(60,200,60,0.3)',
                fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(100,220,100,0.8)',
                animationDelay: '450ms',
              }}
            >
              ✓ 맞히면 역전승!
            </div>
            <div
              className="bounce-in"
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: `${ACCENT}0d`, border: `1px solid ${ACCENT}33`,
                fontFamily: 'var(--f-kr)', fontSize: 12, color: `${ACCENT}aa`,
                animationDelay: '600ms',
              }}
            >
              ✗ 틀리면 시민 승
            </div>
          </div>
        </div>
      );

    case 5:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {[
            { who: '🕵️ 라이어 승리', desc: '탈출 성공 or 단어 맞히기', score: '+2점', color: ACCENT, delay: 0 },
            { who: '👤 시민 승리', desc: '라이어 잡고 + 단어 틀림', score: '전원 +1점', color: 'rgba(100,200,255,0.8)', delay: 220 },
          ].map(({ who, desc, score, color, delay }) => (
            <div
              key={who}
              className="bounce-in"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 16px',
                width: '100%', maxWidth: 280, animationDelay: `${delay}ms`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color, fontWeight: 700 }}>{who}</div>
                <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{
                fontFamily: 'var(--f-pix)', fontSize: 13, color,
                textShadow: `0 0 8px ${color}`,
              }}>
                {score}
              </div>
            </div>
          ))}
        </div>
      );

    case 6:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['👤', '👤', '👤', '👤'].map((icon, i) => (
              <div
                key={i}
                className="bounce-in"
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, animationDelay: `${i * 100}ms`,
                }}
              >
                {icon}
              </div>
            ))}
          </div>
          <div
            className="bounce-in"
            style={{
              padding: '10px 18px', borderRadius: 10,
              background: `${ACCENT}11`, border: `1px solid ${ACCENT}33`,
              fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,0.5)',
              textAlign: 'center', lineHeight: 1.7, maxWidth: 260,
              animationDelay: '450ms',
            }}
          >
            라이어가 없을 수도 있어요!<br />
            <span style={{ color: ACCENT, fontWeight: 700 }}>"라이어 없음"</span>에 투표하세요
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function LiarRulesPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, #0f0a0a, #1a0808, #0a0a0a)',
      padding: '32px 16px',
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="pix" style={{ fontSize: 7, color: `${ACCENT}55`, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4 }}>
          게임 규칙
        </p>
        <h1 className="pix" style={{ fontSize: 14, letterSpacing: 3, color: ACCENT, textShadow: `0 0 16px ${ACCENT}88` }}>
          LIAR GAME
        </h1>
      </div>

      {/* 카드 */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: 24,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 0 40px ${ACCENT}11`,
      }}>
        {/* 시각 요소 */}
        <div
          key={`v-${step}`}
          className="step-in"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 176, marginBottom: 20 }}
        >
          <Visual step={step} />
        </div>

        {/* 텍스트 */}
        <div key={`t-${step}`} className="step-in" style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)',
            marginBottom: 10, letterSpacing: 1,
          }}>
            {STEPS[step].title}
          </h2>
          <p style={{
            fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.8, whiteSpace: 'pre-line',
          }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* 진행 점 */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                borderRadius: 9999, border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s',
                width: i === step ? 20 : 8, height: 8,
                background: i === step ? ACCENT : i < step ? `${ACCENT}55` : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* 네비게이션 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 700,
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s',
              }}
            >
              ← 이전
            </button>
          )}
          {isLast ? (
            <button
              onClick={() => router.push('/liar')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 900,
                background: `linear-gradient(135deg, ${ACCENT}, #ff6644)`,
                color: '#fff', boxShadow: `0 0 20px ${ACCENT}55`,
                transition: 'all 0.2s',
              }}
            >
              🕵️ 게임 시작하기
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 900,
                background: `linear-gradient(135deg, ${ACCENT}cc, #ff664499)`,
                color: '#fff',
                transition: 'all 0.2s',
              }}
            >
              다음 →
            </button>
          )}
        </div>
      </div>

      {/* 건너뛰기 */}
      {!isLast && (
        <button
          onClick={() => router.push('/liar')}
          style={{
            marginTop: 20, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(255,255,255,0.2)',
            transition: 'color 0.2s',
          }}
        >
          건너뛰기
        </button>
      )}
    </main>
  );
}
