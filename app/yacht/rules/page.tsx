'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';

const GREEN = '#7ed957';

const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, held = false, size = 44 }: { value: number; held?: boolean; size?: number }) {
  const pips = PIP_MAP[value] || [];
  return (
    <div style={{
      width: size, height: size,
      background: held
        ? `linear-gradient(150deg, ${GREEN}cc 0%, ${GREEN} 100%)`
        : 'rgba(255,255,255,0.1)',
      borderRadius: Math.round(size * 0.22),
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gridTemplateRows: 'repeat(3,1fr)',
      padding: `${size * 0.13}px`,
      gap: `${size * 0.04}px`,
      boxShadow: held
        ? `inset 0 2px 3px rgba(255,255,255,.5), 0 0 14px -2px ${GREEN}99`
        : '0 2px 8px rgba(0,0,0,.4)',
      flexShrink: 0,
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          borderRadius: '50%',
          background: pips.includes(i) ? (held ? '#06230a' : 'rgba(255,255,255,0.85)') : 'transparent',
        }} />
      ))}
    </div>
  );
}

const STEPS = [
  {
    title: '요트 주사위에 온 걸 환영해요!',
    desc: '5개의 주사위를 굴려 족보를 완성하고\n가장 높은 점수를 얻는 플레이어가 승리합니다.',
  },
  {
    title: '주사위를 굴려요',
    desc: '내 차례가 되면 주사위 5개를 굴립니다.\n한 턴에 최대 3번까지 굴릴 수 있어요.',
  },
  {
    title: '남길 주사위를 HOLD',
    desc: '굴린 후 남기고 싶은 주사위를 탭해 고정하세요.\n고정한 주사위는 다음 굴림에서 제외됩니다.',
  },
  {
    title: '상단 족보 — 같은 눈의 합',
    desc: '1부터 6까지 각 눈의 합을 기록하는 6칸이에요.\n예) 3이 세 개 나왔다면 3 (Threes) = 9점',
  },
  {
    title: '하단 족보 — 특수 조합',
    desc: '초이스·포카드·풀하우스·스트레이트·요트\n특수 조합으로 한 번에 많은 점수를 노려요!',
  },
  {
    title: '상단 보너스 +35점!',
    desc: '상단 6칸의 합계가 63점 이상이면\n보너스 35점이 자동으로 추가됩니다!',
  },
  {
    title: '12칸을 채우면 게임 종료!',
    desc: '12칸을 모두 채우면 점수를 합산합니다.\n가장 높은 점수를 가진 플레이어가 승리!',
  },
];

