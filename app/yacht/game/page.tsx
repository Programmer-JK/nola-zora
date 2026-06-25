'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import { playDiceRattle, playDiceLand, playScoreCommit, playHoldToggle } from '@/lib/yacht/sounds';
import {
  Y_CATS, Y_UPPER, Y_LOWER,
  yScore, yUpperSum, yUpperBonus, yLowerSum, yTotal, yFilled,
  rollDie,
} from '@/lib/yacht/game-logic';
import type { YachtPlayer, YachtCatId, PlayerSetup } from '@/lib/yacht/types';

const ACCENT = 'var(--green)';
const ACCENT_HEX = '#7ed957';

/* ── Pip-based die ── */
const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function YachtDie({
  value, held, rolling, onClick, inactive, selected,
}: {
  value: number; held: boolean; rolling: boolean;
  onClick: () => void; inactive: boolean; selected?: boolean;
}) {
  const pips = PIP_MAP[value] || [];
  const s = 52;
  const dieBg = held
    ? 'linear-gradient(150deg, #caf7b0 0%, #7ed957 100%)'
    : selected
      ? 'linear-gradient(150deg, #fff5cc 0%, #facc15 100%)'
      : 'linear-gradient(150deg, #f0e8d8 0%, #d4c9b5 100%)';
  const dieShadow = held
    ? `inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25), 0 0 18px -2px rgba(126,217,87,.85)`
    : selected
      ? `inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25), 0 0 18px -2px rgba(250,204,21,.9)`
      : 'inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25)';
  return (
    <button
      onClick={onClick}
      disabled={inactive}
      style={{
        position: 'relative', border: 'none', background: 'transparent', padding: 0,
        cursor: inactive ? 'default' : 'pointer',
        transform: held ? 'translateY(-8px)' : selected ? 'translateY(-4px)' : 'none',
        transition: 'transform .15s',
        opacity: inactive ? 0.45 : 1,
      }}
    >
      <div
        className={rolling && !held ? 'dice-tumble' : ''}
        style={{
          width: s, height: s,
          background: dieBg,
          borderRadius: Math.round(s * 0.22),
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gridTemplateRows: 'repeat(3,1fr)',
          padding: s * 0.13,
          gap: s * 0.04,
          boxShadow: dieShadow,
          transition: 'background .2s, box-shadow .2s',
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} style={{
            borderRadius: '50%',
            background: pips.includes(i) ? '#1a1206' : 'transparent',
            boxShadow: pips.includes(i) ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
          }} />
        ))}
      </div>
      {held && (
        <span style={{
          position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--f-pix)', fontSize: 6, color: '#06230a',
          background: ACCENT, padding: '2px 5px', borderRadius: 5, whiteSpace: 'nowrap',
        }}>HOLD</span>
      )}
      {selected && (
        <span style={{
          position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--f-pix)', fontSize: 6, color: '#1a1206',
          background: '#facc15', padding: '2px 5px', borderRadius: 5, whiteSpace: 'nowrap',
        }}>PICK</span>
      )}
    </button>
  );
}

