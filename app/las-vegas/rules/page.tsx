'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';

const CASINO_BG = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500',
  'bg-yellow-400', 'bg-purple-500', 'bg-orange-500',
];

const STEPS = [
  {
    title: '라스베가스에 온 걸 환영해요!',
    desc: '6개의 카지노에서 주사위를 굴려\n가장 많은 돈을 모은 플레이어가 승리합니다.',
  },
  {
    title: '주사위를 굴려요',
    desc: '내 차례가 되면 남은 주사위를 모두 굴립니다.\n굴린 결과를 확인하고 카지노를 선택해요.',
  },
  {
    title: '카지노를 선택해요',
    desc: '나온 숫자 중 하나를 고릅니다.\n그 숫자의 주사위가 전부 해당 카지노로 이동해요.',
  },
  {
    title: '흰색 주사위',
    desc: '흰색(중립) 주사위는 선택한 카지노에 함께 배치됩니다.\n다른 플레이어의 순위에 영향을 줄 수 있어요.\n인원수에 따라 각자 가진 주사위 수가 달라져요.',
  },
  {
    title: '정산: 동점 주의!',
    desc: '라운드가 끝나면 주사위가 가장 많은 플레이어가 상금을 받아요.\n동점이면 해당 순위는 무효! 두 자리가 날아가고\n다음 순위 플레이어가 1등 상금을 가져갑니다.',
  },
  {
    title: '4라운드 후 최고 부자 승리!',
    desc: '총 4라운드를 진행합니다.\n모든 라운드가 끝났을 때 가장 많은 돈을 모은 플레이어가 승리!',
  },
];

function Visual({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {CASINO_BG.map((bg, i) => (
              <div
                key={i}
                className={`w-9 h-12 rounded-lg ${bg} flex items-end justify-center pb-1 shadow-lg bounce-in`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="text-white font-black text-xs">{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {['⚃', '⚁', '⚄', '⚅', '⚀'].map((d, i) => (
              <span
                key={i}
                className="text-3xl dice-fly-in"
                style={{ animationDelay: `${380 + i * 90}ms` }}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="flex gap-5 text-xl">
            {['💰', '💎', '🏆'].map((e, i) => (
              <span
                key={i}
                className="bounce-in"
                style={{ animationDelay: `${850 + i * 100}ms` }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      );

    case 1:
      return (
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl hand-throw mb-1">🤲</span>
          <div className="flex gap-2 flex-wrap justify-center">
            {['⚅', '⚂', '⚂', '⚄', '⚀', '⚁', '⚃', '⚅'].map((d, i) => (
              <span
                key={i}
                className="text-3xl text-red-400 dice-fly-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {d}
              </span>
            ))}
          </div>
          <span
            className="text-white/40 text-xs slide-up"
            style={{ animationDelay: '900ms' }}
          >
            남은 주사위를 한꺼번에 굴린다
          </span>
        </div>
      );

    case 2:
      return (
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="text-4xl text-blue-400 dice-fly-in"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  ⚂
                </span>
              ))}
            </div>
            <span className="text-blue-300/50 text-xs">숫자 3 이 3개</span>
          </div>
          <span
            className="text-3xl text-amber-400 bounce-in"
            style={{ animationDelay: '500ms' }}
          >
            →
          </span>
          <div
            className="flex flex-col items-center gap-1 bounce-in"
            style={{ animationDelay: '650ms' }}
          >
            <div className="w-12 h-16 rounded-xl bg-green-500 flex flex-col items-center justify-between py-2 shadow-lg">
              <span className="text-white font-black">3</span>
              <span className="text-white text-xs font-bold">×3</span>
            </div>
            <span className="text-green-300/50 text-xs">카지노 3</span>
          </div>
        </div>
      );

    case 3:
      return (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {[
            { label: '2인', colored: 4, white: 2, delay: 0 },
            { label: '3–4인', colored: 6, white: 2, delay: 120 },
            { label: '5인', colored: 8, white: 0, delay: 240 },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 bounce-in"
              style={{ animationDelay: `${row.delay}ms` }}
            >
              <span className="text-white/50 text-xs font-bold w-10 shrink-0">{row.label}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: row.colored }).map((_, i) => (
                  <span key={i} className="text-base text-red-400">⚀</span>
                ))}
              </div>
              {row.white > 0 && (
                <>
                  <span className="text-white/20 text-xs">+</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: row.white }).map((_, i) => (
                      <span key={i} className="text-base text-gray-300">⚀</span>
                    ))}
                  </div>
                </>
              )}
              {row.white === 0 && (
                <span className="text-white/20 text-xs ml-1">흰색 없음</span>
              )}
            </div>
          ))}
        </div>
      );

    case 4:
      return (
        <div className="flex items-end gap-4">
          {[
            { color: 'bg-red-500', count: 3, prize: '✗', label: '동점', tied: true },
            { color: 'bg-blue-500', count: 3, prize: '✗', label: '동점', tied: true },
            { color: 'bg-green-500', count: 1, prize: '8만', label: '🥇', tied: false },
          ].map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 bounce-in"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <span className={`text-xs font-bold ${p.tied ? 'text-red-400' : 'text-amber-300'}`}>
                {p.label}
              </span>
              <div className="flex flex-col gap-0.5 items-center">
                {Array.from({ length: p.count }).map((_, j) => (
                  <div key={j} className={`w-5 h-5 rounded-full ${p.color}`} />
                ))}
              </div>
              <span className={`text-xs font-bold ${p.tied ? 'text-red-400/60' : 'text-amber-300'}`}>
                {p.prize}
              </span>
            </div>
          ))}
          <div
            className="ml-1 text-left bounce-in"
            style={{ animationDelay: '550ms' }}
          >
            <p className="text-white/30 text-xs leading-relaxed">
              빨강·파랑 동점<br />
              두 자리 무효<br />
              초록이 1등 상금 수령
            </p>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl float">🏆</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((r) => (
              <div
                key={r}
                className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center bounce-in"
                style={{ animationDelay: `${r * 110}ms` }}
              >
                <span className="text-amber-300 font-black">{r}</span>
              </div>
            ))}
          </div>
          <span
            className="text-amber-300/40 text-sm bounce-in"
            style={{ animationDelay: '560ms' }}
          >
            4라운드 · 최다 금액 보유자 승리
          </span>
        </div>
      );

    default:
      return null;
  }
}

