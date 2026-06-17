'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ARTISTS, AUCTION_TYPE_ICONS, AUCTION_TYPE_LABELS, AUCTION_TYPE_COLORS } from '@/lib/modern-art/game-data';

const STEPS = [
  {
    title: '모던 아트에 온 걸 환영해요!',
    desc: '5명의 서브컬처 작가 작품을 경매로 사고팔아\n현금과 작품 가치의 합이 가장 높은 플레이어가 승리합니다.',
  },
  {
    title: '카드를 경매에 올려요',
    desc: '내 차례가 되면 손패에서 카드 1장을 골라 경매에 올립니다.\n더블 카드는 같은 작가의 카드 2장을 함께 올립니다.',
  },
  {
    title: '📣 공개 경매',
    desc: '시계 방향으로 돌아가며 입찰합니다.\n더 높은 금액을 부르거나 패스할 수 있어요.\n마지막까지 남은 한 명이 낙찰됩니다.',
  },
  {
    title: '🏷️ 지정가 경매',
    desc: '판매자가 가격을 먼저 정합니다.\n다른 플레이어가 순서대로 수락 또는 거절해요.\n모두 거절하면 판매자가 그 가격에 직접 구매합니다.',
  },
  {
    title: '🤫 비밀 경매',
    desc: '모든 플레이어가 동시에 금액을 비밀 입찰합니다.\n공개 후 가장 높은 금액을 부른 플레이어가 낙찰!\n동점이면 판매자에 가까운 순서로 결정됩니다.',
  },
  {
    title: '🔄 한 바퀴 경매',
    desc: '판매자 다음 플레이어부터 딱 한 번씩만 입찰 기회가 주어집니다.\n판매자는 마지막에 모든 입찰을 이기거나\n아무도 안 사면 공짜로 가져갈 수 있어요.',
  },
  {
    title: '🎴 더블 경매',
    desc: '같은 작가 카드 2장을 동시에 경매에 올립니다.\n경매 방식은 2번째 카드의 타입을 따릅니다.\n낙찰자는 2장 모두 획득합니다.',
  },
  {
    title: '5장이 나오면 라운드 종료!',
    desc: '한 작가의 카드가 이번 라운드에 5장 이상 등장하면\n경매 없이 즉시 라운드가 끝납니다.',
  },
  {
    title: '작품 가치가 올라가요',
    desc: '라운드 종료 시 가장 많이 팔린 작가 TOP 3의\n작품 가치가 올라갑니다. 가치는 매 라운드 누적돼요!',
  },
  {
    title: '4라운드 후 최고 부자 승리!',
    desc: '총 4라운드가 끝나면 보유 작품의 가치가 현금으로 환산됩니다.\n현금 + 작품 가치 합산 최다 보유자가 승리!',
  },
];

