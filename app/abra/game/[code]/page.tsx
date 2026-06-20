'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom, updateGameState, finishGame, registerPresence,
  type AbraOnlineRoom,
} from '@/lib/abra/firebase-game';
import {
  SPELLS, PLAYER_DOTS, spellOf,
  initRound, canDeclare, resolveDeclaration,
  applyEffect, endTurn, checkRoundEnd, scoreRound, goalReached,
} from '@/lib/abra/game-logic';
import { AbraGameState, AbraCastResult, AbraSpell, AbraPlayer } from '@/lib/abra/types';
import { SpellFX, DiceRoll3D } from '../_abra-fx';

const TG: Record<string, string> = { all_dice:'전체', all:'전체', self_dice:'자신', self:'자신', reveal:'비밀', neighbors:'←→', left:'←', right:'→' };

// ─── Shared UI ───────────────────────────────────────────────

function SpellBoard({ castCounts }: { castCounts: number[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
      {SPELLS.map(s => {
        const cast = castCounts?.[s.num - 1] ?? 0;
        const total = s.num;
        const done = cast >= total;
        return (
          <div key={s.num} style={{
            padding: '5px 3px', borderRadius: 8, textAlign: 'center',
            border: `1px solid ${done ? 'rgba(255,255,255,0.07)' : s.color + '48'}`,
            background: done ? 'rgba(0,0,0,.18)' : `color-mix(in srgb, ${s.color} 9%, transparent)`,
            opacity: done ? 0.36 : 1, transition: 'opacity .3s',
          }}>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: done ? 'var(--faint)' : s.color, lineHeight: 1 }}>{s.num}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 1 }}><SpellIcon num={s.num} size={13} /></div>
            <div style={{ fontSize: 12, color: done ? 'var(--faint)' : 'var(--dim)', fontFamily: 'var(--f-pix)', lineHeight: 1 }}>
              {cast}/{total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Hearts({ hp, max }: { hp: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ fontSize: 13, opacity: i < hp ? 1 : 0.18, lineHeight: 1 }}>❤️</span>
      ))}
    </div>
  );
}