export default function RulesPage() {
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0f1a] via-[#1a1020] to-[#0a0a14] px-4 py-8">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <p className="text-amber-300/40 text-xs tracking-widest uppercase mb-1">게임 규칙</p>
        <h1 className="text-2xl font-black tracking-widest gold-text">LAS VEGAS</h1>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm shadow-2xl">
        {/* 시각 요소 */}
        <div key={`v-${step}`} className="step-in flex items-center justify-center h-44 mb-5">
          <Visual step={step} />
        </div>

        {/* 텍스트 */}
        <div key={`t-${step}`} className="step-in text-center space-y-2 mb-6">
          <h2 className="text-base font-black text-white">{STEPS[step].title}</h2>
          <p className="text-white/55 text-sm leading-relaxed whitespace-pre-line">
            {STEPS[step].desc}
          </p>
        </div>

        {/* 진행 점 */}
        <div className="flex gap-2 justify-center mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 h-2 bg-amber-400'
                  : i < step
                  ? 'w-2 h-2 bg-amber-400/40'
                  : 'w-2 h-2 bg-white/15 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* 네비게이션 */}
        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-white/[0.08] text-white/50 hover:bg-white/15 hover:text-white transition-all duration-200"
            >
              ← 이전
            </button>
          )}
          {isLast ? (
            <Link
              href="/las-vegas"
              className="flex-1 py-3 rounded-2xl font-black text-sm text-center bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 pulse-glow"
            >
              게임 시작하기 🎲
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500/80 to-yellow-400/80 text-black hover:from-amber-500 hover:to-yellow-400 transition-all duration-200 active:scale-95"
            >
              다음 →
            </button>
          )}
        </div>
      </div>

      {/* 건너뛰기 */}
      {!isLast && (
        <Link
          href="/las-vegas"
          className="mt-5 text-white/20 text-xs hover:text-white/40 transition-colors"
        >
          건너뛰기
        </Link>
      )}
    </main>
  );
}