function Visual({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 64, lineHeight: 1 }} className="float">⛵</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 5, 3, 6, 1].map((v, i) => (
              <div key={i} className="bounce-in" style={{ animationDelay: `${300 + i * 80}ms` }}>
                <Die value={v} size={40} />
              </div>
            ))}
          </div>
        </div>
      );

    case 1:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 44, lineHeight: 1 }} className="hand-throw">🤲</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[4, 1, 3, 6, 2].map((v, i) => (
              <div key={i} className="dice-fly-in" style={{ animationDelay: `${i * 100}ms` }}>
                <Die value={v} size={44} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {['1회', '2회', '3회'].map((t, i) => (
              <span key={i} className="bounce-in" style={{
                animationDelay: `${680 + i * 120}ms`,
                fontSize: 12,
                color: i === 0 ? GREEN : 'rgba(255,255,255,0.3)',
                fontWeight: 700,
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      );

    case 2:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: 5, held: true },
              { v: 5, held: true },
              { v: 5, held: true },
              { v: 3, held: false },
              { v: 1, held: false },
            ].map((d, i) => (
              <div key={i} className="bounce-in" style={{
                animationDelay: `${i * 80}ms`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <Die value={d.v} held={d.held} size={44} />
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  color: d.held ? GREEN : 'rgba(255,255,255,0.2)',
                }}>
                  {d.held ? 'HOLD' : '　'}
                </span>
              </div>
            ))}
          </div>
          <span className="slide-up" style={{
            animationDelay: '520ms',
            fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2,
          }}>
            탭해서 고정 · 다시 탭하면 해제
          </span>
        </div>
      );

    case 3:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 270 }}>
          {[
            { label: '3 (Threes)', match: 3, dice: [3, 3, 3, 1, 5], score: 9 },
            { label: '6 (Sixes)', match: 6, dice: [6, 6, 2, 4, 1], score: 12 },
          ].map((row, ri) => (
            <div key={ri} className="bounce-in" style={{
              animationDelay: `${ri * 200}ms`,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {row.dice.map((v, i) => (
                  <Die key={i} value={v} held={v === row.match} size={28} />
                ))}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>→</span>
              <div>
                <div style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>{row.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{row.score}점</div>
              </div>
            </div>
          ))}
        </div>
      );

    case 4:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 288 }}>
          {[
            { name: '요트', dice: [4, 4, 4, 4, 4], score: '50점', color: GREEN },
            { name: '풀하우스', dice: [2, 2, 5, 5, 5], score: '19점', color: '#60a5fa' },
            { name: '초이스', dice: [3, 4, 5, 6, 6], score: '24점', color: '#f59e0b' },
          ].map((row, ri) => (
            <div key={ri} className="bounce-in" style={{
              animationDelay: `${ri * 150}ms`,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 14, padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {row.dice.map((v, i) => <Die key={i} value={v} size={27} />)}
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{row.name}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: row.color }}>{row.score}</div>
              </div>
            </div>
          ))}
        </div>
      );

    case 5:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="bounce-in" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>상단 합계</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: 'white', lineHeight: 1 }}>63+</div>
            </div>
            <span className="bounce-in" style={{ animationDelay: '300ms', fontSize: 30, color: GREEN }}>→</span>
            <div className="bounce-in" style={{ animationDelay: '520ms', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>보너스</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: GREEN, lineHeight: 1 }}>+35</div>
            </div>
          </div>
          <div className="bounce-in" style={{
            animationDelay: '800ms',
            background: `${GREEN}18`,
            border: `1px solid ${GREEN}40`,
            borderRadius: 12, padding: '8px 18px',
          }}>
            <span style={{ fontSize: 12, color: `${GREEN}cc` }}>
              1~6을 골고루 채우면 도전 가능!
            </span>
          </div>
        </div>
      );

    case 6:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 58, lineHeight: 1 }} className="float">🏆</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 240 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bounce-in" style={{
                animationDelay: `${i * 55}ms`,
                width: 36, height: 36, borderRadius: 10,
                background: `${GREEN}18`,
                border: `1px solid ${GREEN}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: GREEN,
              }}>
                ✓
              </div>
            ))}
          </div>
          <span className="bounce-in" style={{ animationDelay: '780ms', fontSize: 12, color: `${GREEN}99` }}>
            12칸 완성 · 최고점 플레이어 승리
          </span>
        </div>
      );

    default:
      return null;
  }
}

export default function YachtRulesPage() {
  const [step, setStep] = useState(0);
  const { soundEnabled } = useSoundEnabled();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/rule.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundEnabled) audio.play().catch(() => {});
    else audio.pause();
  }, [soundEnabled]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <main style={{
      minHeight: '100svh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, #071a0a, #0a1f0d, #060f07)',
      padding: '32px 16px',
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: `${GREEN}66`, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4 }}>
          게임 규칙
        </p>
        <h1 style={{
          fontSize: 26, fontWeight: 900, letterSpacing: 3,
          color: GREEN, textShadow: `0 0 20px ${GREEN}66`,
        }}>
          YACHT
        </h1>
      </div>

      {/* 카드 */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 28, padding: 24,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* 시각 요소 */}
        <div key={`v-${step}`} className="step-in" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 180, marginBottom: 20,
        }}>
          <Visual step={step} />
        </div>

        {/* 텍스트 */}
        <div key={`t-${step}`} className="step-in" style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: 'white', marginBottom: 8 }}>
            {STEPS[step].title}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {STEPS[step].desc}
          </p>
        </div>

        {/* 진행 점 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                borderRadius: 9999, border: 'none', cursor: 'pointer',
                transition: 'all 0.3s',
                height: 8,
                width: i === step ? 20 : 8,
                background: i === step ? GREEN : i < step ? `${GREEN}55` : 'rgba(255,255,255,0.15)',
                padding: 0,
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
                flex: 1, padding: '13px 0', borderRadius: 18,
                border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.45)',
                fontSize: 14, fontWeight: 700,
                transition: 'all 0.2s',
              }}
            >
              ← 이전
            </button>
          )}
          {isLast ? (
            <Link
              href="/yacht"
              style={{
                flex: 1, padding: '13px 0', borderRadius: 18,
                background: `linear-gradient(135deg, ${GREEN}dd, #4ade80)`,
                color: '#06230a', fontSize: 14, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
                boxShadow: `0 0 24px ${GREEN}55`,
              }}
            >
              게임 시작하기 ⛵
            </Link>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 18,
                border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${GREEN}bb, #4ade8099)`,
                color: '#06230a',
                fontSize: 14, fontWeight: 900,
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
        <Link
          href="/yacht"
          style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}
        >
          건너뛰기
        </Link>
      )}
    </main>
  );
}
