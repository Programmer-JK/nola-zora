'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom,
  selectTileAtomic,
  resolveRoundAtomic,
  type OnlineRoom,
} from '@/lib/guryongtu/firebase-game';
import { GameState, GamePhase, TileValue } from '@/lib/guryongtu/types';
import { getBgm, sfx } from '@/lib/guryongtu/sounds';

const RED = '#ff3333';
const BLUE = '#4488ff';
const ALL_TILES: TileValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── 도트 픽셀 타일 ────────────────────────────────────────────
function PixelTile({
  value,
  faceDown = false,
  selected = false,
  used = false,
  disabled = false,
  onClick,
  size = 'md',
}: {
  value: TileValue | null;
  faceDown?: boolean;
  selected?: boolean;
  used?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 72 : size === 'md' ? 54 : 40;
  const fontSize = size === 'lg' ? 26 : size === 'md' ? 19 : 14;
  const isSpecial = value === 1 && !faceDown;

  return (
    <button
      onClick={onClick}
      disabled={disabled || used || !onClick}
      style={{
        width: dim, height: dim,
        background: used
          ? 'rgba(255,255,255,0.04)'
          : faceDown
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : selected
          ? `linear-gradient(135deg, ${RED}33, ${RED}11)`
          : 'linear-gradient(135deg, #1e1e3a 0%, #12122a 100%)',
        border: `2px solid ${
          used ? 'rgba(255,255,255,0.06)'
          : faceDown ? '#333355'
          : selected ? RED
          : isSpecial ? `${RED}88`
          : '#334'
        }`,
        borderRadius: 4,
        cursor: disabled || used || !onClick ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-pix)',
        fontSize,
        color: used
          ? 'rgba(255,255,255,0.12)'
          : faceDown ? 'transparent'
          : selected ? RED
          : isSpecial ? RED
          : '#ccc',
        boxShadow: selected
          ? `0 0 14px ${RED}66, inset 0 0 8px ${RED}22`
          : faceDown && !used
          ? '0 2px 8px rgba(0,0,0,0.5)'
          : 'none',
        transition: 'all 0.15s',
        imageRendering: 'pixelated',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {faceDown && !used && (
        <span style={{ fontSize: size === 'lg' ? 24 : 16, opacity: 0.4 }}>🐉</span>
      )}
      {!faceDown && value !== null && (
        <span style={{ textShadow: selected || isSpecial ? `0 0 8px ${RED}` : 'none' }}>
          {value}
        </span>
      )}
      <span style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 4px)',
        pointerEvents: 'none',
      }} />
    </button>
  );
}

// ── 승리 램프 ─────────────────────────────────────────────────
function Lamps({ wins, color }: { wins: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          width: 12, height: 12, borderRadius: 2,
          background: i < wins ? color : 'rgba(255,255,255,0.08)',
          boxShadow: i < wins ? `0 0 6px ${color}` : 'none',
          display: 'block',
          imageRendering: 'pixelated',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  );
}

// ── 게임 승리 별 ──────────────────────────────────────────────
function GameWinStars({ wins, color }: { wins: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1].map(i => (
        <span key={i} className="pix" style={{
          fontSize: 17,
          color: i < wins ? color : 'rgba(255,255,255,0.1)',
          textShadow: i < wins ? `0 0 8px ${color}` : 'none',
          transition: 'all 0.3s',
        }}>★</span>
      ))}
    </div>
  );
}

