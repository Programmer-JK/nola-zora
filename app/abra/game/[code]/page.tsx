'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom, updateGameState, finishGame,
  type AbraOnlineRoom,
} from '@/lib/abra/firebase-game';
import {
  SPELLS, PLAYER_DOTS, spellOf,
  initRound, canDeclare, resolveDeclaration,
  applyEffect, endTurn, checkRoundEnd, scoreRound, goalReached,
} from '@/lib/abra/game-logic';
import { AbraGameState, AbraCastResult } from '@/lib/abra/types';

// ─── Shared UI ───────────────────────────────────────────────

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
      border: `1.5px solid ${sp.color}`,
      background: `color-mix(in srgb, ${sp.color} 16%, transparent)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
    }}>
      <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: sp.color, lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 9, lineHeight: 1 }}>{sp.emoji}</span>
    </div>
  );
}

function SecretTile({ num }: { num: number }) {
  return (
    <div style={{
      width: 28, height: 33, borderRadius: 6, border: '1.5px dashed var(--cyan)',
      background: 'rgba(54,224,207,.1)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1,
    }}>
      <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: 'var(--cyan)', lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 9, lineHeight: 1 }}>👁</span>
    </div>
  );
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 44%, color-mix(in srgb, ${accent} 18%, rgba(12,10,18,.96)) 0%, rgba(12,10,18,.97) 100%)`,
      backdropFilter: 'blur(6px)',
    }}>
      <div className="arc-pop" style={{ textAlign: 'center', padding: '0 28px', maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 12, filter: isSuccess ? `drop-shadow(0 0 18px ${accent})` : 'none' }}>
          {isSuccess ? sp.emoji : '💨'}
        </div>
        <div style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 1, color: accent, marginBottom: 4 }}>
          {isSuccess ? sp.kr.toUpperCase() : '빗나감'}
        </div>
        <div style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: isSuccess ? accent : 'var(--faint)', marginBottom: 20, opacity: 0.8 }}>
          {isSuccess ? `${sp.num} · ${sp.en}` : 'MISS'}
        </div>

        {cast.diceRoll !== null && (
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 56, color: 'var(--coin)', lineHeight: 1, marginBottom: 12, textShadow: '0 0 20px rgba(255,216,77,.6)' }}>
            {cast.diceRoll}
          </div>
        )}

        {cast.revealedTile !== null && (
          <div style={{ fontSize: 15, color: 'var(--cyan)', marginBottom: 12 }}>
            비밀의 돌: <span style={{ fontFamily: 'var(--f-disp)', fontSize: 24 }}>{cast.revealedTile}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {cast.lines.map((l, i) => (
            <div key={i} style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: 'var(--text)' }}>{l}</div>
          ))}
        </div>

        {canClose ? (
          <button onClick={onClose} className="arc-btn arc-btn--violet" style={{ maxWidth: 200, margin: '0 auto' }}>
            확인
          </button>
        ) : (
          <p className="pix blink" style={{ fontSize: 8, color: 'var(--faint)' }}>다음 플레이어 확인 대기 중...</p>
        )}
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

  // Sync from Firebase
  useEffect(() => {
    setG(initialG);
  }, [initialG]);

  const isMyTurn = G.currentIdx === myIdx;
  const me = myIdx;
  const myPlayer = G.players[me];
  const alive = G.players.filter(p => !p.eliminated).length;

  const cycleMemo = useCallback((num: number) => {
    setMemo(prev => ({ ...prev, [num]: (((prev[num] ?? 0) + 1) % 3) as 0 | 1 | 2 }));
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
                    <th key={h} style={{ padding: '10px 12px', fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--dim)', fontWeight: 400, textAlign: 'left' }}>{h}</th>
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
                        {p.name}{p.i === myIdx ? ' (나)' : ''}{p.eliminated ? ' 💀' : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: p.roundScore > 0 ? 'var(--green)' : 'var(--dim)' }}>+{p.roundScore}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--coin)', fontWeight: 800 }}>{p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isHost ? (
            <button className="arc-btn arc-btn--violet" onClick={handleNextRound} style={{ fontSize: 18 }}>
              {reached ? '🏆 최종 결과!' : `라운드 ${G.round + 1} 시작 →`}
            </button>
          ) : (
            <p className="pix blink" style={{ fontSize: 8, color: 'var(--dim)', textAlign: 'center' }}>
              호스트가 다음 라운드를 시작하길 기다리는 중...
            </p>
          )}
          {reached && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--violet)', marginTop: 12 }}>목표 점수 {G.goalScore}점 도달!</p>}
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
                    <th key={h} style={{ padding: '10px 12px', fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--dim)', fontWeight: 400, textAlign: 'left' }}>{h}</th>
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
          <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.8 }}>GOOD GAME · 한 판 더?</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GAME SCREEN
  const sp = selected !== null ? spellOf(selected) : null;
  const currentPlayer = G.players[G.currentIdx];

  return (
    <div className="cabinet">
      <div className="crt" />

      {/* Cast overlay */}
      {G.pendingCast && (
        <CastOverlay cast={G.pendingCast} onClose={handleCloseCast} canClose={isMyTurn} />
      )}

      <div className="arc-screen" style={{ paddingTop: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 8px' }}>
          <button className="arc-btn-ghost" onClick={() => { if (confirm('게임을 나가시겠습니까?')) onHome(); }} style={{ fontSize: 13, padding: '8px 12px' }}>✕</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span className="pix" style={{ fontSize: 8, color: 'var(--violet)' }}>ROUND {G.round}</span>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: isMyTurn ? 'var(--violet)' : 'var(--text)' }}>
              {isMyTurn ? '내 차례!' : `${currentPlayer.name}의 차례`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>생존 {alive}명</span>
            <Hearts hp={myPlayer.hp} max={G.maxHp} />
          </div>
        </div>

        {/* Combo */}
        {G.combo !== null && (
          <div style={{ margin: '0 0 8px', padding: '7px 12px', borderRadius: 8, background: 'rgba(162,116,255,.1)', border: '1px solid rgba(162,116,255,.3)', fontSize: 13, color: 'var(--violet)', textAlign: 'center' }}>
            ⚡ 콤보 진행 중 · {G.combo} 이하만 선언 가능
          </div>
        )}

        {/* Opponent cards — all players except me */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 10, paddingBottom: 6, marginBottom: 12 }}>
          {G.players.map((p, i) => {
            if (i === myIdx) return null;
            const isCurrent = i === G.currentIdx;
            const dotStyle = { background: p.dot, boxShadow: `0 0 8px ${p.dot}` };
            return (
              <div key={i} className="arc-panel-inset" style={{
                flexShrink: 0, width: 130, padding: 11, borderRadius: 14,
                opacity: p.eliminated ? 0.4 : 1,
                borderColor: isCurrent ? 'rgba(162,116,255,.4)' : 'var(--line)',
                background: isCurrent ? 'rgba(162,116,255,.06)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, ...dotStyle, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: isCurrent ? 'var(--violet)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {p.eliminated && <span style={{ marginLeft: 'auto', fontSize: 13 }}>💀</span>}
                </div>
                <Hearts hp={p.hp} max={G.maxHp} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {p.tiles.map((t, ti) => <TileChip key={ti} num={t} />)}
                  {p.secretRevealed.map((t, ti) => <SecretTile key={`s${ti}`} num={t} />)}
                </div>
                {isCurrent && !isMyTurn && (
                  <div style={{ marginTop: 6, fontSize: 10, color: 'var(--violet)', fontWeight: 700, textAlign: 'center' }}>
                    ← 차례
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
              ? `✓ ${lastResult.num} 적중! ${spellOf(lastResult.num).kr} 발동`
              : `✗ ${lastResult.num} 없음 — 체력 -1`}
          </div>
        )}

        {/* Spell grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          {SPELLS.map(s => {
            const locked = !isMyTurn || !canDeclare(G, myIdx, s.num);
            const on = selected === s.num;
            return (
              <button
                key={s.num}
                disabled={locked}
                onClick={() => setSelected(prev => prev === s.num ? null : s.num)}
                style={{
                  appearance: 'none', border: `1.5px solid ${on ? s.color : 'var(--line-2)'}`,
                  borderRadius: 10, padding: '8px 4px', cursor: locked ? 'not-allowed' : 'pointer',
                  background: on ? `color-mix(in srgb, ${s.color} 22%, var(--surface))` : 'rgba(0,0,0,.22)',
                  opacity: locked ? 0.3 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all .12s',
                }}
              >
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 18, color: on ? s.color : 'var(--text)', textShadow: on ? `0 0 12px ${s.color}` : 'none', lineHeight: 1 }}>{s.num}</span>
                <span style={{ fontSize: 15 }}>{s.emoji}</span>
                <span style={{ fontSize: 8, color: on ? 'var(--text)' : 'var(--faint)', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.kr}</span>
              </button>
            );
          })}
        </div>

        {/* Spell preview */}
        {sp && isMyTurn && (
          <div className="arc-rise" style={{
            marginBottom: 10, padding: '9px 12px', borderRadius: 10,
            background: `color-mix(in srgb, ${sp.color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${sp.color} 40%, transparent)`,
            fontSize: 12, color: 'var(--text-2)',
          }}>
            <b style={{ color: sp.color }}>{sp.num} · {sp.kr}</b> — {sp.effect}
          </div>
        )}

        {/* Action buttons */}
        {isMyTurn ? (
          <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
            <button
              className="arc-btn arc-btn--violet"
              disabled={selected === null}
              onClick={handleDeclare}
              style={{ flex: 1.6, fontSize: 17 }}
            >
              🪄 선언하기
            </button>
            {G.combo !== null && (
              <button className="arc-btn-ghost" onClick={handleEndTurn} style={{ flex: 1, fontSize: 14 }}>
                턴 종료
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 18, padding: '12px', borderRadius: 10, background: 'rgba(0,0,0,.22)', border: '1px solid var(--line)', textAlign: 'center' }}>
            <p className="pix blink" style={{ fontSize: 8, color: 'var(--dim)', margin: 0 }}>
              {currentPlayer.name}의 차례입니다...
            </p>
          </div>
        )}

        {/* My area */}
        <div style={{ borderTop: '1.5px solid var(--line)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="arc-lbl" style={{ color: 'var(--violet)' }}>내 타일 (비공개)</span>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>총 {myPlayer.tiles.length}장</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {myPlayer.tiles.map((_, i) => <TileChip key={i} faceDown />)}
            {myPlayer.secretRevealed.map((t, i) => <SecretTile key={`s${i}`} num={t} />)}
          </div>

          {/* Memo */}
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>메모 (내 타일 추측)</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
            {SPELLS.map(s => {
              const state = memo[s.num] ?? 0;
              const col = state === 1 ? 'var(--green)' : state === 2 ? 'var(--red)' : 'var(--line-2)';
              return (
                <button
                  key={s.num}
                  onClick={() => cycleMemo(s.num)}
                  style={{
                    position: 'relative', appearance: 'none', border: `1.5px solid ${col}`,
                    background: state ? `color-mix(in srgb, ${col} 18%, transparent)` : 'rgba(0,0,0,.2)',
                    borderRadius: 8, padding: '5px 2px',
                    color: state === 2 ? 'var(--red)' : state === 1 ? 'var(--green)' : 'var(--dim)',
                    cursor: 'pointer', fontFamily: 'var(--f-disp)', fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {s.num}
                  <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 8 }}>
                    {state === 1 ? '✓' : state === 2 ? '✕' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Log */}
        {G.log.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>게임 로그</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {G.log.slice(0, 5).map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '5px 10px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid var(--line)' }}>
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

  const uid = getGuestUid() ?? '';

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/abra'); return; }
      setRoom(r);
    });
    return unsub;
  }, [code, router]);

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
