'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCENT = '#a274ff';

const STEPS = [
  {
    emoji: '👻',
    title: '유령의 장례식',
    desc: '누군가가 죽었다. 그리고 범인은 이 자리에 있다.\n탐정들은 단서를 모아 범인을 찾아야 하고,\n범인은 탐정인 척 위장해 살아남아야 한다.',
  },
  {
    emoji: '🎭',
    title: '역할 배정',
    desc: '한 명만 범인, 나머지는 탐정.\n범인은 사건의 전말을 알고 있다.\n탐정들은 각자 하나의 단서만 받는다.',
  },
  {
    emoji: '🃏',
    title: '3라운드 사건 카드',
    desc: '라운드마다 새로운 사건 카드가 공개된다.\n각 라운드마다 자유롭게 진술하고 토론한다.\n범인은 자신의 정보를 탐정인 척 활용한다.',
  },
  {
    emoji: '🗣️',
    title: '진술 단계',
    desc: '탐정은 자신의 단서를 자연스럽게 녹여 진술한다.\n범인은 탐정 흉내를 내며 다른 사람에게 의심을 돌린다.\n직접 단서를 읽으면 오히려 티가 난다.',
  },
  {
    emoji: '⚖️',
    title: '비밀 투표',
    desc: '3라운드 토론 후 비밀 투표를 진행한다.\n각자 기기를 받아 의심되는 한 명을 지목한다.\n자신에게는 투표할 수 없다.',
  },
  {
    emoji: '🏆',
    title: '승패 결정',
    desc: '최다 득표자가 범인이면 → 탐정 팀 승리!\n동률이거나 범인이 아니면 → 범인 탈출 성공!\n범인은 진짜 범인처럼, 탐정은 형사처럼 임해야 한다.',
  },
];

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  return (
    <div
      className="arc-panel arc-rise"
      style={{ padding: 16, animationDelay: `${index * 0.06}s` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `rgba(162,116,255,0.12)`, border: `1px solid ${ACCENT}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {step.emoji}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{step.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{step.desc}</div>
        </div>
      </div>
    </div>
  );
}

export default function GhostFuneralRules() {
  const router = useRouter();

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0 8px' }}>
          <button onClick={() => router.back()} className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 뒤로
          </button>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
          <div style={{ fontSize: 48 }}>📖</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 1,
            margin: '8px 0 2px', color: ACCENT,
          }}>
            HOW TO PLAY
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text-2)' }}>
            유령의 장례식 규칙
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>

        {/* 전략 팁 */}
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 16,
          background: `rgba(162,116,255,0.08)`, border: `1px solid ${ACCENT}33`,
        }}>
          <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 1, marginBottom: 8 }}>TIPS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['💀 범인', '단서를 모른다고 어색하게 굴지 마세요. 다른 사람의 단서를 귀담아 듣고 자연스럽게 합류하세요.'],
              ['🔍 탐정', '단서를 직접 언급하되, 지나치게 구체적으로 말하지 마세요. 범인도 단서를 다 알고 있습니다.'],
              ['🎯 포인트', '단서가 없는 것처럼 행동하거나 단서를 너무 잘 아는 척하는 것 모두 의심을 살 수 있습니다.'],
            ].map(([role, tip]) => (
              <div key={role} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>{role}: </strong>{tip}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push('/ghost-funeral')}
          className="arc-btn"
          style={{ marginTop: 16, background: ACCENT, fontSize: 15, boxShadow: `0 4px 0 0 rgba(100,50,200,0.5)` }}
        >
          👻 게임 시작하기
        </button>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          GHOST&apos;S FUNERAL · 4–8 PLAYERS · 10–15 MIN
        </p>
      </div>
    </div>
  );
}
