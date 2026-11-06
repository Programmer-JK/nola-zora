'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ARTISTS, AUCTION_INFO, START_MONEY, SALES_PER_ROUND, ROUND_VALUES, TOTAL_ROUNDS, marketValues,
  type AuctionType,
} from '@/lib/modern-art/game';

const ACCENT = '#e879f9';
const ACCENT_LO = '#a21caf';

/** 작은 작품 카드 (실제 카드 이미지) */
function Mini({ artist, work = 0, size = 56, delay = 0, label }: { artist: number; work?: number; size?: number; delay?: number; label?: string }) {
  const a = ARTISTS[artist];
  return (
    <div className="bounce-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animationDelay: `${delay}ms` }}>
      <div style={{
        width: size, height: size * 1.25, borderRadius: 8, overflow: 'hidden', background: '#0a0810',
        border: `2px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={a.works[work].src} alt={`${a.name} ${a.works[work].title}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      {label && <span style={{ fontSize: 10, color: a.color, fontWeight: 700 }}>{label}</span>}
    </div>
  );
}

const Note = ({ children, delay = 0, color = 'var(--dim)' }: { children: React.ReactNode; delay?: number; color?: string }) => (
  <span className="bounce-in" style={{ fontSize: 12, color, animationDelay: `${delay}ms`, textAlign: 'center' }}>{children}</span>
);

/** 경매 방식 고르기 (인터랙티브) */
function AuctionPicker() {
  const types = Object.keys(AUCTION_INFO) as AuctionType[];
  const [t, setT] = useState<AuctionType>('open');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      <div role="tablist" aria-label="경매 방식" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {types.map(k => (
          <button key={k} type="button" role="tab" aria-selected={t === k} onClick={() => setT(k)}
            style={{
              padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              border: `1px solid ${t === k ? ACCENT : 'var(--line-2)'}`,
              background: t === k ? `${ACCENT}26` : 'transparent', color: t === k ? 'var(--text)' : 'var(--dim)',
            }}>
            {AUCTION_INFO[k].emoji} {AUCTION_INFO[k].label}
          </button>
        ))}
      </div>
      <div key={t} className="step-in arc-panel-inset" role="tabpanel" style={{ padding: '12px 14px', width: '100%' }}>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, marginBottom: 4 }}>{AUCTION_INFO[t].emoji} {AUCTION_INFO[t].label}</div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{AUCTION_INFO[t].desc}</p>
      </div>
      <Note>탭해서 방식을 바꿔 보세요 👆</Note>
    </div>
  );
}

