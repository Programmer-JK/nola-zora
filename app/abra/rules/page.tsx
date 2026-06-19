'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SPELLS, PLAYER_DOTS } from '@/lib/abra/game-logic';

const ACCENT = '#a274ff';

const STEPS = [
  {
    title: '아브라카왓에 온 걸 환영해요!',
    desc: '마법사들이 주문을 선언하며 서로를 공격합니다.\n숨겨진 타일을 추리하고 블러핑으로 상대를 속여\n라이벌을 쓰러뜨리거나 손패를 비우세요!',
  },
  {
    title: '타일 구성',
    desc: '풀에는 1~8번 타일이 있으며\n숫자가 클수록 더 많이 들어있어요.\n(1번: 1장, 8번: 8장 = 총 36장)\n각 플레이어는 5장씩 비밀리에 받습니다.',
  },
  {
    title: '내 차례: 숫자를 선언하세요',
    desc: '1~8 중 원하는 숫자를 선언합니다.\n그 타일을 실제로 갖고 있으면 성공,\n없으면 실패입니다. 상대방은 알 수 없어요!',
  },
  {
    title: '성공! — 주문 발동',
    desc: '선언한 타일이 있으면 성공!\n타일을 제거하고 해당 숫자의 주문이 발동합니다.\n그런 다음 같거나 낮은 숫자를 또 선언할 수 있어요.',
  },
  {
    title: '실패 — 체력 -1',
    desc: '선언한 타일이 없으면 실패!\n체력을 1 잃고 턴이 즉시 종료됩니다.\n블러핑이 들키지 않도록 조심하세요.',
  },
  {
    title: '콤보 시스템',
    desc: '성공 후에는 계속 선언할 수 있지만\n직전 숫자 이하의 숫자만 선언 가능합니다.\n7 → 5 → 2처럼 점점 낮아지는 콤보!',
  },
  {
    title: '8가지 주문',
    desc: '각 숫자마다 강력한 마법 효과가 있어요.\n전원 공격, 회복, 주사위, 인접 공격 등\n어떤 숫자를 언제 쓸지가 핵심 전략입니다.',
  },
  {
    title: '탈락 & 라운드 종료',
    desc: '체력이 0이 되면 탈락합니다.\n생존자가 1명 이하가 되거나\n누군가 손패를 모두 비우면 라운드 종료!',
  },
  {
    title: '점수 계산',
    desc: '생존: +1점\n손패 비우기: +3점\n천리안(4번 주문) 사용: +1점\n탈락자 수에 따른 생존자 보너스도 있어요!',
  },
  {
    title: '목표 점수에 먼저 도달하면 승리!',
    desc: '여러 라운드를 거쳐\n목표 점수에 가장 먼저 도달한 플레이어가\n최고의 마법사로 등극합니다!',
  },
];

