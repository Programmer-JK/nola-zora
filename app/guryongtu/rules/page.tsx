'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT = '#ff3333';

const STEPS = [
  {
    title: '구룡투',
    desc: '1~9 숫자 타일로 싸우는 2인 전략 게임.\n9라운드 동안 타일을 하나씩 내어\n5라운드를 먼저 이기는 쪽이 승리합니다.',
  },
  {
    title: '타일 준비',
    desc: '각 플레이어는 1~9 숫자 타일 9개를 받습니다.\n홀수(1·3·5·7·9)는 흑(黑) 돌,\n짝수(2·4·6·8)는 백(白) 돌입니다.',
  },
  {
    title: '라운드 진행',
    desc: '① 공격자가 타일 1개를 뒷면으로 놓습니다.\n② 수비자도 타일 1개를 놓습니다.\n③ 두 타일을 동시에 공개합니다.',
  },
  {
    title: '승패 결정',
    desc: '숫자가 더 큰 타일을 낸 사람이 라운드 승리.\n같은 숫자면 무승부.\n\n⚡ 단, 1이 9를 이깁니다 — 용의 비밀무기!',
  },
  {
    title: '선 플레이어',
    desc: '1라운드는 랜덤으로 선 플레이어를 결정합니다.\n이후 라운드 승자가 다음 라운드의 공격자.\n무승부면 선 플레이어 유지.',
  },
  {
    title: '게임 종료',
    desc: '총 9라운드를 진행합니다.\n5라운드를 먼저 이기면 게임 즉시 종료.\n9라운드 후 더 많이 이긴 쪽이 승리.',
  },
  {
    title: '베스트 오브 3',
    desc: '게임이 끝나면 타일을 돌려받고 다시 시작.\n2게임을 먼저 이기는 사람이 최종 승자!',
  },
];

function Tile({ n, delay = 0 }: { n: number; delay?: number }) {
  const isOdd = n % 2 !== 0;
  return (
    <span
      className="bounce-in"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        background: isOdd ? '#1e1e3a' : '#c8c8dc',
        border: `2px solid ${isOdd ? (n === 1 ? '#ff333388' : '#334') : '#999aaa'}`,
        borderRadius: 5,
        fontFamily: 'var(--f-pix)', fontSize: 13,
        color: isOdd ? (n === 1 ? ACCENT : '#ccc') : '#111',
        animationDelay: `${delay}ms`,
        boxShadow: n === 1 ? `0 0 8px ${ACCENT}88` : undefined,
      }}
    >
      {n}
    </span>
  );
}