/** 판매량 → 시장 가치 체험 (인터랙티브) */
function MarketDemo() {
  const [sold, setSold] = useState([2, 1, 1, 0, 0]);
  const values = marketValues(sold);
  const total = sold.reduce((a, b) => a + b, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {ARTISTS.map((a, i) => (
        <button key={a.name} type="button" onClick={() => setSold(s => s.map((n, j) => (j === i ? n + 1 : n)))}
          aria-label={`${a.name} 판매 1장 추가`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', color: 'var(--text)' }}>
          <span style={{ width: 72, textAlign: 'left', fontSize: 12, fontWeight: 700, color: a.color }}>{a.emoji} {a.name}</span>
          <span style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${Math.min(100, sold[i] * 20)}%`, height: '100%', background: a.color, transition: 'width .25s' }} />
          </span>
          <span style={{ width: 22, fontSize: 12, color: 'var(--text-2)' }}>{sold[i]}</span>
          <span className="pix" style={{ width: 40, textAlign: 'right', fontSize: 10, color: values[i] ? 'var(--gold)' : 'var(--faint)' }}>${values[i]}</span>
        </button>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>작가를 탭하면 판매 +1 {total >= SALES_PER_ROUND && <b style={{ color: 'var(--red)' }}>· 라운드 종료!</b>}</span>
        <button type="button" className="arc-btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSold([0, 0, 0, 0, 0])}>초기화</button>
      </div>
    </div>
  );
}

const STEPS: { title: string; desc: string; visual: () => React.ReactNode }[] = [
  {
    title: '모던아트',
    desc: '미술품을 경매로 사고팔아\n가장 많은 돈을 번 미술상이 승리하는 게임입니다.',
    visual: () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {ARTISTS.map((a, i) => <Mini key={a.name} artist={i} work={i} size={50} delay={i * 90} label={a.name} />)}
        </div>
        <Note delay={600}>작가(카테고리) 5명 · {TOTAL_ROUNDS}라운드</Note>
      </div>
    ),
  },
  {
    title: '게임 준비',
    desc: `모두 $${START_MONEY}로 시작하고 작품 카드를 손패로 받습니다.\n손패는 나만 볼 수 있고, 남은 카드는 다음 라운드로 이어집니다.`,
    visual: () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="bounce-in pix" style={{ fontSize: 26, color: 'var(--gold)', textShadow: '0 0 16px #ffb72b66' }}>${START_MONEY}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]].map(([a, w], i) => <Mini key={i} artist={a} work={w} size={42} delay={250 + i * 80} />)}
        </div>
        <Note delay={700}>내 손패</Note>
      </div>
    ),
  },
  {
    title: '내 차례 — 출품',
    desc: '손패에서 작품 1장을 골라 경매에 올립니다.\n카드에 그려진 경매 방식으로 진행됩니다.',
    visual: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mini artist={0} work={10} size={64} label="손패" />
        <span className="bounce-in" style={{ fontSize: 28, color: ACCENT, animationDelay: '300ms' }}>→</span>
        <div className="bounce-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animationDelay: '450ms' }}>
          <span style={{ fontSize: 40 }}>🔨</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>경매 시작!</span>
        </div>
      </div>
    ),
  },
  {
    title: '경매 방식',
    desc: '카드마다 경매 방식이 정해져 있습니다.\n자기 작품에는 입찰할 수 없습니다.',
    visual: () => <AuctionPicker />,
  },
  {
    title: '1+1',
    desc: '1+1 카드에 같은 작가 작품을 1장 더 붙여\n2장을 한 번에 경매합니다.\n방식은 두 번째 카드를 따르고 판매량은 2장!',
    visual: () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mini artist={1} work={0} size={56} label="🎴 1+1" />
          <span className="bounce-in pix" style={{ fontSize: 16, color: ACCENT, animationDelay: '200ms' }}>+</span>
          <Mini artist={1} work={8} size={56} delay={300} label="🤫 비밀 입찰" />
        </div>
        <Note delay={600} color="var(--text-2)">→ 2점을 <b>비밀 입찰</b>로 경매</Note>
        <Note delay={750}>같은 작가 카드가 없으면 1+1 혼자 자유 경매</Note>
      </div>
    ),
  },
  {
    title: '돈은 출품자에게',
    desc: '낙찰자가 낸 돈은 은행이 아니라\n작품을 올린 출품자가 받습니다.\n아무도 안 사면 작품은 출품자 손으로 돌아갑니다.',
    visual: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="bounce-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>🧑‍🎨</div><div style={{ fontSize: 12 }}>낙찰자</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span className="bounce-in pix" style={{ fontSize: 12, color: 'var(--gold)', animationDelay: '250ms' }}>$40 →</span>
          <span className="bounce-in" style={{ fontSize: 12, color: ACCENT, animationDelay: '450ms' }}>← 🖼️ 작품</span>
        </div>
        <div className="bounce-in" style={{ textAlign: 'center', animationDelay: '150ms' }}>
          <div style={{ fontSize: 36 }}>🔨</div><div style={{ fontSize: 12 }}>출품자</div>
        </div>
      </div>
    ),
  },
  {
    title: '라운드 종료',
    desc: `한 라운드에 작품이 ${SALES_PER_ROUND}장 팔리는 순간 즉시 끝납니다.\n(1+1은 2장으로 계산)`,
    visual: () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: SALES_PER_ROUND }, (_, i) => (
            <div key={i} className="bounce-in" style={{
              width: 36, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${ACCENT}22`, border: `2px solid ${i === SALES_PER_ROUND - 1 ? 'var(--red)' : ACCENT}`,
              fontFamily: 'var(--f-pix)', fontSize: 11, animationDelay: `${i * 150}ms`,
            }}>{i + 1}</div>
          ))}
        </div>
        <span className="bounce-in pix" style={{ fontSize: 11, color: 'var(--red)', animationDelay: '900ms' }}>ROUND OVER</span>
      </div>
    ),
  },
  {
    title: '시장 가치',
    desc: `많이 팔린 상위 3작가가 $${ROUND_VALUES.join(' / $')} 가치를 얻습니다.\n동점이면 위쪽 작가 우선, 0장은 가치 없음.`,
    visual: () => <MarketDemo />,
  },
  {
    title: '작품 정산',
    desc: '라운드가 끝나면 이번 라운드에 산 작품을\n시장 가치만큼 돈으로 바꿔 줍니다.\n비싸게 샀다고 비싼 작품이 아닙니다!',
    visual: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mini artist={2} work={2} size={60} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span className="bounce-in" style={{ animationDelay: '200ms' }}>낙찰가 <b className="pix" style={{ fontSize: 11 }}>$50</b></span>
          <span className="bounce-in" style={{ animationDelay: '400ms' }}>시장 가치 <b className="pix" style={{ fontSize: 11, color: 'var(--gold)' }}>$20</b></span>
          <span className="bounce-in" style={{ color: 'var(--red)', fontWeight: 700, animationDelay: '650ms' }}>→ $30 손해 😱</span>
        </div>
      </div>
    ),
  },
  {
    title: '승리',
    desc: `${TOTAL_ROUNDS}라운드가 끝났을 때\n현금이 가장 많은 플레이어가 승리합니다.\n어떤 작가가 많이 팔릴지 예측하세요!`,
    visual: () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span className="bounce-in" style={{ fontSize: 56, lineHeight: 1 }}>🏆</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
            <span key={i} className="bounce-in arc-chip" style={{ animationDelay: `${200 + i * 120}ms` }}>R{i + 1}</span>
          ))}
        </div>
      </div>
    ),
  },
];