// 경매 타입 배경 비주얼
function AuctionVisual({ type, color }: { type: string; color: string }) {
  if (type === 'open') {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="flex items-end justify-center gap-3">
          {[
            { label: 'A', bid: '10만', delay: 0 },
            { label: 'B', bid: '20만', delay: 100 },
            { label: 'C', bid: '30만', delay: 200, winner: true },
          ].map((p) => (
            <div key={p.label} className="bounce-in flex flex-col items-center gap-1.5" style={{ animationDelay: `${p.delay}ms` }}>
              <div
                style={{
                  padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                  background: p.winner ? color + '30' : 'var(--surface-2)',
                  color: p.winner ? color : 'var(--dim)',
                  border: `1.5px solid ${p.winner ? color : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: p.winner ? `0 0 12px ${color}40` : undefined,
                }}
              >
                {p.bid}
              </div>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: p.winner ? color + '20' : 'var(--surface-3)',
                  border: `1.5px solid ${p.winner ? color + '80' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: p.winner ? color : 'var(--dim)',
                }}
              >
                {p.label}
              </div>
            </div>
          ))}
        </div>
        <div className="bounce-in flex items-center gap-1.5" style={{ animationDelay: '380ms' }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-kr)' }}>C 낙찰!</span>
        </div>
      </div>
    );
  }
  if (type === 'fixed') {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="bounce-in flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: color + '20', border: `1.5px solid ${color}60` }}>
          <span style={{ fontSize: 16 }}>🏷️</span>
          <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'var(--f-title)' }}>25만원</span>
          <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--f-kr)' }}>판매자 지정</span>
        </div>
        <div className="flex gap-2">
          {[
            { label: 'A', action: '거절', delay: 150, no: true },
            { label: 'B', action: '수락!', delay: 280, no: false },
          ].map((p) => (
            <div key={p.label} className="bounce-in flex flex-col items-center gap-1.5" style={{ animationDelay: `${p.delay}ms` }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--surface-3)', border: '1.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--dim)',
                }}
              >
                {p.label}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.no ? 'var(--red)' : color, fontFamily: 'var(--f-kr)' }}>
                {p.action}
              </span>
            </div>
          ))}
        </div>
        <div className="bounce-in flex items-center gap-1.5" style={{ animationDelay: '450ms' }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-kr)' }}>B 낙찰!</span>
        </div>
      </div>
    );
  }
  if (type === 'secret') {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="flex gap-3 justify-center">
          {['A', 'B', 'C'].map((l, i) => (
            <div key={l} className="bounce-in flex flex-col items-center gap-1.5" style={{ animationDelay: `${i * 100}ms` }}>
              <div style={{
                width: 40, height: 28, borderRadius: 8,
                background: 'var(--surface-2)', border: '1.5px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>✉️</div>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--f-kr)' }}>{l}</span>
            </div>
          ))}
        </div>
        <div className="bounce-in flex gap-3" style={{ animationDelay: '380ms' }}>
          {[
            { label: 'A', bid: '15만', winner: false },
            { label: 'B', bid: '8만', winner: false },
            { label: 'C', bid: '22만', winner: true },
          ].map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1">
              <div style={{
                padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                background: p.winner ? color + '30' : 'var(--surface-3)',
                color: p.winner ? color : 'var(--dim)',
                border: `1px solid ${p.winner ? color : 'rgba(255,255,255,0.1)'}`,
              }}>{p.bid}</div>
              <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--f-kr)' }}>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="bounce-in flex items-center gap-1.5" style={{ animationDelay: '550ms' }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-kr)' }}>C 낙찰!</span>
        </div>
      </div>
    );
  }
  if (type === 'once-around') {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div className="flex gap-2 justify-center">
          {[
            { label: 'A', bid: '패스', delay: 0, skip: true },
            { label: 'B', bid: '18만', delay: 120, winner: true },
            { label: 'C', bid: '10만', delay: 240, skip: false },
            { label: '판매자', bid: '포기', delay: 360, seller: true },
          ].map((p) => (
            <div key={p.label} className="bounce-in flex flex-col items-center gap-1" style={{ animationDelay: `${p.delay}ms` }}>
              <div style={{
                width: p.label === '판매자' ? 38 : 32, height: 32, borderRadius: '50%',
                background: p.winner ? color + '20' : 'var(--surface-3)',
                border: `1.5px solid ${p.winner ? color + '80' : p.seller ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: p.label === '판매자' ? 8 : 11, fontWeight: 700,
                color: p.winner ? color : 'var(--dim)', fontFamily: 'var(--f-kr)',
              }}>{p.label}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: p.winner ? color : p.skip || p.seller ? 'var(--faint)' : 'var(--dim)', fontFamily: 'var(--f-kr)' }}>
                {p.bid}
              </span>
            </div>
          ))}
        </div>
        <div className="bounce-in flex items-center gap-1.5" style={{ animationDelay: '520ms' }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-kr)' }}>B 낙찰!</span>
        </div>
      </div>
    );
  }
  if (type === 'double') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 bounce-in">
          <div style={{ position: 'relative', width: 50, height: 66 }}>
            {[1, 0].map((offset) => (
              <div key={offset} style={{
                position: 'absolute', top: offset * 6, left: offset * 6,
                width: 44, height: 60, borderRadius: 10,
                background: color + '28', border: `1.5px solid ${color}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>🎴</div>
            ))}
          </div>
          <span style={{ fontSize: 22, color: 'var(--faint)' }}>→</span>
          <div className="flex flex-col items-center gap-1">
            <div style={{
              padding: '6px 14px', borderRadius: 12, fontSize: 12, fontWeight: 800,
              background: color + '20', color, border: `1.5px solid ${color}60`,
            }}>2장 동시 경매</div>
          </div>
        </div>
        <div className="bounce-in flex items-center gap-1.5" style={{ animationDelay: '300ms' }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--f-kr)' }}>낙찰자 2장 모두 획득!</span>
        </div>
        <p className="slide-up text-center" style={{ animationDelay: '480ms', color: 'var(--faint)', fontSize: 11 }}>
          방식은 2번째 카드 타입을 따릅니다
        </p>
      </div>
    );
  }
  return null;
}