export default function GuryongtuGamePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const uid = getGuestUid() ?? '';

  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [localTile, setLocalTile] = useState<TileValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealBlink, setRevealBlink] = useState(true);
  const [muted, setMuted] = useState(false);
  const resolveRef = useRef(false);
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevRoundRef = useRef<number>(-1);

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r) { router.replace('/guryongtu'); return; }
      setRoom(r);
    });
    return unsub;
  }, [code, router]);

  const gs = room?.gameState ?? null;

  // BGM
  useEffect(() => {
    const bgm = getBgm();
    if (!muted) bgm.play();
    else bgm.stop();
    return () => { bgm.stop(); };
  }, [muted]);

  // 자동 결산
  useEffect(() => {
    if (!gs || gs.phase !== 'revealing') {
      resolveRef.current = false;
      setRevealBlink(true);
      return;
    }
    setRevealBlink(true);
    const t1 = setTimeout(() => setRevealBlink(false), 1500);
    const t2 = setTimeout(async () => {
      if (resolveRef.current) return;
      resolveRef.current = true;
      await resolveRoundAtomic(code);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [gs?.phase, gs?.currentRound, code]);

  // 사운드
  useEffect(() => {
    if (!gs || muted) return;
    const phase = gs.phase;
    const round = gs.currentRound;
    const prevPhase = prevPhaseRef.current;
    const prevRound = prevRoundRef.current;
    prevPhaseRef.current = phase;
    prevRoundRef.current = round;

    if (phase === 'revealing' && prevPhase !== 'revealing') {
      sfx.reveal();
      const myIdx = gs.players.findIndex(p => p.id === uid);
      if (myIdx !== -1) {
        const p0Tile = gs.players[0].selectedTile;
        const p1Tile = gs.players[1].selectedTile;
        if (p0Tile !== null && p1Tile !== null) {
          let outcome: 'p0' | 'p1' | 'draw' = 'draw';
          if (p0Tile === p1Tile) outcome = 'draw';
          else if (p0Tile === 1 && p1Tile === 9) outcome = 'p0';
          else if (p1Tile === 1 && p0Tile === 9) outcome = 'p1';
          else outcome = p0Tile > p1Tile ? 'p0' : 'p1';
          const iWon = (outcome === 'p0' && myIdx === 0) || (outcome === 'p1' && myIdx === 1);
          setTimeout(() => {
            if (outcome === 'draw') sfx.draw();
            else if (iWon) sfx.win();
            else sfx.lose();
          }, 1500);
        }
      }
    }

    if (phase === 'selecting' && prevPhase === 'revealing' && round !== prevRound) {
      setLocalTile(null);
      setSubmitting(false);
    }

    if (phase === 'match-over' && prevPhase !== 'match-over') {
      const iWon = gs.matchWinnerId === uid;
      setTimeout(() => { if (iWon) sfx.victory(); else sfx.defeat(); }, 300);
    }
  }, [gs?.phase, gs?.currentRound, muted, uid]);

  const myIdx = gs ? gs.players.findIndex(p => p.id === uid) : -1;
  const isMyTurn = gs?.phase === 'selecting' && myIdx !== -1;

  const handleSelectTile = useCallback(async (tile: TileValue) => {
    if (!gs || gs.phase !== 'selecting' || submitting || myIdx === -1) return;
    if (gs.players[myIdx].selectedTile !== null) return;
    sfx.tileClick();
    setLocalTile(tile);
    setSubmitting(true);
    try {
      await selectTileAtomic(code, myIdx, tile);
      sfx.tileSubmit();
    } catch (e) {
      console.error(e);
      setLocalTile(null);
      setSubmitting(false);
    }
  }, [gs, myIdx, code, submitting]);

  if (!room || !gs) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 11, color: 'var(--dim)' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  const p0 = gs.players[0];
  const p1 = gs.players[1];
  const me = myIdx !== -1 ? gs.players[myIdx] : null;
  const opp = myIdx !== -1 ? gs.players[myIdx === 0 ? 1 : 0] : null;
  const myColor = myIdx === 0 ? RED : BLUE;
  const oppColor = myIdx === 0 ? BLUE : RED;

  const isRevealing = gs.phase === 'revealing';
  const isGameOver = gs.phase === 'match-over';

  const myCommittedTile = me?.selectedTile ?? null;
  const oppCommittedTile = opp?.selectedTile ?? null;
  const myDisplayTile = myCommittedTile ?? localTile;
  const iSelected = myCommittedTile !== null || localTile !== null;

  let revealWinner: 'me' | 'opp' | 'draw' | null = null;
  if (isRevealing && myCommittedTile !== null && oppCommittedTile !== null) {
    if (myCommittedTile === oppCommittedTile) revealWinner = 'draw';
    else if (myCommittedTile === 1 && oppCommittedTile === 9) revealWinner = 'me';
    else if (oppCommittedTile === 1 && myCommittedTile === 9) revealWinner = 'opp';
    else revealWinner = myCommittedTile > oppCommittedTile ? 'me' : 'opp';
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ padding: '12px 0 20px', gap: 0 }}>

        {/* ── 헤더 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className="pix" style={{ fontSize: 10, color: RED, opacity: 0.85 }}>{p0.name.slice(0, 6)}</span>
            <GameWinStars wins={p0.gameWins} color={RED} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="pix" style={{ fontSize: 9, color: 'var(--faint)', marginBottom: 3 }}>
              GAME {gs.currentGameNumber}
            </div>
            <div className="pix" style={{ fontSize: 16, color: 'var(--gold)' }}>
              R{gs.currentRound}/9
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className="pix" style={{ fontSize: 10, color: BLUE, opacity: 0.85 }}>{p1.name.slice(0, 6)}</span>
              <GameWinStars wins={p1.gameWins} color={BLUE} />
            </div>
            <button
              onClick={() => setMuted(m => !m)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, opacity: muted ? 0.3 : 0.7, padding: 2,
              }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* ── 상대 패널 ─── */}
        <div style={{ padding: '0 12px', marginBottom: 6 }}>
          <PlayerPanel
            player={opp ?? p1}
            color={oppColor}
            hasSelected={oppCommittedTile !== null}
            phase={gs.phase}
            label="상대방"
          />
        </div>

        {/* ── 아레나 ─── */}
        <div style={{
          margin: '4px 12px', padding: '14px 16px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
        }}>
          <div className="pix" style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center', marginBottom: 12 }}>
            ⚔ ARENA ⚔
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {/* 상대 슬롯 */}
            <div style={{ textAlign: 'center' }}>
              <div className="pix" style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>상대방</div>
              <PixelTile
                value={isRevealing ? oppCommittedTile : null}
                faceDown={!isRevealing && oppCommittedTile !== null}
                size="lg"
              />
            </div>

            {/* VS / 결과 */}
            <div style={{ textAlign: 'center', minWidth: 52 }}>
              {isRevealing && revealWinner ? (
                <div className="pix" style={{
                  fontSize: revealWinner === 'draw' ? 11 : 14,
                  color: revealWinner === 'draw' ? 'var(--gold)' : revealWinner === 'me' ? myColor : oppColor,
                  textShadow: `0 0 12px currentColor`,
                  animation: revealBlink ? 'blink 0.4s step-end infinite' : 'none',
                }}>
                  {revealWinner === 'draw' ? 'DRAW' : revealWinner === 'me' ? 'WIN!' : 'LOSE'}
                </div>
              ) : (
                <div className="pix" style={{ fontSize: 13, color: 'var(--faint)' }}>VS</div>
              )}
            </div>

            {/* 내 슬롯 */}
            <div style={{ textAlign: 'center' }}>
              <div className="pix" style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 8 }}>나</div>
              <PixelTile
                value={isRevealing ? myCommittedTile : myDisplayTile}
                faceDown={false}
                selected={!isRevealing && myDisplayTile !== null}
                size="lg"
              />
            </div>
          </div>

          {/* 라운드 히스토리 */}
          {gs.roundResults.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                {gs.roundResults.map((r, i) => {
                  const iWon =
                    (r.outcome === 'p0' && myIdx === 0) ||
                    (r.outcome === 'p1' && myIdx === 1);
                  const isDraw = r.outcome === 'draw';
                  const color = isDraw ? 'var(--gold)' : iWon ? myColor : oppColor;
                  return (
                    <div key={i} style={{
                      width: 16, height: 16,
                      background: isDraw ? 'rgba(255,183,43,0.2)' : iWon ? `${myColor}33` : `${oppColor}33`,
                      border: `1.5px solid ${color}`,
                      borderRadius: 2,
                      boxShadow: `0 0 4px ${color}66`,
                    }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 라운드 승리 램프 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 4,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pix" style={{ fontSize: 9, color: RED }}>{p0.name.slice(0, 8)} 승</span>
            <Lamps wins={p0.roundWins} color={RED} />
          </div>
          <div className="pix" style={{ fontSize: 9, color: 'var(--faint)' }}>ROUND WIN</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span className="pix" style={{ fontSize: 9, color: BLUE }}>{p1.name.slice(0, 8)} 승</span>
            <Lamps wins={p1.roundWins} color={BLUE} />
          </div>
        </div>

        {/* ── 내 패널 ─── */}
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <PlayerPanel
            player={me ?? p0}
            color={myColor}
            hasSelected={iSelected}
            phase={gs.phase}
            label="나"
          />
        </div>

        {/* ── 타일 선택 ─── */}
        {!isGameOver && (
          <div style={{ padding: '0 12px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${isMyTurn && !iSelected ? `${myColor}44` : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 8, padding: '12px 12px',
            }}>
              {/* 상태 메시지 */}
              <div className="pix" style={{
                fontSize: 11, textAlign: 'center', marginBottom: 12,
                color: isRevealing ? 'var(--gold)' : iSelected ? 'var(--dim)' : myColor,
              }}>
                {isRevealing
                  ? '⚔️ 타일 공개!'
                  : iSelected
                  ? '✓ 선택 완료 — 상대방 대기 중...'
                  : '🐉 타일을 선택하세요!'}
              </div>

              {/* 타일 그리드 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {ALL_TILES.map(tile => {
                  const remaining = me?.remainingTiles.includes(tile) ?? false;
                  const isSelected = myDisplayTile === tile;
                  const canClick = isMyTurn && !iSelected && !isRevealing && !submitting && remaining;
                  return (
                    <PixelTile
                      key={tile}
                      value={tile}
                      used={!remaining}
                      selected={isSelected}
                      disabled={!canClick}
                      onClick={canClick ? () => handleSelectTile(tile) : undefined}
                      size="md"
                    />
                  );
                })}
              </div>

              <div className="pix" style={{ fontSize: 9, color: 'var(--faint)', textAlign: 'center', marginTop: 10 }}>
                남은 타일: {me?.remainingTiles.length ?? 0}개
              </div>
            </div>
          </div>
        )}

        {/* ── 게임 종료 ─── */}
        {isGameOver && (
          <GameOverPanel
            gs={gs}
            uid={uid}
            myColor={myColor}
            onRestart={() => router.push('/guryongtu')}
          />
        )}
      </div>
    </div>
  );
}

// ── 플레이어 패널 ─────────────────────────────────────────────
function PlayerPanel({
  player,
  color,
  hasSelected,
  phase,
  label,
}: {
  player: { name: string; remainingTiles: TileValue[]; roundWins: number };
  color: string;
  hasSelected: boolean;
  phase: GamePhase;
  label: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: hasSelected && phase === 'selecting' ? `${color}0a` : 'rgba(0,0,0,0.2)',
      border: `1px solid ${hasSelected && phase === 'selecting' ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 8, transition: 'all 0.2s',
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 2, flexShrink: 0,
        background: hasSelected && phase === 'selecting' ? color : 'rgba(255,255,255,0.06)',
        boxShadow: hasSelected && phase === 'selecting' ? `0 0 8px ${color}` : 'none',
        transition: 'all 0.3s',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--f-body)', fontSize: 15, color, fontWeight: 700 }}>
          {player.name}
          <span className="pix" style={{ fontSize: 9, color: 'var(--faint)', marginLeft: 8 }}>{label}</span>
        </div>
        <div className="pix" style={{ fontSize: 9, color: 'var(--faint)', marginTop: 3 }}>
          남은 타일 {player.remainingTiles.length}개
        </div>
      </div>
      {phase === 'selecting' && (
        <span className="pix" style={{
          fontSize: 9,
          color: hasSelected ? color : 'rgba(255,255,255,0.15)',
        }}>
          {hasSelected ? '✓ 선택완료' : '선택 중...'}
        </span>
      )}
    </div>
  );
}

// ── 게임 오버 ────────────────────────────────────────────────
function GameOverPanel({
  gs, uid, myColor, onRestart,
}: {
  gs: GameState; uid: string; myColor: string; onRestart: () => void;
}) {
  const iWon = gs.matchWinnerId === uid;
  const p0 = gs.players[0];
  const p1 = gs.players[1];

  return (
    <div style={{ padding: '0 12px', marginTop: 8 }}>
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        border: `2px solid ${iWon ? myColor : 'var(--line)'}`,
        borderRadius: 8, padding: '22px 16px', textAlign: 'center',
        boxShadow: iWon ? `0 0 24px ${myColor}44` : 'none',
      }}>
        <div className="pix" style={{ fontSize: 24, marginBottom: 10 }}>
          {iWon ? '🏆' : '💀'}
        </div>
        <div className="pix" style={{
          fontSize: 18, marginBottom: 8,
          color: iWon ? myColor : 'var(--dim)',
          textShadow: iWon ? `0 0 14px ${myColor}` : 'none',
        }}>
          {iWon ? 'VICTORY!' : 'DEFEATED'}
        </div>
        <div style={{ fontFamily: 'var(--f-kr)', fontSize: 15, color: 'var(--text-2)', marginBottom: 18 }}>
          {gs.matchWinnerId === p0.id ? p0.name : p1.name}님의 승리!
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 18 }}>
          {[p0, p1].map((p, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: i === 0 ? RED : BLUE }}>
                {p.name}
              </div>
              <div className="pix" style={{ fontSize: 13, color: i === 0 ? RED : BLUE, marginTop: 5 }}>
                {p.gameWins}승
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onRestart}
          className="arc-btn"
          style={{ background: myColor, borderColor: myColor, color: '#fff', fontSize: 14 }}
        >
          다시 하기
        </button>
      </div>
    </div>
  );
}