function TileChip({ num, faceDown }: { num?: number; faceDown?: boolean }) {
  if (faceDown || num === undefined) {
    return (
      <div style={{
        width: 28, height: 33, borderRadius: 6, border: '1.5px solid var(--line-2)',
        background: 'rgba(0,0,0,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-pix)', fontSize: 11, color: 'var(--faint)',
      }}>?</div>
    );
  }
  const sp = spellOf(num);
  return (
    <div style={{
      width: 28, height: 33, borderRadius: 6,
      border: `1.5px solid ${sp.color}88`,
      background: `linear-gradient(160deg, color-mix(in srgb, ${sp.color} 22%, transparent), color-mix(in srgb, ${sp.color} 8%, transparent))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: sp.color, lineHeight: 1, textShadow: `0 0 8px ${sp.color}66` }}>{num}</span>
    </div>
  );
}

function SecretTile({ num }: { num: number }) {
  return (
    <div style={{
      width: 28, height: 33, borderRadius: 6, border: '1.5px dashed var(--cyan)',
      background: 'rgba(54,224,207,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: 'var(--cyan)', lineHeight: 1, textShadow: '0 0 8px rgba(54,224,207,.5)' }}>{num}</span>
    </div>
  );
}

function SpellIcon({ num, size = 24 }: { num: number; size?: number }) {
  const sp = spellOf(num);
  const c = sp.color;
  const svg = { width: size, height: size, viewBox: '0 0 24 24', style: { display: 'block' as const } };
  switch (num) {
    case 1: return <svg {...svg}><path d="M12 2 13.9 7.4 19.1 4.9 16.6 10.1 22 12 16.6 13.9 19.1 19.1 13.9 16.6 12 22 10.1 16.6 4.9 19.1 7.4 13.9 2 12 7.4 10.1 4.9 4.9 10.1 7.4Z" fill={c}/></svg>;
    case 2: return <svg {...svg}><circle cx="12" cy="12" r="5.5" fill={c}/><ellipse cx="12" cy="12" rx="11" ry="3.8" stroke={c} strokeWidth="2" fill="none" transform="rotate(-20 12 12)"/></svg>;
    case 3: return <svg {...svg}><path d="M2 8C6 4 10 4 12 8C14 12 18 12 22 8" stroke={c} strokeWidth="2.3" fill="none" strokeLinecap="round"/><path d="M2 14C6 10 10 10 12 14C14 18 18 18 22 14" stroke={c} strokeWidth="2.3" fill="none" strokeLinecap="round"/><path d="M5 20C8 16 11 16 14 20" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>;
    case 4: return <svg {...svg}><path d="M2 12C6 5.5 18 5.5 22 12C18 18.5 6 18.5 2 12Z" fill={c + '40'} stroke={c} strokeWidth="1.5"/><circle cx="12" cy="12" r="3.8" fill={c}/><circle cx="13.5" cy="10.5" r="1.3" fill="rgba(255,255,255,.55)"/></svg>;
    case 5: return <svg {...svg}><path d="M13 2 7 12H12L9 22 18 12H13Z" fill={c}/></svg>;
    case 6: return <svg {...svg}><line x1="12" y1="2" x2="12" y2="22" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><line x1="2" y1="12" x2="22" y2="12" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="12" r="3" fill="rgba(10,8,16,1)" stroke={c} strokeWidth="2"/></svg>;
    case 7: return <svg {...svg}><path d="M12 2C10 6 7 9 7 14C7 18.4 9.2 22 12 22C14.8 22 17 18.4 17 14C17 9 14 6 12 2Z" fill={c}/><path d="M8 9C7 7 5 8 5 12C5 15.5 7 18 9 19" fill={c} opacity=".65"/><path d="M16 9C17 7 19 8 19 12C19 15.5 17 18 15 19" fill={c} opacity=".65"/><ellipse cx="12" cy="17.5" rx="2.8" ry="3.5" fill="rgba(255,255,255,.22)"/></svg>;
    case 8: return <svg {...svg}><rect x="9.5" y="2" width="5" height="20" rx="2.5" fill={c}/><rect x="2" y="9.5" width="20" height="5" rx="2.5" fill={c}/></svg>;
    default: return null;
  }
}

function getNeighbors(players: { eliminated: boolean }[], myIdx: number) {
  const n = players.length;
  const alive = (i: number) => !players[i].eliminated;
  let l = -1, r = -1;
  for (let d = 1; d < n; d++) {
    if (l === -1) { const j = (myIdx - d + n) % n; if (alive(j)) l = j; }
    if (r === -1) { const j = (myIdx + d) % n; if (alive(j)) r = j; }
    if (l !== -1 && r !== -1) break;
  }
  return [l, r] as [number, number];
}

function CastOverlay({
  cast, onClose, canClose,
}: {
  cast: AbraCastResult;
  onClose: () => void;
  canClose: boolean;
}) {
  const sp = spellOf(cast.spellNum);
  const isSuccess = cast.success;
  const accent = isSuccess ? sp.color : 'var(--dim)';

  // 주사위가 필요한 경우 DiceRoll3D를 별도 오버레이로 표시 (1: 폭발, 3: 치유의 바람만)
  if ((cast.spellNum === 1 || cast.spellNum === 3) && cast.diceRoll != null) {
    return (
      <DiceRoll3D
        result={cast.diceRoll}
        color={sp.color}
        caption={cast.lines[0]}
        onDone={canClose ? onClose : undefined}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `radial-gradient(circle at 50% 44%, color-mix(in srgb, ${accent} 18%, rgba(12,10,18,.96)) 0%, rgba(12,10,18,.97) 100%)`,
        backdropFilter: 'blur(6px)',
      }}
      onClick={canClose ? onClose : undefined}
    >
      {/* 파티클 FX — 배경 레이어 */}
      {isSuccess && <SpellFX num={cast.spellNum} color={sp.color} />}

      <div
        className={`arc-pop${isSuccess && (cast.spellNum === 1 || cast.spellNum === 5) ? ' abra-fx-shake' : ''}`}
        style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 28px', maxWidth: 320, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 스펠 카드 */}
        {isSuccess ? (
          <>
            <div style={{ width: 160, margin: '0 auto 16px', aspectRatio: '7/10', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: `linear-gradient(165deg, color-mix(in srgb, ${sp.color} 18%, var(--surface)) 0%, var(--bg-2) 100%)`, border: `1.5px solid color-mix(in srgb, ${sp.color} 55%, transparent)`, boxShadow: `inset 0 0 30px -10px ${sp.color}, 0 0 22px -12px ${sp.color}` }}>
              <div style={{ height: 6, background: sp.color, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: sp.color }}>{sp.num}</span>
                  <span className="pix" style={{ fontSize: 12, color: sp.color }}>{sp.en}</span>
                </div>
                <div className={`abra-cast-${cast.spellNum}`} style={{ filter: `drop-shadow(0 0 18px ${sp.color})` }}>
                  <SpellIcon num={cast.spellNum} size={48} />
                </div>
                <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', textAlign: 'center', lineHeight: 1.15, wordBreak: 'keep-all' }}>{sp.kr}</span>
                <span style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.35, wordBreak: 'keep-all' }}>{sp.effect}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 18, color: sp.color, marginBottom: 12, textShadow: `0 0 18px ${sp.color}` }}>
              ABRACA…{sp.kr.toUpperCase()}!
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 12 }}>💨</div>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 22, color: accent, marginBottom: 8 }}>빗나감</div>
          </>
        )}

        {cast.revealedTile !== null && (
          <div style={{ fontSize: 14, color: 'var(--cyan)', marginBottom: 10 }}>
            비밀의 돌: <span style={{ fontFamily: 'var(--f-disp)', fontSize: 22 }}>{cast.revealedTile}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
          {cast.lines.map((l, i) => (
            <div key={i} style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: 'var(--text)' }}>{l}</div>
          ))}
        </div>

        {canClose ? (
          <button onClick={onClose} className="arc-btn arc-btn--violet" style={{ maxWidth: 200, margin: '0 auto' }}>
            확인
          </button>
        ) : (
          <p className="pix blink" style={{ fontSize: 12, color: 'var(--faint)' }}>다음 플레이어 확인 대기 중...</p>
        )}
      </div>
    </div>
  );
}

// ─── Spell modal (bottom sheet) ─────────────────────────────

function SpellModal({
  spell, onDeclare, onClose, players, myIdx,
}: {
  spell: AbraSpell;
  onDeclare: () => void;
  onClose: () => void;
  players: AbraPlayer[];
  myIdx: number;
}) {
  // Compute targeting info for positional spells
  let targetLine = '';
  if (['left', 'right', 'neighbors'].includes(spell.targeting)) {
    const n = players.length;
    const living = (i: number) => !players[i].eliminated;
    const leftOf = () => { for (let d = 1; d < n; d++) { const j = (myIdx - d + n) % n; if (living(j)) return j; } return -1; };
    const rightOf = () => { for (let d = 1; d < n; d++) { const j = (myIdx + d) % n; if (living(j)) return j; } return -1; };
    if (spell.targeting === 'left') {
      const l = leftOf();
      targetLine = l !== -1 ? `← ${players[l].name}` : '← (없음)';
    } else if (spell.targeting === 'right') {
      const r = rightOf();
      targetLine = r !== -1 ? `${players[r].name} →` : '(없음) →';
    } else if (spell.targeting === 'neighbors') {
      const l = leftOf(), r = rightOf();
      targetLine = `← ${l !== -1 ? players[l].name : '없음'}  ·  ${r !== -1 ? players[r].name : '없음'} →`;
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        className="arc-rise"
        style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          background: 'linear-gradient(180deg, rgba(14,12,24,.99) 0%, rgba(8,8,15,1) 100%)',
          border: `1.5px solid color-mix(in srgb, ${spell.color} 35%, rgba(255,255,255,0.07))`,
          borderBottom: 'none', borderRadius: '22px 22px 0 0',
          padding: '8px 20px 36px',
          boxShadow: `0 -16px 48px color-mix(in srgb, ${spell.color} 14%, transparent)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.14)', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <span style={{ lineHeight: 1, filter: `drop-shadow(0 0 12px ${spell.color})` }}><SpellIcon num={spell.num} size={52} /></span>
          <div>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 24, color: spell.color, letterSpacing: .5, lineHeight: 1.1 }}>
              {spell.num} · {spell.en}
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>{spell.kr}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: targetLine ? 10 : 20, padding: '9px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid var(--line)' }}>
          {spell.effect}
        </div>

        {targetLine && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            padding: '10px 14px', borderRadius: 10,
            background: `color-mix(in srgb, ${spell.color} 8%, rgba(0,0,0,.2))`,
            border: `1px solid ${spell.color}44`,
          }}>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 12, color: 'var(--dim)', flexShrink: 0 }}>대상</span>
            <span style={{ fontFamily: 'var(--f-title)', fontSize: 16, color: spell.color, fontWeight: 700 }}>{targetLine}</span>
          </div>
        )}

        <button className="arc-btn arc-btn--violet" onClick={onDeclare} style={{ width: '100%', fontSize: 18, letterSpacing: 1 }}>
          🪄 {spell.en.toUpperCase()}!
        </button>
      </div>
    </div>
  );
}

