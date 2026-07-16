'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import {
  subscribeRoom,
  selectTileAtomic,
  resolveRoundAtomic,
  restartMatch,
  type OnlineRoom,
} from '@/lib/guryongtu/firebase-game';
import { GameState, GamePhase, TileValue, RoundResult } from '@/lib/guryongtu/types';
import { getBgm, sfx } from '@/lib/guryongtu/sounds';

const RED = '#ff3333';
const BLUE = '#4488ff';
const ALL_TILES: TileValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 홀수: 흑백 돌, 짝수: 백색 돌
function tileColors(value: TileValue | null, selected: boolean, used: boolean, faceDown: boolean) {
  if (used) return {
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.12)',
  };
  if (faceDown) return {
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    border: '#333355',
    text: 'transparent',
  };
  if (value === null) return { bg: '#111', border: '#333', text: '#999' };

  const isOdd = value % 2 !== 0; // 홀수 = 흑백 돌
  const isSpecial = value === 1;

  if (selected) return {
    bg: isOdd
      ? `linear-gradient(135deg, ${RED}33, ${RED}11)`
      : `linear-gradient(135deg, #fff5, #fff2)`,
    border: isOdd ? RED : '#ccc',
    text: isOdd ? RED : '#111',
  };

  if (isOdd) return {
    bg: 'linear-gradient(135deg, #1e1e3a 0%, #12122a 100%)',
    border: isSpecial ? `${RED}88` : '#334',
    text: isSpecial ? RED : '#ccc',
  };

  // 짝수 = 백색 돌
  return {
    bg: 'linear-gradient(135deg, #d4d4e8 0%, #b8b8cc 100%)',
    border: '#999aaa',
    text: '#111',
  };
}

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
  const { bg, border, text } = tileColors(value, selected, used, faceDown);

  return (
    <button
      onClick={onClick}
      disabled={disabled || used || !onClick}
      style={{
        width: dim, height: dim,
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: 4,
        cursor: disabled || used || !onClick ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-pix)',
        fontSize,
        color: text,
        boxShadow: selected
          ? `0 0 14px ${border}66, inset 0 0 8px ${border}22`
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
        <span style={{ textShadow: (selected || value === 1) && value % 2 !== 0 ? `0 0 8px ${RED}` : 'none' }}>
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

// ── 라운드 기록 (3행 박스) ────────────────────────────────────
function RoundHistory({ roundResults, p0Name, p1Name }: {
  roundResults: RoundResult[];
  p0Name: string;
  p1Name: string;
}) {
  if (roundResults.length === 0) return null;

  const stoneStyle = (isOdd: boolean): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: 5, flexShrink: 0,
    background: isOdd
      ? 'linear-gradient(135deg, #22224a, #14142e)'
      : 'linear-gradient(135deg, #e0e0f4, #c0c0d8)',
    border: `2px solid ${isOdd ? '#6666bb' : '#aaaacc'}`,
    boxShadow: isOdd ? '0 0 6px #6666bb66' : '0 0 4px #aaaacc44',
  });

  const outcomeStyle = (outcome: 'p0' | 'p1' | 'draw'): React.CSSProperties => {
    const c = outcome === 'draw' ? '#ffb72b' : outcome === 'p0' ? RED : BLUE;
    return {
      width: 26, height: 26, borderRadius: 5, flexShrink: 0,
      background: `${c}2a`,
      border: `2px solid ${c}`,
      boxShadow: `0 0 8px ${c}99`,
    };
  };

  return (
    <div style={{
      margin: '6px 12px',
      padding: '10px 14px',
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      overflowX: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'max-content' }}>
        {/* 레이블 열 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          marginRight: 10, paddingRight: 10,
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: RED, fontWeight: 700, lineHeight: '26px' }}>{p0Name.slice(0, 5)}</span>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: '26px' }}>결과</span>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: BLUE, fontWeight: 700, lineHeight: '26px' }}>{p1Name.slice(0, 5)}</span>
        </div>
        {/* 라운드별 열 */}
        {roundResults.map((r, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={stoneStyle(r.p0Tile % 2 !== 0)} />
            <div style={outcomeStyle(r.outcome)} />
            <div style={stoneStyle(r.p1Tile % 2 !== 0)} />
            <span className="pix" style={{ fontSize: 6, color: 'rgba(255,255,255,0.25)', letterSpacing: 0 }}>R{r.round}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 게임 승리 별 ──────────────────────────────────────────────
function GameWinStars({ wins, color }: { wins: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1].map(i => (
        <span key={i} className="pix" style={{
          fontSize: 30,
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

  // 라운드/게임 전환 시 localTile & submitting 리셋
  useEffect(() => {
    if (gs?.phase === 'selecting') {
      setLocalTile(null);
      setSubmitting(false);
    }
  }, [gs?.currentRound, gs?.currentGameNumber, gs?.phase]);

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
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

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
      const committed = await selectTileAtomic(code, myIdx, tile);
      if (committed) {
        sfx.tileSubmit();
      } else {
        // 트랜잭션 abort — 선택 취소
        setLocalTile(null);
        setSubmitting(false);
      }
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

  // 선(攻) 플레이어
  const firstPlayerIdx = gs.firstPlayerIdx;
  const amIFirst = myIdx !== -1 && myIdx === firstPlayerIdx;
  const firstPlayerName = gs.players[firstPlayerIdx]?.name ?? '';
  const firstPlayerSelectedTile = gs.players[firstPlayerIdx]?.selectedTile ?? null;
  const firstPlayerHasSelected = firstPlayerSelectedTile !== null;
  const firstStoneIsOdd = firstPlayerSelectedTile !== null && firstPlayerSelectedTile % 2 !== 0;

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
      <div className="arc-screen" style={{ padding: '0 0 20px', gap: 0 }}>

        {/* ── 최상단 바 (음소거) ─── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '6px 12px 0',
        }}>
          <button
            onClick={() => setMuted(m => !m)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, opacity: muted ? 0.3 : 0.65, padding: '4px 6px',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* ── 헤더 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--f-body)', fontSize: 12, color: RED, fontWeight: 700 }}>{p0.name.slice(0, 6)}</span>
              {firstPlayerIdx === 0 && (
                <span style={{
                  fontFamily: 'var(--f-kr)', fontWeight: 700,
                  fontSize: 10, color: '#fff', background: RED,
                  borderRadius: 3, padding: '1px 5px',
                }}>선</span>
              )}
            </div>
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {firstPlayerIdx === 1 && (
                <span style={{
                  fontFamily: 'var(--f-kr)', fontWeight: 700,
                  fontSize: 10, color: '#fff', background: BLUE,
                  borderRadius: 3, padding: '1px 5px',
                }}>선</span>
              )}
              <span style={{ fontFamily: 'var(--f-body)', fontSize: 12, color: BLUE, fontWeight: 700 }}>{p1.name.slice(0, 6)}</span>
            </div>
            <GameWinStars wins={p1.gameWins} color={BLUE} />
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
            isFirst={myIdx !== -1 ? (myIdx === 0 ? firstPlayerIdx === 1 : firstPlayerIdx === 0) : false}
          />
        </div>

        {/* ── 아레나 ─── */}
        <div style={{
          margin: '4px 12px', padding: '14px 16px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
        }}>
          {/* 선 플레이어 안내 */}
          {!isRevealing && !isGameOver && (
            <div style={{
              fontFamily: 'var(--f-kr)', fontWeight: 700,
              fontSize: 14, textAlign: 'center', marginBottom: 10,
              color: amIFirst ? myColor : oppColor,
              textShadow: `0 0 12px ${amIFirst ? myColor : oppColor}66`,
            }}>
              ⚔ {amIFirst ? '내가' : `${firstPlayerName.slice(0, 6)}이/가`} 선(攻)
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {/* 상대 슬롯 — 숫자 비공개 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>상대방</div>
              <PixelTile
                value={null}
                faceDown={oppCommittedTile !== null}
                size="lg"
              />
              {oppCommittedTile !== null && (
                <div style={{
                  marginTop: 6,
                  fontFamily: 'var(--f-kr)', fontSize: 12, fontWeight: 700,
                  color: oppCommittedTile % 2 !== 0 ? '#aaaacc' : '#ccccaa',
                  textShadow: oppCommittedTile % 2 !== 0 ? '0 0 6px #aaaacc88' : '0 0 6px #ccccaa88',
                }}>
                  {oppCommittedTile % 2 !== 0 ? '흑(黑)' : '백(白)'}
                </div>
              )}
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
              ) : firstPlayerHasSelected && !iSelected && !amIFirst ? (
                /* 후 플레이어 관점 - 선 플레이어가 낸 돌 종류 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                  <div className="pix" style={{ fontSize: 9, color: 'var(--faint)' }}>VS</div>
                  <div style={{
                    fontFamily: 'var(--f-kr)', fontSize: 16, fontWeight: 700,
                    color: firstStoneIsOdd ? '#aaaaee' : '#ddddaa',
                    textShadow: `0 0 10px ${firstStoneIsOdd ? '#aaaaee' : '#ddddaa'}`,
                  }}>
                    {firstStoneIsOdd ? '흑' : '백'}
                  </div>
                </div>
              ) : (
                <div className="pix" style={{ fontSize: 13, color: 'var(--faint)' }}>VS</div>
              )}
            </div>

            {/* 내 슬롯 — revealing 시 숫자 비공개 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>나</div>
              <PixelTile
                value={isRevealing ? null : myDisplayTile}
                faceDown={isRevealing && myCommittedTile !== null}
                selected={!isRevealing && myDisplayTile !== null}
                size="lg"
              />
              {isRevealing && myCommittedTile !== null && (
                <div style={{
                  marginTop: 6,
                  fontFamily: 'var(--f-kr)', fontSize: 12, fontWeight: 700,
                  color: myCommittedTile % 2 !== 0 ? '#aaaacc' : '#ccccaa',
                  textShadow: myCommittedTile % 2 !== 0 ? '0 0 6px #aaaacc88' : '0 0 6px #ccccaa88',
                }}>
                  {myCommittedTile % 2 !== 0 ? '흑(黑)' : '백(白)'}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── 라운드 기록 ─── */}
        <RoundHistory roundResults={gs.roundResults} p0Name={p0.name} p1Name={p1.name} />

        {/* ── 내 패널 ─── */}
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <PlayerPanel
            player={me ?? p0}
            color={myColor}
            hasSelected={iSelected}
            phase={gs.phase}
            label="나"
            isFirst={amIFirst}
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
              <div style={{
                fontFamily: 'var(--f-kr)', fontWeight: 700,
                fontSize: 13, textAlign: 'center', marginBottom: 12,
                color: isRevealing ? 'var(--gold)' : iSelected ? 'rgba(255,255,255,0.5)' : !amIFirst && !firstPlayerHasSelected ? 'rgba(255,255,255,0.4)' : myColor,
              }}>
                {isRevealing
                  ? '⚔️ 타일 공개!'
                  : iSelected
                    ? '✓ 선택 완료 — 상대방 대기 중...'
                    : !amIFirst && !firstPlayerHasSelected
                      ? '선 플레이어 선택 대기 중...'
                      : '🐉 타일을 선택하세요!'}
              </div>

              {/* 후 플레이어 - 선 플레이어 돌 종류 표시 */}
              {!amIFirst && firstPlayerHasSelected && !iSelected && (
                <div style={{
                  textAlign: 'center', marginBottom: 12,
                  padding: '8px 12px', borderRadius: 8,
                  background: firstStoneIsOdd ? 'rgba(80,80,120,0.25)' : 'rgba(200,200,120,0.15)',
                  border: `1px solid ${firstStoneIsOdd ? '#8888cc55' : '#cccc8855'}`,
                }}>
                  <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--faint)' }}>상대방이 낸 돌: </span>
                  <span style={{
                    fontFamily: 'var(--f-kr)', fontSize: 15, fontWeight: 700,
                    color: firstStoneIsOdd ? '#aaaaee' : '#eeeeaa',
                    textShadow: `0 0 8px ${firstStoneIsOdd ? '#aaaaee88' : '#eeeeaa88'}`,
                  }}>
                    {firstStoneIsOdd ? '흑(黑)' : '백(白)'}
                  </span>
                </div>
              )}

              {/* 타일 그리드 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {ALL_TILES.map(tile => {
                  const remaining = me?.remainingTiles.includes(tile) ?? false;
                  const isSelected = myDisplayTile === tile;
                  const canClick = isMyTurn && !iSelected && !isRevealing && !submitting && remaining
                    && (amIFirst || firstPlayerHasSelected);
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

              <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 10 }}>
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
            myIdx={myIdx}
            onRestart={() => restartMatch(code)}
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
  isFirst,
}: {
  player: { name: string; remainingTiles: TileValue[]; roundWins: number };
  color: string;
  hasSelected: boolean;
  phase: GamePhase;
  label: string;
  isFirst: boolean;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--f-body)', fontSize: 15, color, fontWeight: 700 }}>
            {player.name}
          </span>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: 'var(--dim)', marginLeft: 2 }}>{label}</span>
          {isFirst && (
            <span style={{
              fontFamily: 'var(--f-kr)', fontWeight: 700,
              fontSize: 10, color: '#fff', background: color,
              borderRadius: 3, padding: '1px 6px',
            }}>선(攻)</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
          남은 타일 {player.remainingTiles.length}개
        </div>
      </div>
      {phase === 'selecting' && (
        <span style={{
          fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 12,
          color: hasSelected ? color : 'rgba(255,255,255,0.45)',
        }}>
          {hasSelected ? '✓ 선택완료' : '선택 중...'}
        </span>
      )}
    </div>
  );
}

// ── 게임 오버 ────────────────────────────────────────────────
function GameOverPanel({
  gs, uid, myColor, myIdx, onRestart,
}: {
  gs: GameState; uid: string; myColor: string; myIdx: number; onRestart: () => void;
}) {
  const iWon = gs.matchWinnerId === uid;
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  const myName = myIdx !== -1 ? gs.players[myIdx].name : '';
  const oppName = myIdx !== -1 ? gs.players[myIdx === 0 ? 1 : 0].name : '';

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

        {/* ── 전체 숫자 공개 ─── */}
        {gs.matchHistory && gs.matchHistory.length > 0 && (
          <div style={{
            marginBottom: 18,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '12px 10px',
            textAlign: 'left',
          }}>
            <div style={{
              fontFamily: 'var(--f-kr)', fontSize: 12, fontWeight: 700,
              color: 'var(--gold)', marginBottom: 10, textAlign: 'center',
            }}>
              📜 매치 전체 기록 공개
            </div>
            {gs.matchHistory.map((gameResults, gi) => {
              const myResults = myIdx !== -1
                ? gameResults.map(r => ({ ...r, myTile: myIdx === 0 ? r.p0Tile : r.p1Tile, oppTile: myIdx === 0 ? r.p1Tile : r.p0Tile, iWon: (myIdx === 0 ? r.outcome === 'p0' : r.outcome === 'p1') }))
                : gameResults.map(r => ({ ...r, myTile: r.p0Tile, oppTile: r.p1Tile, iWon: r.outcome === 'p0' }));
              return (
                <div key={gi} style={{ marginBottom: gi < gs.matchHistory.length - 1 ? 10 : 0 }}>
                  <div style={{
                    fontFamily: 'var(--f-pix)', fontSize: 9,
                    color: 'rgba(255,255,255,0.35)', marginBottom: 5,
                  }}>
                    GAME {gi + 1}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {myResults.map((r, ri) => {
                      const outcomeColor = r.outcome === 'draw' ? 'var(--gold)' : r.iWon ? myColor : (myIdx === 0 ? BLUE : RED);
                      const outcomeText = r.outcome === 'draw' ? 'DRAW' : r.iWon ? 'WIN' : 'LOSE';
                      return (
                        <div key={ri} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '3px 6px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.03)',
                        }}>
                          <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'rgba(255,255,255,0.3)', width: 16 }}>R{r.round}</span>
                          <span style={{ fontFamily: 'var(--f-body)', fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 44 }}>{myName.slice(0, 4)}</span>
                          <span style={{
                            fontFamily: 'var(--f-pix)', fontSize: 14, fontWeight: 700,
                            color: myColor, width: 18, textAlign: 'center',
                            textShadow: `0 0 6px ${myColor}88`,
                          }}>{r.myTile}</span>
                          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>vs</span>
                          <span style={{
                            fontFamily: 'var(--f-pix)', fontSize: 14, fontWeight: 700,
                            color: myIdx === 0 ? BLUE : RED, width: 18, textAlign: 'center',
                            textShadow: `0 0 6px ${myIdx === 0 ? BLUE : RED}88`,
                          }}>{r.oppTile}</span>
                          <span style={{ fontFamily: 'var(--f-body)', fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 44, textAlign: 'right' }}>{oppName.slice(0, 4)}</span>
                          <span style={{
                            fontFamily: 'var(--f-pix)', fontSize: 9,
                            color: outcomeColor, marginLeft: 2,
                            textShadow: `0 0 4px ${outcomeColor}`,
                          }}>{outcomeText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