function Visual({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="bounce-in" style={{ fontSize: 64, lineHeight: 1, animationDelay: '0ms' }}>🐉</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 3, 5, 7, 9].map((n, i) => <Tile key={n} n={n} delay={200 + i * 60} />)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[2, 4, 6, 8].map((n, i) => <Tile key={n} n={n} delay={580 + i * 60} />)}
          </div>
          <span className="bounce-in pix" style={{ fontSize: 8, color: 'var(--faint)', letterSpacing: 2, animationDelay: '860ms' }}>
            2P · BEST OF 3 · 1 BEATS 9
          </span>
        </div>
      );

    case 1:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1, 3, 5, 7, 9].map((n, i) => <Tile key={n} n={n} delay={i * 80} />)}
            <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6, animationDelay: '450ms' }}>흑(黑)</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[2, 4, 6, 8].map((n, i) => <Tile key={n} n={n} delay={500 + i * 80} />)}
            <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6, animationDelay: '840ms' }}>백(白)</span>
          </div>
        </div>
      );

    case 2:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {/* 공격자 뒷면 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                className="bounce-in"
                style={{
                  width: 44, height: 56, borderRadius: 8,
                  background: '#1a1a2e', border: `2px solid ${ACCENT}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, animationDelay: '0ms',
                  boxShadow: `0 0 12px ${ACCENT}22`,
                }}
              >
                🐉
              </div>
              <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: `${ACCENT}99`, animationDelay: '80ms' }}>공격자</span>
            </div>
            <span className="bounce-in" style={{ fontSize: 20, color: 'rgba(255,255,255,0.2)', animationDelay: '300ms' }}>VS</span>
            {/* 수비자 뒷면 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                className="bounce-in"
                style={{
                  width: 44, height: 56, borderRadius: 8,
                  background: '#1e1e1e', border: '2px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, animationDelay: '200ms',
                }}
              >
                🐉
              </div>
              <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: 'rgba(255,255,255,0.3)', animationDelay: '280ms' }}>수비자</span>
            </div>
          </div>
          <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(255,255,255,0.35)', animationDelay: '500ms' }}>
            동시에 공개 ↓
          </span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <Tile n={7} delay={650} />
            <Tile n={3} delay={720} />
          </div>
        </div>
      );

    case 3:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {/* 일반 비교 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Tile n={7} delay={0} />
            <span className="bounce-in" style={{ fontFamily: 'var(--f-pix)', fontSize: 12, color: ACCENT, animationDelay: '150ms' }}>{'>'}</span>
            <Tile n={3} delay={200} />
            <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4, animationDelay: '350ms' }}>큰 숫자 승리</span>
          </div>
          {/* 특수 규칙 */}
          <div
            className="bounce-in"
            style={{
              background: `${ACCENT}11`, border: `1px solid ${ACCENT}44`,
              borderRadius: 8, padding: '10px 16px',
              display: 'flex', gap: 12, alignItems: 'center',
              animationDelay: '500ms',
            }}
          >
            <Tile n={1} delay={600} />
            <span className="pix" style={{ fontSize: 12, color: ACCENT }}>BEATS</span>
            <Tile n={9} delay={680} />
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: ACCENT, marginLeft: 2 }}>⚡</span>
          </div>
        </div>
      );

    case 4:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {[
            { label: '1라운드', note: '랜덤 결정', color: 'rgba(255,255,255,0.4)', delay: 0 },
            { label: '2라운드~', note: '승자가 선 플레이어', color: ACCENT, delay: 180 },
            { label: '무승부 시', note: '선 플레이어 유지', color: 'rgba(255,200,0,0.7)', delay: 360 },
          ].map(({ label, note, color, delay }) => (
            <div
              key={label}
              className="bounce-in"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                padding: '10px 16px', width: '100%', maxWidth: 260,
                animationDelay: `${delay}ms`,
              }}
            >
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(255,255,255,0.4)', width: 64, flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color, fontWeight: 700 }}>{note}</span>
            </div>
          ))}
        </div>
      );

    case 5:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r, i) => (
              <div
                key={r}
                className="bounce-in"
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: r <= 5 ? `${ACCENT}33` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${r <= 5 ? `${ACCENT}66` : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--f-pix)', fontSize: 9,
                  color: r <= 5 ? ACCENT : 'rgba(255,255,255,0.2)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {r}
              </div>
            ))}
          </div>
          <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: `${ACCENT}bb`, animationDelay: '780ms' }}>
            5라운드 선취 → 즉시 종료
          </span>
          <div
            className="bounce-in"
            style={{
              display: 'flex', gap: 8, alignItems: 'center',
              animationDelay: '950ms',
            }}
          >
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>OR</span>
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>9라운드 후 다승자 승리</span>
          </div>
        </div>
      );

    case 6:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="bounce-in" style={{ fontSize: 56, lineHeight: 1, animationDelay: '0ms' }}>🏆</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {[1, 2, 3].map((g, i) => (
              <div
                key={g}
                className="bounce-in"
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: g <= 2 ? `${ACCENT}22` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${g <= 2 ? `${ACCENT}55` : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--f-pix)', fontSize: 11,
                  color: g <= 2 ? ACCENT : 'rgba(255,255,255,0.2)',
                  animationDelay: `${200 + i * 120}ms`,
                }}
              >
                {g <= 2 ? '★' : g}
              </div>
            ))}
          </div>
          <span className="bounce-in" style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,0.35)', animationDelay: '600ms' }}>
            2게임 선취 = 최종 승리
          </span>
        </div>
      );

    default:
      return null;
  }
}

export default function GuryongtuRulesPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <main style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, #0f0a0a, #1a0a0a, #0a0a0f)',
      padding: '32px 16px',
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="pix" style={{ fontSize: 7, color: `${ACCENT}55`, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4 }}>
          게임 규칙
        </p>
        <h1 className="pix" style={{ fontSize: 14, letterSpacing: 3, color: ACCENT, textShadow: `0 0 16px ${ACCENT}88` }}>
          NINE DRAGONS DUEL
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
              onClick={() => router.push('/guryongtu')}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 900,
                background: `linear-gradient(135deg, ${ACCENT}, #ff6644)`,
                color: '#fff', boxShadow: `0 0 20px ${ACCENT}55`,
                transition: 'all 0.2s',
              }}
            >
              🐉 게임 시작하기
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
          onClick={() => router.push('/guryongtu')}
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