/* ── 3D CSS cube die (shown for non-held dice during rolling) ── */
function Die3D({ index }: { index: number }) {
  const s = 52;
  const h = s / 2;
  const r = Math.round(s * 0.22);
  const faces = [
    { v: 1, t: `translateZ(${h}px)` },
    { v: 6, t: `rotateY(180deg) translateZ(${h}px)` },
    { v: 3, t: `rotateY(90deg) translateZ(${h}px)` },
    { v: 4, t: `rotateY(-90deg) translateZ(${h}px)` },
    { v: 2, t: `rotateX(90deg) translateZ(${h}px)` },
    { v: 5, t: `rotateX(-90deg) translateZ(${h}px)` },
  ];
  return (
    <div style={{ width: s, height: s, perspective: 160, perspectiveOrigin: '50% 50%', flexShrink: 0 }}>
      <div
        className="dice-3d-spin"
        style={{
          width: s, height: s, position: 'relative', transformStyle: 'preserve-3d',
          animationDelay: `${-index * 0.11}s`,
        }}
      >
        {faces.map(({ v, t }) => {
          const pips = PIP_MAP[v] || [];
          return (
            <div key={v} style={{
              position: 'absolute', width: s, height: s,
              background: 'linear-gradient(150deg, #f0e8d8 0%, #d4c9b5 100%)',
              borderRadius: r,
              transform: t, backfaceVisibility: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gridTemplateRows: 'repeat(3,1fr)',
              padding: s * 0.13, gap: s * 0.04,
              boxSizing: 'border-box',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.3)',
            }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{
                  borderRadius: '50%',
                  background: pips.includes(i) ? '#1a1206' : 'transparent',
                  boxShadow: pips.includes(i) ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
                }} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Score cell ── */
function YCell({
  state, value, active, onPick, isTotal,
}: {
  state: 'filled' | 'preview' | 'empty';
  value: number | null;
  active: boolean;
  onPick?: () => void;
  isTotal?: boolean;
}) {
  if (isTotal) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-disp)', fontSize: 15,
        color: active ? ACCENT : 'var(--coin)',
        background: active ? 'color-mix(in srgb, var(--green) 16%, transparent)' : 'transparent',
        borderRadius: 8, padding: '4px 0',
      }}>{value}</div>
    );
  }
  if (state === 'filled') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-disp)', fontSize: 15,
        color: value === 0 ? 'var(--faint)' : 'var(--text)',
      }}>{value}</div>
    );
  }
  if (state === 'preview') {
    const zero = value === 0;
    return (
      <button
        onClick={onPick}
        title="이 족보로 기록"
        style={{
          width: '100%', height: '100%', cursor: 'pointer', border: '1.5px solid',
          borderColor: zero ? 'var(--line-2)' : ACCENT,
          background: zero ? 'rgba(255,255,255,.03)' : 'color-mix(in srgb, var(--green) 20%, transparent)',
          borderRadius: 9, padding: '5px 0',
          fontFamily: 'var(--f-disp)', fontSize: 15,
          color: zero ? 'var(--dim)' : ACCENT,
          textShadow: zero ? 'none' : `0 0 10px rgba(126,217,87,.5)`,
          transition: 'transform .1s, box-shadow .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 14px -4px var(--green)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >{value}</button>
    );
  }
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', fontSize: 13 }}>–</div>;
}

/* ── Main game ── */
function YachtGame({ players: initPlayers, onQuit }: {
  players: YachtPlayer[];
  onQuit: () => void;
}) {
  const [players, setPlayers] = useState(initPlayers);
  const [turnIdx, setTurnIdx] = useState(0);
  const [dice, setDice] = useState([1, 2, 3, 4, 5]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [rolled, setRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [flash, setFlash] = useState<{ idx: number; cat: YachtCatId } | null>(null);
  const [result, setResult] = useState<YachtPlayer[] | null>(null);
  // const [mode, setMode] = useState<'hold' | 'move'>('hold');
  const [swapSrc, setSwapSrc] = useState<number | null>(null);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { soundEnabled, toggleSound } = useSoundEnabled();

  const n = players.length;
  const me = players[turnIdx];
  const turnNo = yFilled(me.scores) + 1;
  const canScore = rolled && !rolling;

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  const roll = () => {
    if (rollsLeft <= 0 || rolling) return;
    setRolling(true);
    setFlash(null);
    setSwapSrc(null);
    const finalDice = dice.map((d, i) => held[i] ? d : rollDie());
    let ticks = 0;
    if (ivRef.current) clearInterval(ivRef.current);
    ivRef.current = setInterval(() => {
      ticks++;
      if (soundEnabled) playDiceRattle();
      setDice(prev => prev.map((d, i) => held[i] ? d : rollDie()));
      if (ticks >= 9) {
        if (ivRef.current) clearInterval(ivRef.current);
        setDice(finalDice);
        setRolling(false);
        setRolled(true);
        setRollsLeft(r => r - 1);
        if (soundEnabled) playDiceLand();
      }
    }, 65);
  };

  const handleDieClick = (i: number) => {
    if (!rolled || rolling) return;
    if (soundEnabled) playHoldToggle();
    setHeld(h => h.map((v, idx) => idx === i ? !v : v));
    // if (mode === 'hold') {
    //   setHeld(h => h.map((v, idx) => idx === i ? !v : v));
    // } else {
    //   if (swapSrc === null) {
    //     setSwapSrc(i);
    //   } else if (swapSrc === i) {
    //     setSwapSrc(null);
    //   } else {
    //     const nd = [...dice];
    //     const nh = [...held];
    //     [nd[swapSrc], nd[i]] = [nd[i], nd[swapSrc]];
    //     [nh[swapSrc], nh[i]] = [nh[i], nh[swapSrc]];
    //     setDice(nd);
    //     setHeld(nh);
    //     setSwapSrc(null);
    //   }
    // }
  };

  const sortDice = () => {
    if (!rolled) return;
    const pairs = dice.map((d, i) => ({ d, h: held[i] }));
    pairs.sort((a, b) => a.d - b.d);
    setDice(pairs.map(p => p.d));
    setHeld(pairs.map(p => p.h));
    setSwapSrc(null);
  };

  const nextTurn = (np: YachtPlayer[]) => {
    setTurnIdx(t => (t + 1) % np.length);
    setDice([1, 2, 3, 4, 5]);
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);
    setRolled(false);
    // setMode('hold');
    setSwapSrc(null);
  };

  const commit = (catId: YachtCatId) => {
    if (!canScore) return;
    if (me.scores[catId] !== undefined) return;
    const pts = yScore(catId, dice);
    if (soundEnabled) playScoreCommit();
    const np = players.map((pl, i) =>
      i === turnIdx ? { ...pl, scores: { ...pl.scores, [catId]: pts } } : pl
    );
    setPlayers(np);
    setFlash({ idx: turnIdx, cat: catId });
    if (np.every(pl => yFilled(pl.scores) === Y_CATS.length)) {
      setTimeout(() => setResult(np), 1100);
      return;
    }
    nextTurn(np);
  };

  /* best suggestion */
  const suggestion = ((): { id: YachtCatId; kr: string; v: number } | null => {
    if (!canScore) return null;
    let best: { id: YachtCatId; kr: string; v: number } | null = null;
    for (const c of Y_CATS) {
      if (me.scores[c.id] !== undefined) continue;
      const v = yScore(c.id, dice);
      if (!best || v > best.v) best = { id: c.id, kr: c.kr, v };
    }
    return best !== null && best.v > 0 ? best : null;
  })();

  /* ── Result screen ── */
  if (result) {
    const ranked = [...result]
      .map(p => ({ ...p, total: yTotal(p.scores), upper: yUpperSum(p.scores), lower: yLowerSum(p.scores) }))
      .sort((a, b) => b.total - a.total);
    const winner = ranked[0];

    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <div className="arc-pop" style={{ textAlign: 'center', margin: '20px 0 20px' }}>
            <div className="arc-float" style={{ fontSize: 52, lineHeight: 1, margin: '14px 0 0' }}>⛵</div>
            <h1 style={{
              fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 1, margin: '12px 0 2px',
              color: ACCENT, textShadow: '0 0 18px rgba(126,217,87,.5)',
            }}>WINNER</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: winner.color, boxShadow: `0 0 10px ${winner.color}` }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)', whiteSpace: 'nowrap' }}>{winner.name}</span>
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: 'var(--coin)' }}>{winner.total}점</span>
            </div>
            <p style={{ color: 'var(--dim)', fontSize: 13, margin: '10px auto 0', maxWidth: 320, lineHeight: 1.55 }}>
              주사위 12족보를 모두 채웠습니다 — 최고 합계로 승리!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 14px' }}>
            <span className="arc-lbl" style={{ color: ACCENT }}>SCORE BOARD</span>
            <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg, var(--line-2) 0 8px, transparent 8px 14px)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
            {ranked.map((p, rank) => (
              <div key={p.id} className="arc-panel" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderColor: rank === 0 ? ACCENT_HEX : 'var(--line)',
                boxShadow: rank === 0 ? '0 0 18px -6px var(--green)' : 'none',
              }}>
                <span style={{ fontSize: 17, width: 24, textAlign: 'center' }}>
                  {['🥇', '🥈', '🥉'][rank] ?? '🎲'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, color: rank === 0 ? ACCENT : 'var(--text)' }}>
                      {p.name}
                    </span>
                    {p.scores.yacht === 50 && (
                      <span className="arc-badge" style={{ background: ACCENT_HEX, color: '#06230a' }}>⛵ YACHT</span>
                    )}
                  </div>
                  <div className="pix" style={{ fontSize: 6.5, color: 'var(--faint)', marginTop: 5, paddingLeft: 16 }}>
                    상단 {p.upper} / 하단 {p.lower}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 19, color: 'var(--coin)', minWidth: 48, textAlign: 'right' }}>
                  {p.total}점
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="arc-btn-ghost"
              onClick={onQuit}
              style={{ flex: 1, fontSize: 15, '--c': ACCENT } as React.CSSProperties}
            >
              🚪 로비로
            </button>
            <button
              className="arc-btn"
              onClick={() => {
                const fresh = initPlayers.map(p => ({ ...p, scores: {} }));
                setPlayers(fresh);
                setTurnIdx(0);
                setDice([1, 2, 3, 4, 5]);
                setHeld([false, false, false, false, false]);
                setRollsLeft(3);
                setRolled(false);
                setFlash(null);
                setResult(null);
              }}
              style={{ flex: 1.4, fontSize: 18, background: 'var(--green)', color: '#06230a', borderColor: 'var(--green)' }}
            >
              🔄 다시 하기
            </button>
          </div>
          <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.8 }}>
            GOOD GAME · 한 판 더?
          </p>
        </div>
      </div>
    );
  }

  /* ── Scoresheet ── */
  const colTmpl = `minmax(106px, 1.3fr) repeat(${n}, minmax(52px, 1fr))`;

  const headerCell = (p: YachtPlayer, i: number) => {
    const active = i === turnIdx;
    return (
      <div key={i} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '7px 2px 8px',
        borderBottom: active ? `2px solid ${ACCENT_HEX}` : '2px solid transparent',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.color, boxShadow: active ? `0 0 8px ${p.color}` : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? ACCENT : 'var(--text-2)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </span>
        {active && <span className="pix" style={{ fontSize: 5, color: ACCENT }}>NOW</span>}
      </div>
    );
  };

  const catRow = (cat: typeof Y_CATS[number]) => (
    <div key={cat.id} style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '6px 10px', borderRight: '1px solid var(--line)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15 }}>{cat.kr}</span>
        <span style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2, lineHeight: 1.3 }}>{cat.sub}</span>
      </div>
      {players.map((p, i) => {
        const filled = p.scores[cat.id] !== undefined;
        const active = i === turnIdx;
        let state: 'filled' | 'preview' | 'empty' = 'empty';
        let value: number | null = null;
        if (filled) { state = 'filled'; value = p.scores[cat.id] as number; }
        else if (active && canScore) { state = 'preview'; value = yScore(cat.id, dice); }
        const justFlashed = flash && flash.idx === i && flash.cat === cat.id;
        return (
          <div key={i} className={justFlashed ? 'y-commit' : ''} style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
            padding: 3, borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
            background: active && !filled ? 'rgba(126,217,87,.04)' : 'transparent',
          }}>
            <div style={{ flex: 1, display: 'flex' }}>
              <div style={{ flex: 1 }}>
                <YCell
                  state={state}
                  value={value}
                  active={active}
                  onPick={() => commit(cat.id)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const sectionLabel = (txt: string, border = false) => (
    <div style={{
      gridColumn: `1 / span ${n + 1}`,
      position: 'sticky', left: 0,
      padding: '5px 10px', background: 'var(--bg)',
      fontFamily: 'var(--f-pix)', fontSize: 12, letterSpacing: 1, color: 'var(--dim)',
      borderTop: border ? '1px solid var(--line-2)' : 'none',
    }}>{txt}</div>
  );

  const bonusRow = () => (
    <div style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '5px 10px',
        borderRight: '1px solid var(--line)', borderTop: '1px solid var(--line-2)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', fontFamily: 'var(--f-body)' }}>보너스</span>
        <span style={{ fontSize: 8, color: 'var(--faint)', fontFamily: 'var(--f-pix)', marginTop: 2 }}>≥63 → +35</span>
      </div>
      {players.map((p, i) => {
        const upper = yUpperSum(p.scores);
        const got = upper >= 63;
        return (
          <div key={i} style={{
            background: 'var(--bg)',
            borderTop: '1px solid var(--line-2)',
            borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
          }}>
            {got
              ? <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: 'var(--green)' }}>+35</span>
              : <span style={{ fontSize: 14, color: 'var(--faint)' }}>{upper}/63</span>
            }
          </div>
        );
      })}
    </div>
  );

  const totalRow = (label: string, fn: (s: Partial<Record<YachtCatId, number>>) => number, strong: boolean) => (
    <div style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2,
        background: strong ? 'var(--surface)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', padding: '7px 10px',
        borderRight: '1px solid var(--line)', borderTop: '1px solid var(--line-2)',
      }}>
        <span style={{
          fontSize: strong ? 13 : 11, fontWeight: 800,
          color: strong ? 'var(--text)' : 'var(--text-2)',
          fontFamily: strong ? 'var(--f-title)' : 'var(--f-body)',
        }}>{label}</span>
      </div>
      {players.map((p, i) => (
        <div key={i} style={{
          background: strong ? 'var(--surface)' : 'var(--bg)',
          borderTop: '1px solid var(--line-2)',
          borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
          padding: '2px',
        }}>
          <YCell isTotal state="filled" value={fn(p.scores)} active={i === turnIdx && strong} />
        </div>
      ))}
    </div>
  );

  /* ── Game UI ── */
  return (
    <div className="cabinet">
      <div className="crt" />
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 640, flex: 1, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--line)',
        }}>
          <button className="arc-btn-ghost" onClick={onQuit} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 나가기
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, letterSpacing: 1, color: ACCENT, textShadow: '0 0 12px rgba(126,217,87,.4)' }}>
              ⛵ YACHT
            </div>
            <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 2 }}>
              ROUND {turnNo} / {Y_CATS.length} · {n}P
            </div>
          </div>
          <button
            onClick={toggleSound}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, width: 80, textAlign: 'right', padding: '0 4px' }}
            title={soundEnabled ? '소리 끄기' : '소리 켜기'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 12px 24px' }}>
          {/* Turn banner */}
          <div className="arc-pop" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 13, marginBottom: 14,
            background: `color-mix(in srgb, ${me.color} 14%, var(--surface))`,
            border: `1.5px solid ${me.color}`,
          }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: me.color, boxShadow: `0 0 9px ${me.color}` }} />
            <span style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {me.name}<span style={{ color: 'var(--dim)', fontSize: 13 }}> 님 차례</span>
            </span>
            {!rolled && (
              <span className="blink" style={{ color: ACCENT, fontSize: 11, fontFamily: 'var(--f-pix)', marginLeft: 4 }}>ROLL!</span>
            )}
          </div>

          {/* Dice tray */}
          <div className="arc-panel ticks" style={{ padding: '18px 16px 16px', marginBottom: 16 }}>
            {/* Mode toggle + sort */}
            {rolled && !rolling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                {/* <div className="arc-seg" style={{ flex: 1 }}>
                <button
                  className={mode === 'hold' ? 'on' : ''}
                  onClick={() => { setMode('hold'); setSwapSrc(null); }}
                  style={{ fontSize: 12 }}
                >
                  🤚 HOLD
                </button>
                <button
                  className={mode === 'move' ? 'on' : ''}
                  onClick={() => setMode('move')}
                  style={{ fontSize: 12 }}
                >
                  ↔ 이동
                </button>
              </div> */}
                <button
                  className="arc-btn-ghost"
                  onClick={sortDice}
                  style={{ fontSize: 12, padding: '7px 12px', '--c': ACCENT } as React.CSSProperties}
                  title="눈 숫자 오름차순 정렬"
                >
                  ↑↓ 정렬
                </button>
              </div>
            )}

            <div
              className={rolling ? 'dice-tray-shake' : ''}
              style={{ display: 'flex', justifyContent: 'center', gap: 10, minHeight: 76, alignItems: 'center' }}
            >
              {dice.map((d, i) => (
                rolling && !held[i]
                  ? <Die3D key={i} index={i} />
                  : <YachtDie
                    key={i}
                    value={d}
                    held={held[i]}
                    rolling={rolling}
                    onClick={() => handleDieClick(i)}
                    inactive={!rolled || rolling}
                    selected={swapSrc === i}
                  />
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)', margin: '18px 0 12px', minHeight: 16 }}>
              {!rolled
                ? '🎲 굴려서 턴을 시작하세요'
                : rollsLeft > 0
                  ? '남기고 싶은 주사위를 탭해 고정(HOLD)'
                  : '굴림 끝! 아래 점수표에서 족보를 선택하세요'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="arc-btn"
                onClick={roll}
                disabled={rollsLeft <= 0 || rolling}
                style={{ flex: 1, fontSize: 18, background: 'var(--green)', color: '#06230a', borderColor: 'var(--green)' }}
              >
                🎲 {rolled ? '다시 굴리기' : '굴리기'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 48 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(k => (
                    <span key={k} style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: k < rollsLeft ? 'var(--green)' : 'rgba(255,255,255,.12)',
                      boxShadow: k < rollsLeft ? '0 0 7px var(--green)' : 'none',
                      transition: 'all .2s',
                    }} />
                  ))}
                </div>
                <span className="pix" style={{ fontSize: 6, color: 'var(--faint)' }}>ROLLS</span>
              </div>
            </div>

            {suggestion && (
              <p className="arc-rise" style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)', margin: '8px 0 0' }}>
                💡 최고 추천 <b style={{ color: ACCENT }}>{suggestion.kr} +{suggestion.v}</b>
              </p>
            )}

          </div>
        </div>{/* /top section */}

        <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 24px' }}>
          {/* Scoresheet */}
          <div className="arc-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflow: 'auto', maxHeight: '55vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: colTmpl, minWidth: 'min-content' }}>
                {/* Header row — sticky top + left */}
                <div style={{
                  position: 'sticky', top: 0, left: 0, zIndex: 4, background: 'var(--surface)',
                  display: 'flex', alignItems: 'flex-end', padding: '8px 10px',
                  borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line-2)',
                }}>
                  <span className="pix" style={{ fontSize: 18, color: 'var(--dim)', letterSpacing: 1 }}>족보</span>
                </div>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 3,
                  gridColumn: `2 / span ${n}`,
                  display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`,
                  borderBottom: '1px solid var(--line-2)', background: 'var(--surface)',
                }}>
                  {players.map((p, i) => headerCell(p, i))}
                </div>

                {sectionLabel('▲ 상단 — 같은 눈의 합')}
                {Y_UPPER.map(catRow)}
                {totalRow('상단 합', yUpperSum, false)}
                {bonusRow()}

                {sectionLabel('▼ 하단 — 족보', true)}
                {Y_LOWER.map(catRow)}

                {totalRow('합계 TOTAL', yTotal, true)}
              </div>
            </div>
          </div>

          <button
            className="arc-btn-ghost"
            onClick={() => setResult(players)}
            style={{ marginTop: 14, width: '100%', '--c': ACCENT, color: ACCENT, borderColor: `color-mix(in srgb, var(--green) 40%, transparent)` } as React.CSSProperties}
          >
            🏁 게임 종료 — 결과 보기
          </button>
          <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 10, lineHeight: 1.8 }}>
            TAP A GREEN CELL TO SCORE · 0점으로 버릴 수도 있어요
          </p>
        </div>{/* /scroll section */}
      </div>{/* /flex column */}
    </div>
  );
}

/* ── Page wrapper ── */
function YachtGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const players = (() => {
    const param = searchParams.get('setup');
    if (!param) return null;
    try {
      const setup: PlayerSetup[] = JSON.parse(param);
      return setup.map((p, i): YachtPlayer => ({
        id: i,
        name: p.name.trim() || `플레이어 ${i + 1}`,
        color: p.color,
        scores: {},
      }));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!players) router.replace('/yacht');
  }, []);

  if (!players) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--green)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  return <YachtGame players={players} onQuit={() => router.push('/lobby')} />;
}

export default function YachtGamePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--green)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    }>
      <YachtGameContent />
    </Suspense>
  );
}