function Visual({ step }: { step: number }) {
  // 경매 타입 스텝 (2~6)
  const auctionTypes = ['open', 'fixed', 'secret', 'once-around', 'double'] as const;
  if (step >= 2 && step <= 6) {
    const type = auctionTypes[step - 2];
    const color = AUCTION_TYPE_COLORS[type];
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="bounce-in flex items-center gap-2 px-4 py-2 rounded-2xl mb-1"
          style={{ background: color + '18', border: `1.5px solid ${color}50` }}>
          <span style={{ fontSize: 18 }}>{AUCTION_TYPE_ICONS[type]}</span>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 800, color }}>{AUCTION_TYPE_LABELS[type]}</span>
        </div>
        <AuctionVisual type={type} color={color} />
      </div>
    );
  }

  switch (step) {
    case 0:
      return (
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl bounce-in" style={{ animationDelay: '0ms' }}>🎨</span>
          <div className="flex gap-3">
            {ARTISTS.map((a, i) => (
              <div key={a.id} className="flex flex-col items-center gap-1 bounce-in" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: a.color + '28', border: `1.5px solid ${a.color}60` }}>
                  {a.avatar}
                </div>
                <span className="text-white/30" style={{ fontSize: 9, fontFamily: 'var(--f-kr)' }}>{a.name}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xl bounce-in" style={{ animationDelay: '700ms' }}>
            <span>💰</span><span>🏆</span><span>💎</span>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3 items-end">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bounce-in" style={{
                animationDelay: `${i * 100}ms`,
                width: 44, height: 62, borderRadius: 10,
                background: i === 1 ? '#36e0cf28' : 'var(--surface-2)',
                border: `1.5px solid ${i === 1 ? '#36e0cf' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                transform: i === 1 ? 'translateY(-8px) scale(1.1)' : undefined,
                boxShadow: i === 1 ? '0 0 18px #36e0cf40' : undefined,
              }}>🎴</div>
            ))}
          </div>
          <span className="text-3xl bounce-in" style={{ animationDelay: '400ms' }}>↓</span>
          <div className="bounce-in flex items-center justify-center gap-2 px-5 py-3 rounded-2xl"
            style={{ animationDelay: '550ms', background: 'var(--surface-2)', border: '1.5px solid #36e0cf50', fontSize: 13, color: '#36e0cf' }}>
            <span>🔨</span>
            <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700 }}>경매 시작!</span>
          </div>
        </div>
      );

    case 7:
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bounce-in" style={{
                animationDelay: `${i * 110}ms`,
                width: 36, height: 50, borderRadius: 8,
                background: i < 4 ? '#EF444428' : '#EF444480',
                border: `1.5px solid ${i < 4 ? '#EF444460' : '#EF4444'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: i === 4 ? '0 0 14px #EF444460' : undefined,
              }}>⚡</div>
            ))}
          </div>
          <div className="bounce-in flex items-center gap-2" style={{ animationDelay: '650ms' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 700, color: '#EF4444' }}>5장! 라운드 종료</span>
          </div>
          <p className="slide-up text-center" style={{ animationDelay: '800ms', color: 'var(--faint)', fontSize: 11 }}>
            5장째 카드는 경매 없이 버려집니다
          </p>
        </div>
      );

    case 8:
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-3">
            {[
              { rank: '2위', val: '+20M', color: 'var(--dim)', h: 52 },
              { rank: '1위', val: '+30M', color: 'var(--gold)', h: 72 },
              { rank: '3위', val: '+10M', color: '#92400E', h: 36 },
            ].map((p, i) => (
              <div key={p.rank} className="bounce-in flex flex-col items-center gap-1" style={{ animationDelay: `${i * 120}ms` }}>
                <span style={{ fontFamily: 'var(--f-title)', fontSize: 15, color: p.color }}>{p.val}</span>
                <div style={{
                  width: 44, height: p.h, borderRadius: '8px 8px 0 0',
                  background: p.color + '28', border: `1.5px solid ${p.color}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: p.color, fontFamily: 'var(--f-kr)',
                }}>{p.rank}</div>
              </div>
            ))}
          </div>
          <p className="slide-up text-center" style={{ animationDelay: '500ms', color: 'var(--faint)', fontSize: 11 }}>
            가치는 다음 라운드에도 누적돼요
          </p>
        </div>
      );

    case 9:
      return (
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl float">🏆</span>
          <div className="flex gap-3 bounce-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}>
              <span>💰</span><span style={{ color: 'var(--text-2)' }}>현금</span>
            </div>
            <span style={{ color: 'var(--faint)', fontSize: 18, alignSelf: 'center' }}>+</span>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}>
              <span>🎨</span><span style={{ color: 'var(--text-2)' }}>작품 가치</span>
            </div>
          </div>
          <span className="bounce-in"
            style={{ animationDelay: '450ms', fontSize: 12, color: '#36e0cf', fontFamily: 'var(--f-kr)', fontWeight: 700 }}>
            4라운드 · 합산 최다 보유자 승리!
          </span>
        </div>
      );

    default:
      return null;
  }
}

export default function ModernArtRulesPage() {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'radial-gradient(120% 90% at 50% -10%, #0d1a1a 0%, #0c0a12 45%, #08080f 100%)' }}
    >
      {/* 헤더 */}
      <div className="text-center mb-6">
        <p style={{ color: '#36e0cf', opacity: 0.5, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--f-pix)' }}>
          게임 규칙
        </p>
        <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 2, color: '#36e0cf', margin: 0, textShadow: '0 0 20px #36e0cf60' }}>
          MODERN ART
        </h1>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-sm" style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 24, padding: 24,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* 시각 요소 */}
        <div key={`v-${step}`} className="step-in flex items-center justify-center mb-5" style={{ minHeight: 168 }}>
          <Visual step={step} />
        </div>

        {/* 텍스트 */}
        <div key={`t-${step}`} className="step-in text-center mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            {STEPS[step].title}
          </h2>
          <p style={{ color: 'var(--dim)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* 진행 점 */}
        <div className="flex gap-1.5 justify-center mb-5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} style={{
              borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s',
              width: i === step ? 18 : 7, height: 7,
              background: i === step ? '#36e0cf' : i < step ? 'rgba(54,224,207,0.35)' : 'rgba(255,255,255,0.12)',
            }} />
          ))}
        </div>

        {/* 네비게이션 */}
        <div className="flex gap-3">
          {!isFirst && (
            <button onClick={() => setStep((s) => s - 1)} style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 13,
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              ← 이전
            </button>
          )}
          {isLast ? (
            <Link href="/modern-art" style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 900, fontSize: 13,
              background: 'linear-gradient(135deg, #36e0cf, #129c8e)',
              color: '#06231f', textDecoration: 'none', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 20px #36e0cf40',
            }}>
              게임 시작하기 🎨
            </Link>
          ) : (
            <button onClick={() => setStep((s) => s + 1)} style={{
              flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 900, fontSize: 13,
              background: 'linear-gradient(135deg, #36e0cf, #129c8e)',
              color: '#06231f', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              다음 →
            </button>
          )}
        </div>
      </div>

      {/* 건너뛰기 */}
      {!isLast && (
        <Link href="/modern-art" style={{ marginTop: 20, color: 'rgba(255,255,255,0.18)', fontSize: 12, textDecoration: 'none' }}>
          건너뛰기
        </Link>
      )}
    </main>
  );
}