function Visual({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="float" style={{ fontSize: 64, lineHeight: 1 }}>🔮</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {PLAYER_DOTS.map((dot, i) => (
              <div key={i} className="bounce-in" style={{
                animationDelay: `${200 + i * 80}ms`,
                width: 26, height: 26, borderRadius: '50%',
                background: dot, boxShadow: `0 0 10px ${dot}90`,
              }} />
            ))}
          </div>
          <div className="bounce-in" style={{ animationDelay: '720ms', display: 'flex', gap: 10, fontSize: 22 }}>
            <span>🔥</span><span>❄️</span><span>⚡</span><span>💚</span>
          </div>
        </div>
      );

    case 1:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {SPELLS.map((s, i) => (
              <div key={s.num} className="bounce-in" style={{
                animationDelay: `${i * 65}ms`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}>
                <div style={{
                  width: 34, height: 40, borderRadius: 8,
                  border: `1.5px solid ${s.color}`,
                  background: `color-mix(in srgb, ${s.color} 16%, transparent)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: s.color, lineHeight: 1 }}>{s.num}</span>
                  <span style={{ fontSize: 10 }}>{s.emoji}</span>
                </div>
                <span style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'var(--f-pix)' }}>×{s.num}</span>
              </div>
            ))}
          </div>
          <div className="bounce-in" style={{ animationDelay: '580ms', fontSize: 11, color: 'var(--dim)' }}>
            총 36장 — 숫자 클수록 더 많아요
          </div>
        </div>
      );

    case 2:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {[5, 6, 7].map((n, i) => {
              const s = SPELLS[n - 1];
              const sel = n === 6;
              return (
                <div key={n} className="bounce-in" style={{
                  animationDelay: `${i * 100}ms`,
                  width: 46, height: 54, borderRadius: 11,
                  border: `1.5px solid ${sel ? s.color : 'rgba(255,255,255,0.1)'}`,
                  background: sel
                    ? `color-mix(in srgb, ${s.color} 22%, rgba(0,0,0,.4))`
                    : 'rgba(0,0,0,.3)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  transform: sel ? 'translateY(-8px) scale(1.1)' : undefined,
                  boxShadow: sel ? `0 0 20px ${s.color}50` : undefined,
                }}>
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: sel ? s.color : 'var(--dim)', lineHeight: 1 }}>{n}</span>
                  <span style={{ fontSize: 14 }}>{s.emoji}</span>
                </div>
              );
            })}
          </div>
          <div className="bounce-in" style={{ animationDelay: '420ms', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🪄</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>6번 선언!</span>
          </div>
        </div>
      );

    case 3: {
      const sp = SPELLS[5]; // Ice Ball (6)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="bounce-in" style={{
            fontSize: 68, lineHeight: 1,
            filter: `drop-shadow(0 0 20px ${sp.color})`,
          }}>
            {sp.emoji}
          </div>
          <div className="bounce-in" style={{
            animationDelay: '180ms',
            fontFamily: 'var(--f-disp)', fontSize: 20, color: sp.color, letterSpacing: 1,
          }}>
            {sp.kr.toUpperCase()}
          </div>
          <div className="bounce-in" style={{
            animationDelay: '350ms',
            padding: '7px 14px', borderRadius: 12,
            background: `color-mix(in srgb, ${sp.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${sp.color} 40%, transparent)`,
            fontSize: 12, color: 'var(--text-2)',
          }}>
            {sp.effect}
          </div>
        </div>
      );
    }

    case 4:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="bounce-in" style={{ fontSize: 68, lineHeight: 1 }}>💨</div>
          <div className="bounce-in" style={{
            animationDelay: '220ms',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 14,
            background: 'rgba(255,90,77,.1)', border: '1.5px solid rgba(255,90,77,.35)',
          }}>
            <span style={{ fontSize: 18 }}>❤️</span>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 22, color: 'var(--red)' }}>-1</span>
          </div>
          <div className="bounce-in" style={{ animationDelay: '420ms', fontSize: 12, color: 'var(--faint)' }}>
            턴 즉시 종료
          </div>
        </div>
      );

    case 5: {
      const nums = [7, 5, 2];
      const items = nums.flatMap((n, i) => {
        const s = SPELLS[n - 1];
        const chip = (
          <div key={n} className="bounce-in" style={{
            animationDelay: `${i * 200}ms`,
            width: 44, height: 52, borderRadius: 10,
            border: `1.5px solid ${s.color}`,
            background: `color-mix(in srgb, ${s.color} 16%, transparent)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            boxShadow: `0 0 12px ${s.color}30`,
          }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 18, color: s.color, lineHeight: 1 }}>{n}</span>
            <span style={{ fontSize: 13 }}>{s.emoji}</span>
          </div>
        );
        if (i < nums.length - 1) {
          return [chip, <span key={`a${i}`} className="bounce-in" style={{ animationDelay: `${i * 200 + 120}ms`, fontSize: 15, color: 'var(--faint)' }}>→</span>];
        }
        return [chip];
      });
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{items}</div>
          <div className="bounce-in" style={{
            animationDelay: '680ms',
            padding: '7px 14px', borderRadius: 10,
            background: `rgba(162,116,255,.1)`, border: '1px solid rgba(162,116,255,.3)',
            fontSize: 12, color: ACCENT, fontWeight: 700,
          }}>
            ⚡ 이하 숫자만 선언 가능!
          </div>
        </div>
      );
    }

    case 6:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {SPELLS.map((s, i) => (
              <div key={s.num} className="bounce-in" style={{
                animationDelay: `${i * 55}ms`,
                borderRadius: 10, padding: '7px 4px',
                border: `1.5px solid ${s.color}`,
                background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 16, color: s.color, lineHeight: 1 }}>{s.num}</span>
                <span style={{ fontSize: 13 }}>{s.emoji}</span>
                <span style={{ fontSize: 8, color: s.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.kr}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 7:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="bounce-in" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} style={{ fontSize: 15, opacity: i > 2 ? 0.15 : 1, lineHeight: 1 }}>❤️</span>
            ))}
            <span style={{ margin: '0 4px', fontSize: 14, color: 'var(--faint)' }}>→</span>
            <span style={{ fontSize: 26 }}>💀</span>
          </div>
          <div className="bounce-in" style={{ animationDelay: '280ms', display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
            {[
              '생존자 1명 이하 → 라운드 종료',
              '누군가 손패 0장 → 라운드 종료',
            ].map((txt) => (
              <div key={txt} style={{
                padding: '8px 14px', borderRadius: 10, textAlign: 'center',
                background: 'rgba(162,116,255,.08)', border: '1px solid rgba(162,116,255,.28)',
                fontSize: 12, color: ACCENT,
              }}>
                {txt}
              </div>
            ))}
          </div>
        </div>
      );

    case 8: {
      const rows = [
        { icon: '❤️', label: '생존', pts: '+1' },
        { icon: '🃏', label: '손패 비우기', pts: '+3' },
        { icon: '👁', label: '천리안(4번) 사용', pts: '+1' },
        { icon: '💀', label: '탈락자 보너스 (생존자에게)', pts: '+α' },
      ];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
          {rows.map((r, i) => (
            <div key={r.label} className="bounce-in" style={{
              animationDelay: `${i * 100}ms`,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            }}>
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: 18, color: ACCENT }}>{r.pts}</span>
            </div>
          ))}
        </div>
      );
    }

    case 9:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="float" style={{ fontSize: 64 }}>🏆</span>
          <div className="bounce-in" style={{ animationDelay: '200ms', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: ACCENT }}>목표 점수</span>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 30, color: 'var(--coin)', textShadow: '0 0 18px rgba(255,216,77,.5)' }}>8</span>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: ACCENT }}>점 돌파!</span>
          </div>
          <div className="bounce-in" style={{ animationDelay: '400ms', display: 'flex', gap: 8 }}>
            {['🥇', '🥈', '🥉'].map((m, i) => (
              <div key={i} style={{
                width: 44, height: 44, borderRadius: '50%', fontSize: 22,
                background: `${PLAYER_DOTS[i]}20`,
                border: `1.5px solid ${PLAYER_DOTS[i]}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {m}
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function AbraRulesPage() {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <main
      style={{
        minHeight: '100svh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
        background: 'radial-gradient(120% 90% at 50% -10%, #130e1f 0%, #0c0a12 45%, #08080f 100%)',
      }}
    >
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: ACCENT, opacity: 0.5, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--f-pix)' }}>
          게임 규칙
        </p>
        <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 2, color: ACCENT, margin: 0, textShadow: `0 0 20px ${ACCENT}60` }}>
          ABRACA...WHAT?
        </h1>
      </div>

      {/* 카드 */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 24, padding: 24,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 60px rgba(0,0,0,.5)',
      }}>
        {/* 시각 요소 */}
        <div key={`v-${step}`} className="step-in" style={{
          minHeight: 172, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Visual step={step} />
        </div>

        {/* 텍스트 */}
        <div key={`t-${step}`} className="step-in" style={{ textAlign: 'center', marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            {STEPS[step].title}
          </h2>
          <p style={{ color: 'var(--dim)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* 진행 점 */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} style={{
              borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all .3s',
              width: i === step ? 18 : 7, height: 7,
              background: i === step ? ACCENT : i < step ? `${ACCENT}50` : 'rgba(255,255,255,.12)',
            }} />
          ))}
        </div>

        {/* 네비게이션 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isFirst && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 13,
              background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.45)',
              border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', transition: 'all .2s',
            }}>
              ← 이전
            </button>
          )}
          {isLast ? (
            <Link href="/abra" style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 900, fontSize: 13,
              background: `linear-gradient(135deg, ${ACCENT}, #6b3fd4)`,
              color: '#fff', textDecoration: 'none', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: `0 4px 20px ${ACCENT}40`,
            }}>
              게임 시작하기 🔮
            </Link>
          ) : (
            <button onClick={() => setStep(s => s + 1)} style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 900, fontSize: 13,
              background: `linear-gradient(135deg, ${ACCENT}, #6b3fd4)`,
              color: '#fff', border: 'none', cursor: 'pointer', transition: 'all .2s',
            }}>
              다음 →
            </button>
          )}
        </div>
      </div>

      {/* 건너뛰기 */}
      {!isLast && (
        <Link href="/abra" style={{ marginTop: 20, color: 'rgba(255,255,255,.18)', fontSize: 12, textDecoration: 'none' }}>
          건너뛰기
        </Link>
      )}
    </main>
  );
}