// ─── Online Game Screen ──────────────────────────────────────

function OnlineGame({
  G: initialG,
  myIdx,
  code,
  isHost,
  onHome,
}: {
  G: AbraGameState;
  myIdx: number;
  code: string;
  isHost: boolean;
  onHome: () => void;
}) {
  const [G, setG] = useState<AbraGameState>(initialG);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; num: number } | null>(null);
  const [memo, setMemo] = useState<Record<number, 0 | 1 | 2>>({});
  const [showExitModal, setShowExitModal] = useState(false);

  // Sync from Firebase
  useEffect(() => {
    setG(initialG);
  }, [initialG]);

  const isMyTurn = G.currentIdx === myIdx;
  const me = myIdx;
  const myPlayer = G.players[me];
  const alive = G.players.filter(p => !p.eliminated).length;

  const writeMemo = useCallback((num: number, state: 0 | 1 | 2) => {
    setMemo(prev => ({ ...prev, [num]: state }));
  }, []);

  // ── Declare (only when it's my turn) ─────────────────────────
  const handleDeclare = useCallback(async () => {
    if (!isMyTurn || selected === null) return;
    const num = selected;
    setSelected(null);
    const next = structuredClone(G);
    const { success } = resolveDeclaration(next, me, num);
    if (success) {
      const eff = applyEffect(next, num, me);
      next.pendingCast = { spellNum: num, success: true, ...eff };
    } else {
      next.pendingCast = {
        spellNum: num, success: false,
        lines: ['체력 -1. 턴 종료.'], diceRoll: null, revealedTile: null,
      };
    }
    setLastResult({ success, num });
    setG(next);
    await updateGameState(code, next);
  }, [G, me, selected, isMyTurn, code]);

  // ── Close cast overlay (only current player) ─────────────────
  const handleCloseCast = useCallback(async () => {
    if (!isMyTurn) return;
    const wasSuccess = lastResult?.success ?? false;
    const next = structuredClone(G);
    next.pendingCast = null;

    if (!wasSuccess) {
      endTurn(next);
      if (checkRoundEnd(next)) scoreRound(next);
      setLastResult(null);
    } else {
      if (checkRoundEnd(next)) scoreRound(next);
    }
    setG(next);
    await updateGameState(code, next);
  }, [G, lastResult, isMyTurn, code]);

  // ── End turn button ───────────────────────────────────────────
  const handleEndTurn = useCallback(async () => {
    if (!isMyTurn) return;
    const next = structuredClone(G);
    endTurn(next);
    setSelected(null);
    setLastResult(null);
    if (checkRoundEnd(next)) scoreRound(next);
    setG(next);
    await updateGameState(code, next);
  }, [G, isMyTurn, code]);

  // ── Next round (host only) ────────────────────────────────────
  const handleNextRound = useCallback(async () => {
    if (!isHost) return;
    const next = structuredClone(G);
    if (goalReached(next)) {
      next.phase = 'game-end';
      setG(next);
      await updateGameState(code, next);
      await finishGame(code);
    } else {
      next.round++;
      initRound(next); // resets phase='game', roundScores=null
      setLastResult(null);
      setG(next);
      await updateGameState(code, next);
    }
  }, [G, isHost, code]);

  // ─────────────────────────────────────────────────────────────
  // ROUND-END SCREEN
  if (G.phase === 'round-end') {
    const sorted = [...G.players]
      .map((p, i) => ({ ...p, i, roundScore: G.roundScores?.[i] ?? 0, total: G.scores[i] ?? 0 }))
      .sort((a, b) => b.total - a.total);
    const reached = goalReached(G);

    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ paddingTop: 20 }}>
          <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {Array.from({ length: 9 }).map((_, i) => <span key={i} className="bulb" />)}
            </div>
            <div style={{ fontSize: 44, margin: '14px 0 0' }}>🔮</div>
            <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 26, letterSpacing: 1, margin: '10px 0 2px', color: 'var(--violet)' }}>
              ROUND {G.round} END
            </h1>
          </div>

          <div className="arc-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--f-body)', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                  {['순위', '플레이어', '이번 라운드', '총점'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontFamily: 'var(--f-pix)', fontSize: 12, color: 'var(--dim)', fontWeight: 400, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, rank) => {
                  const sp = !p.eliminated ? 1 : 0;
                  const rp = p.usedICansee ? 1 : 0;
                  const tp = Math.max(0, p.roundScore - sp - rp);
                  return (
                    <tr key={p.i} style={{ borderBottom: '1px solid var(--line)', background: rank === 0 ? 'rgba(162,116,255,.07)' : undefined }}>
                      <td style={{ padding: '10px 12px' }}>{['🥇', '🥈', '🥉'][rank] ?? '🎮'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: PLAYER_DOTS[p.i], flexShrink: 0, display: 'inline-block' }} />
                          {p.name}{p.i === myIdx ? ' (나)' : ''}{p.eliminated ? ' 💀' : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ color: p.roundScore > 0 ? 'var(--green)' : 'var(--dim)', fontWeight: 800 }}>+{p.roundScore}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                          {sp > 0 && <span style={{ fontSize: 12, color: 'var(--green)', background: 'rgba(126,217,87,.12)', padding: '1px 4px', borderRadius: 3 }}>생존</span>}
                          {tp > 0 && <span style={{ fontSize: 12, color: 'var(--violet)', background: 'rgba(162,116,255,.12)', padding: '1px 4px', borderRadius: 3 }}>타일+{tp}</span>}
                          {rp > 0 && <span style={{ fontSize: 12, color: 'var(--cyan)', background: 'rgba(54,224,207,.12)', padding: '1px 4px', borderRadius: 3 }}>천리안</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--coin)', fontWeight: 800 }}>{p.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isHost ? (
            <button className="arc-btn arc-btn--violet" onClick={handleNextRound} style={{ fontSize: 18 }}>
              {reached ? '🏆 최종 결과!' : `라운드 ${G.round + 1}/${G.maxRounds} 시작 →`}
            </button>
          ) : (
            <p className="pix blink" style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center' }}>
              호스트가 다음 라운드를 시작하길 기다리는 중...
            </p>
          )}
          {reached && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--violet)', marginTop: 12 }}>{G.maxRounds}라운드 종료!</p>}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GAME-END SCREEN
  if (G.phase === 'game-end') {
    const sorted = [...G.players]
      .map((p, i) => ({ ...p, i, total: G.scores[i] ?? 0 }))
      .sort((a, b) => b.total - a.total);
    const winner = sorted[0];

    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ paddingTop: 20 }}>
          <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {Array.from({ length: 9 }).map((_, i) => <span key={i} className="bulb" />)}
            </div>
            <div style={{ fontSize: 52, margin: '14px 0 0' }}>🏆</div>
            <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 1, margin: '12px 0 2px', color: 'var(--violet)', textShadow: '0 0 18px rgba(162,116,255,.6)' }}>
              WINNER
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: PLAYER_DOTS[winner.i], boxShadow: `0 0 10px ${PLAYER_DOTS[winner.i]}`, display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)' }}>{winner.name}</span>
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: 'var(--coin)' }}>{winner.total}점</span>
            </div>
          </div>

          <div className="arc-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--f-body)', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                  {['순위', '플레이어', '최종 점수'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontFamily: 'var(--f-pix)', fontSize: 12, color: 'var(--dim)', fontWeight: 400, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, rank) => (
                  <tr key={p.i} style={{ borderBottom: '1px solid var(--line)', background: rank === 0 ? 'rgba(162,116,255,.07)' : undefined }}>
                    <td style={{ padding: '10px 12px' }}>{['🥇', '🥈', '🥉'][rank] ?? '🎮'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: PLAYER_DOTS[p.i], flexShrink: 0, display: 'inline-block' }} />
                        {p.name}{p.i === myIdx ? ' (나)' : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--coin)', fontWeight: 800 }}>{p.total}점</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="arc-btn-ghost" onClick={onHome} style={{ width: '100%' }}>🚪 홈으로</button>
          <p className="pix" style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.8 }}>GOOD GAME · 한 판 더?</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GAME SCREEN
  const currentPlayer = G.players[G.currentIdx];
  const [leftIdx, rightIdx] = getNeighbors(G.players, myIdx);

  return (
    <div className="cabinet">
      <div className="crt" />

      {/* Cast overlay */}
      {G.pendingCast && (
        <CastOverlay cast={G.pendingCast} onClose={handleCloseCast} canClose={isMyTurn} />
      )}

      {/* 주문 선언 모달 (내 차례일 때만) */}
      {selected !== null && isMyTurn && (
        <SpellModal
          spell={spellOf(selected)}
          onDeclare={handleDeclare}
          onClose={() => setSelected(null)}
          players={G.players}
          myIdx={myIdx}
        />
      )}

      {showExitModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="arc-panel arc-rise" style={{ width: 280, padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36 }}>🚪</div>
            <div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>게임을 나가시겠습니까?</div>
              <div className="pix" style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.8 }}>현재 게임 진행이 종료됩니다</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="arc-btn-ghost" onClick={() => setShowExitModal(false)} style={{ flex: 1 }}>취소</button>
              <button className="arc-btn arc-btn--violet" onClick={onHome} style={{ flex: 1 }}>나가기</button>
            </div>
          </div>
        </div>
      )}

      <div className="arc-screen" style={{ paddingTop: 12, paddingBottom: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 8px' }}>
          <button className="arc-btn-ghost" onClick={() => setShowExitModal(true)} style={{ fontSize: 13, padding: '8px 12px' }}>✕</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span className="pix" style={{ fontSize: 12, color: 'var(--violet)' }}>ROUND {G.round}/{G.maxRounds}</span>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: isMyTurn ? 'var(--violet)' : 'var(--text)' }}>
              {isMyTurn ? '내 차례!' : `${currentPlayer.name}의 차례`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span className="pix" style={{ fontSize: 12, color: 'var(--faint)' }}>생존 {alive}명</span>
            <Hearts hp={myPlayer.hp} max={G.maxHp} />
          </div>
        </div>

        {/* SpellBoard */}
        <div className="arc-panel-inset" style={{ marginBottom: 12, padding: '10px 10px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span className="arc-lbl">주문 현황</span>
            <span className="pix" style={{ fontSize: 12, color: 'var(--faint)' }}>덱 {G.deck.length} · 비밀 {G.secretPile.length}</span>
          </div>
          <SpellBoard castCounts={G.castCounts} />
        </div>

        {/* Combo */}
        {G.combo !== null && (
          <div style={{ margin: '0 0 8px', padding: '7px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(162,116,255,.1)', border: '1px solid rgba(162,116,255,.3)' }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 28, color: 'var(--violet)', lineHeight: 1 }}>{G.combo}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 700 }}>콤보 진행 중</div>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>{G.combo} 이하 선언 · 또는 턴 종료</div>
            </div>
          </div>
        )}

        {/* 플레이어 카드 — 나 포함 전원 */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 6, marginBottom: 12 }}>
          {G.players.map((p, i) => {
            const isMe = i === myIdx;
            const isCurrent = i === G.currentIdx;
            const neighborTag = i === leftIdx ? '◀ 내 왼쪽' : i === rightIdx ? '내 오른쪽 ▶' : null;
            return (
              <div
                key={i}
                className={`arc-panel-inset${isCurrent ? ' abra-turn-active' : ''}`}
                style={{
                  '--turn': p.dot,
                  flexShrink: 0, width: 124, padding: 10, borderRadius: 12,
                  opacity: p.eliminated ? 0.4 : 1,
                  background: isMe ? `color-mix(in srgb, ${p.dot} 10%, var(--surface))` : undefined,
                } as React.CSSProperties}
              >
                {neighborTag && (
                  <div style={{ fontFamily: 'var(--f-pix)', fontSize: 12, color: 'var(--cyan)', marginBottom: 4 }}>{neighborTag}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: p.dot, boxShadow: `0 0 7px ${p.dot}`, display: 'inline-block', marginTop: 3 }} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: isMe ? p.dot : 'var(--text)', flex: 1, wordBreak: 'break-all', lineHeight: 1.3 }}>
                    {p.name}{isMe && ' (나)'}
                  </span>
                  {isCurrent && <span className="pix" style={{ fontSize: 12, color: p.dot, flexShrink: 0 }}>NOW</span>}
                  {p.eliminated && <span style={{ fontSize: 11 }}>💀</span>}
                </div>
                <Hearts hp={p.hp} max={G.maxHp} />
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 7 }}>
                  {isMe
                    ? p.tiles.map((_, ti) => <TileChip key={ti} faceDown />)
                    : p.tiles.map((t, ti) => <TileChip key={ti} num={t} />)}
                  {p.secretRevealed.map((t, ti) => <SecretTile key={`s${ti}`} num={t} />)}
                </div>
                {p.secretRevealed.length > 0 && (
                  <div style={{ fontFamily: 'var(--f-pix)', fontSize: 12, color: 'var(--cyan)', marginTop: 4 }}>
                    👁 비밀 {p.secretRevealed.length}개
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Last result flash */}
        {lastResult && !G.pendingCast && (
          <div style={{
            padding: '8px 14px', borderRadius: 10, marginBottom: 10, fontSize: 14, fontWeight: 700, textAlign: 'center',
            background: lastResult.success ? 'rgba(126,217,87,.1)' : 'rgba(255,90,77,.1)',
            border: `1px solid ${lastResult.success ? 'rgba(126,217,87,.3)' : 'rgba(255,90,77,.3)'}`,
            color: lastResult.success ? 'var(--green)' : 'var(--red)',
          }}>
            {lastResult.success
              ? `✓ ${lastResult.num} HIT! ${spellOf(lastResult.num).en}`
              : `✗ ${lastResult.num} 없음 — 체력 -1`}
          </div>
        )}

        {/* 타일 메모 */}
        <div style={{ marginBottom: 8 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 5 }}>내 타일 메모</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {SPELLS.map(s => {
              const mState = memo[s.num] ?? 0;
              const nextState: 0 | 1 | 2 = mState === 0 ? 1 : mState === 1 ? 2 : 0;
              const borderColor = mState === 0 ? 'var(--line)' : mState === 1 ? 'rgba(126,217,87,.5)' : 'rgba(255,90,77,.5)';
              return (
                <button
                  key={s.num}
                  onClick={() => writeMemo(s.num, nextState)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    aspectRatio: '1', borderRadius: 8, padding: '4px 2px',
                    border: `1px solid ${borderColor}`,
                    background: mState === 0 ? 'rgba(0,0,0,.15)' : mState === 1 ? 'rgba(126,217,87,.1)' : 'rgba(255,90,77,.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    position: 'relative', transition: 'all .1s',
                  }}
                >
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: mState === 0 ? 'var(--faint)' : mState === 1 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>{s.num}</span>
                  {mState !== 0 && (
                    <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7, fontWeight: 800, color: mState === 1 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                      {mState === 1 ? '✓' : '✕'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spell grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          {SPELLS.map(s => {
            const locked = !isMyTurn || !canDeclare(G, myIdx, s.num);
            const mState = memo[s.num] ?? 0;
            return (
              <button
                key={s.num}
                disabled={locked}
                onClick={() => setSelected(s.num)}
                style={{
                  position: 'relative', appearance: 'none',
                  border: `1.5px solid ${locked ? 'rgba(255,255,255,0.06)' : `${s.color}55`}`,
                  borderRadius: 12, padding: '10px 4px 8px', cursor: locked ? 'not-allowed' : 'pointer',
                  background: locked ? 'rgba(0,0,0,.1)' : `color-mix(in srgb, ${s.color} 7%, rgba(0,0,0,.2))`,
                  opacity: locked ? 0.28 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all .12s',
                }}
              >
                {mState !== 0 && (
                  <span style={{
                    position: 'absolute', top: 3, right: 4,
                    fontSize: 8, fontWeight: 800, lineHeight: 1,
                    color: mState === 1 ? 'var(--green)' : 'var(--red)',
                  }}>{mState === 1 ? '✓' : '✕'}</span>
                )}
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: locked ? 'var(--faint)' : s.color, lineHeight: 1, textShadow: locked ? 'none' : `0 0 10px ${s.color}88` }}>{s.num}</span>
                <SpellIcon num={s.num} size={18} />
                <span style={{ fontSize: 12, fontWeight: 700, color: locked ? 'var(--faint)' : 'var(--dim)', whiteSpace: 'nowrap', lineHeight: 1 }}>{s.kr}</span>
                <span style={{ fontSize: 12, color: locked ? 'var(--faint)' : s.color + 'bb', lineHeight: 1 }}>{TG[s.targeting]}</span>
              </button>
            );
          })}
        </div>

        {/* Turn end (combo) or waiting message */}
        {isMyTurn ? (
          G.combo !== null && (
            <button className="arc-btn-ghost" onClick={handleEndTurn} style={{ width: '100%', fontSize: 13, marginBottom: 10 }}>
              ↩ 턴 종료 (콤보 끝내기)
            </button>
          )
        ) : (
          <p className="pix blink" style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', marginBottom: 10 }}>
            {currentPlayer.name}의 차례입니다...
          </p>
        )}

        {/* My area */}
        <div style={{ borderTop: '1.5px solid var(--line)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="arc-lbl" style={{ color: 'var(--violet)' }}>내 타일 (비공개)</span>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>
              {myPlayer.tiles.length}장{myPlayer.secretRevealed.length > 0 && <span style={{ color: 'var(--cyan)' }}> +비밀 {myPlayer.secretRevealed.length}</span>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {myPlayer.tiles.map((_, i) => <TileChip key={i} faceDown />)}
            {myPlayer.secretRevealed.map((t, i) => <SecretTile key={`s${i}`} num={t} />)}
          </div>

        </div>

        {/* Log */}
        {G.log.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>게임 로그</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {G.log.slice(0, 4).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: i === 0 ? 'var(--text-2)' : 'var(--faint)', padding: '4px 9px', borderRadius: 7, background: 'rgba(0,0,0,.18)', border: '1px solid var(--line)' }}>
                  <b style={{ color: G.players[e.who]?.dot ?? 'var(--violet)' }}>{e.name}</b>: {e.txt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function AbraOnlinePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<AbraOnlineRoom | null>(null);
  const [leftPlayerName, setLeftPlayerName] = useState<string | null>(null);
  const allPresentRef = useRef(false);

  const uid = getGuestUid() ?? '';

  // Presence 등록: 연결 끊기면 Firebase가 자동 제거
  useEffect(() => {
    if (!uid) return;
    let cleanup: (() => void) | undefined;
    registerPresence(code, uid).then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [code, uid]);

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/abra'); return; }
      setRoom(r);

      // 상대 나가기 감지
      if (r.status === 'playing' && r.presence) {
        const allPresent = r.players.every(p => r.presence![p.clientId]);
        if (allPresent) allPresentRef.current = true;

        if (allPresentRef.current) {
          const missing = r.players.find(p => p.clientId !== uid && !r.presence![p.clientId]);
          if (missing) {
            setLeftPlayerName(missing.name);
            finishGame(code, missing.name);
          }
        }
      }

      // 다른 클라이언트가 먼저 감지한 경우
      if (r.status === 'finished' && r.leftPlayerName && r.gameState?.phase !== 'game-end') {
        setLeftPlayerName(r.leftPlayerName);
      }
    });
    return unsub;
  }, [code, router, uid]);

  if (leftPlayerName) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>🚪</div>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', lineHeight: 1.3 }}>
            {leftPlayerName}님이<br />게임을 나갔습니다
          </div>
          <p style={{ fontSize: 13, color: 'var(--dim)', margin: 0 }}>게임이 종료되었습니다.</p>
          <button className="arc-btn arc-btn--violet" onClick={() => router.replace('/abra')} style={{ marginTop: 8 }}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!room || !room.gameState) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  const myIdx = room.gameState.players.findIndex(p => p.clientId === uid);
  if (myIdx === -1) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--red)' }}>이 게임에 참가되어 있지 않습니다.</p>
          <button className="arc-btn arc-btn--violet" onClick={() => router.replace('/abra')} style={{ marginTop: 16 }}>돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <OnlineGame
      G={room.gameState}
      myIdx={myIdx}
      code={code}
      isHost={room.hostClientId === uid}
      onHome={() => router.replace('/abra')}
    />
  );
}