export default function ModernArtRulesPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep(s => Math.min(STEPS.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT, justifyContent: 'center' } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 8px' }}>
          <Link href="/modern-art" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 돌아가기</Link>
          <span className="pix" style={{ fontSize: 9, color: 'var(--faint)' }}>{step + 1} / {STEPS.length}</span>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          <p className="pix" style={{ fontSize: 7, color: `${ACCENT}88`, letterSpacing: 4, margin: '0 0 6px' }}>HOW TO PLAY</p>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 2, color: ACCENT, textShadow: `0 0 16px ${ACCENT}88`, margin: 0 }}>MODERN ART</h1>
        </div>

        <div className="arc-panel ticks" style={{ padding: 22 }}>
          <div key={`v-${step}`} className="step-in"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, marginBottom: 18 }}>
            {STEPS[step].visual()}
          </div>

          <div key={`t-${step}`} className="step-in" style={{ textAlign: 'center', marginBottom: 20 }} aria-live="polite">
            <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 22, margin: '0 0 8px' }}>{STEPS[step].title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>{STEPS[step].desc}</p>
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
            {STEPS.map((s, i) => (
              <button key={i} type="button" aria-label={`${i + 1}단계: ${s.title}`} aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
                style={{
                  borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, transition: 'all .3s',
                  width: i === step ? 20 : 8, height: 8,
                  background: i === step ? ACCENT : i < step ? `${ACCENT}66` : 'rgba(255,255,255,0.15)',
                }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!isFirst && (
              <button type="button" className="arc-btn-ghost" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>← 이전</button>
            )}
            <button type="button" className="arc-btn" style={{ flex: 2, '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties}
              onClick={() => (isLast ? router.push('/modern-art') : setStep(s => s + 1))}>
              {isLast ? '🎨 게임하러 가기' : '다음 →'}
            </button>
          </div>
        </div>

        {!isLast && (
          <button type="button" onClick={() => router.push('/modern-art')}
            style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--faint)' }}>
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
