'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GameState, PlayerColor } from '@/lib/las-vegas/types';
import {
  createInitialState,
  rollDice,
  chooseCasino,
  scoreRound,
  getColorHex,
} from '@/lib/las-vegas/gameLogic';
import { playDiceRoll } from '@/lib/las-vegas/sounds';
import Dice from '@/components/las-vegas/Dice';
import CasinoCard from '@/components/las-vegas/CasinoCard';
import PlayerPanel from '@/components/las-vegas/PlayerPanel';
import RoundStartModal from '@/components/las-vegas/RoundStartModal';
import ScoringAnimationModal from '@/components/las-vegas/ScoringAnimationModal';

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showRoundStart, setShowRoundStart] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [tumblingDice, setTumblingDice] = useState<{ colored: number[]; white: number[] } | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/game.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    audio.play().catch(() => setMusicOn(false));
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) { audio.pause(); } else { audio.play().catch(() => {}); }
    setMusicOn((prev) => !prev);
  };

  useEffect(() => {
    const setupParam = searchParams.get('setup');
    if (!setupParam) {
      router.replace('/las-vegas');
      return;
    }
    try {
      const setup: { name: string; color: PlayerColor }[] = JSON.parse(setupParam);
      setGameState(createInitialState(setup));
    } catch {
      router.replace('/las-vegas');
    }
  }, [searchParams, router]);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling' || isRolling) return;
    playDiceRoll();
    const next = rollDice(gameState);
    const cLen = next.rolledDice.length;
    const wLen = next.rolledWhiteDice.length;
    const randDice = () => ({
      colored: Array.from({ length: cLen }, () => 1 + Math.floor(Math.random() * 6)),
      white:   Array.from({ length: wLen }, () => 1 + Math.floor(Math.random() * 6)),
    });
    setIsRolling(true);
    setTumblingDice(randDice());
    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      if (ticks >= 8) {
        clearInterval(iv);
        setTumblingDice(null);
        setGameState(next);
        setIsRolling(false);
      } else {
        setTumblingDice(randDice());
      }
    }, 70);
  }, [gameState, isRolling]);

  const handleChoose = useCallback(
    (casinoId: number) => {
      if (!gameState || gameState.phase !== 'choosing') return;
      const next = chooseCasino(gameState, casinoId);
      setGameState(next);
      if (next.phase === 'scoring') setShowScoringModal(true);
    },
    [gameState]
  );

  const handleProceedScoring = useCallback(() => {
    if (!gameState) return;
    const next = scoreRound(gameState);
    setGameState(next);
    setShowScoringModal(false);
    if (next.phase !== 'gameOver') setShowRoundStart(true);
  }, [gameState]);

  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerHex = getColorHex(currentPlayer.color);

  const diceGroups = gameState.rolledDice.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1; return acc;
  }, {});
  const whiteDiceGroups = gameState.rolledWhiteDice.reduce<Record<number, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1; return acc;
  }, {});

  if (gameState.phase === 'gameOver') {
    const sorted = [...gameState.players].sort((a, b) => b.totalMoney - a.totalMoney);
    const winner = sorted[0];
    const RANK_MEDALS = ['🥇', '🥈', '🥉'];

    return (
      <div className="cabinet" style={{ justifyContent: 'center', padding: '40px 18px' }}>
        <div className="crt" />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="arc-pop" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>🏆</div>
            <h1 className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 42, letterSpacing: 2, margin: '0 0 4px' }}>GAME OVER</h1>
            <div style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: 'var(--dim)', letterSpacing: 1.5 }}>FINAL RESULTS</div>
          </div>

          {/* Winner card */}
          <div className="arc-panel" style={{ width: '100%', padding: 20, marginBottom: 12, boxShadow: '0 0 0 1px var(--gold), 0 0 30px -8px var(--gold)', borderColor: 'var(--gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#1a1206', boxShadow: '0 4px 0 var(--gold-lo)', flexShrink: 0 }}>1위</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginBottom: 4 }}>WINNER</div>
                <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 800, fontSize: 20, color: 'var(--gold)' }}>{winner.name}</div>
                <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, color: 'var(--coin)', marginTop: 2 }}>{(winner.totalMoney / 10000).toFixed(0)}억</div>
              </div>
              <span style={{ fontSize: 36 }}>🥇</span>
            </div>
          </div>

          {/* Other players */}
          {sorted.length > 1 && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {sorted.slice(1).map((p, i) => {
                const rank = i + 2;
                return (
                  <div key={p.id} className="arc-panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                    <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{RANK_MEDALS[rank - 1] ?? `${rank}위`}</span>
                    <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: 'var(--coin)' }}>{(p.totalMoney / 10000).toFixed(0)}억</span>
                  </div>
                );
              })}
            </div>
          )}

          <button className="arc-btn" onClick={() => router.push('/las-vegas')} style={{ fontSize: 18, maxWidth: 320 }}>
            다시 하기 🎲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cabinet" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="crt" />
      <header style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <button className="arc-btn-ghost" onClick={() => router.push('/las-vegas')} style={{ fontSize: 13, padding: '9px 14px' }}>← 나가기</button>
        <div style={{ textAlign: 'center' }}>
          <div className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 17, letterSpacing: 2 }}>LAS VEGAS</div>
          <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 3 }}>ROUND {gameState.round} / {gameState.totalRounds}</div>
        </div>
        <button className="arc-btn-ghost" onClick={toggleMusic} style={{ width: 40, height: 40, padding: 0, borderRadius: 11, fontSize: 16 }}>
          {musicOn ? '🔊' : '🔇'}
        </button>
      </header>

      <div style={{ position: 'relative', zIndex: 1, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <PlayerPanel players={gameState.players} currentPlayerId={currentPlayer.id} />
      </div>

      <div style={{ flex: 1, position: 'relative', zIndex: 1, padding: '16px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 672, margin: '0 auto' }}>
          {gameState.casinos.map((casino) => (
            <CasinoCard
              key={casino.id}
              casino={casino}
              players={gameState.players}
              isSelectable={gameState.phase === 'choosing' && gameState.availableChoices.includes(casino.id)}
              isHighlighted={gameState.phase === 'choosing' && gameState.availableChoices.includes(casino.id)}
              potentialCount={gameState.phase === 'choosing' ? (diceGroups[casino.id] ?? 0) : 0}
              potentialWhiteCount={gameState.phase === 'choosing' ? (whiteDiceGroups[casino.id] ?? 0) : 0}
              currentPlayerColor={currentPlayer.color}
              onSelect={() => handleChoose(casino.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '12px 12px 24px' }}>
        {gameState.lastAction && (
          <p className="pix" style={{ textAlign: 'center', fontSize: 8, color: 'var(--dim)', marginBottom: 8, letterSpacing: 0.5 }}>{gameState.lastAction}</p>
        )}
        <div className="arc-panel ticks" style={{ padding: '16px 18px' }}>
          {/* 헤더: 플레이어 이름 + 힌트 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: playerHex, boxShadow: `0 0 8px ${playerHex}`, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{currentPlayer.name}의 차례</span>
            </div>
            <span className="pix" style={{ fontSize: 8, color: 'var(--dim)' }}>
              {gameState.phase === 'choosing' ? '같은 숫자를 탭해 배치' : 'ROLL THE DICE'}
            </span>
          </div>

          {/* 주사위 영역 */}
          <div style={{ minHeight: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(gameState.phase === 'rolling' && !isRolling) && (
              <span className="pix" style={{ fontSize: 9, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.8 }}>
                🎲 주사위를 굴려<br />같은 숫자를 카지노에 배치하세요
              </span>
            )}
            {isRolling && tumblingDice && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {tumblingDice.colored.map((val, k) => (
                  <div key={`c-${k}`} className="dice-tumble" style={{ animationDelay: `${k * 14}ms` }}>
                    <Dice value={val} color={currentPlayer.color} size="md" />
                  </div>
                ))}
                {tumblingDice.white.map((val, k) => (
                  <div key={`w-${k}`} className="dice-tumble" style={{ animationDelay: `${(tumblingDice.colored.length + k) * 14}ms` }}>
                    <Dice value={val} color="white" size="md" />
                  </div>
                ))}
              </div>
            )}
            {gameState.phase === 'choosing' && gameState.availableChoices.length > 0 && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                {gameState.availableChoices.map((val) => {
                  const count = diceGroups[val] ?? 0;
                  const whiteCount = whiteDiceGroups[val] ?? 0;
                  const label = count > 0 && whiteCount > 0
                    ? `×${count}+${whiteCount} → 카지노 ${val}`
                    : `×${count || whiteCount} → 카지노 ${val}`;
                  return (
                    <button
                      key={val}
                      onClick={() => handleChoose(val)}
                      style={{
                        background: 'rgba(0,0,0,.3)', border: '1.5px solid var(--line)', borderRadius: 14,
                        padding: '10px 12px 8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'transform .12s, border-color .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = playerHex; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                    >
                      <div style={{ display: 'flex', gap: 4 }}>
                        {count > 0 && Array.from({ length: count }).map((_, k) => (
                          <div key={`c-${k}`} className="arc-pop" style={{ animationDelay: `${k * 0.04}s` }}>
                            <Dice value={val} color={currentPlayer.color} size="sm" />
                          </div>
                        ))}
                        {whiteCount > 0 && Array.from({ length: whiteCount }).map((_, k) => (
                          <div key={`w-${k}`} className="arc-pop" style={{ animationDelay: `${(count + k) * 0.04}s` }}>
                            <Dice value={val} color="white" size="sm" />
                          </div>
                        ))}
                      </div>
                      <span className="pix" style={{ fontSize: 8, color: playerHex }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <button
            className="arc-btn"
            onClick={gameState.phase === 'rolling' && !isRolling ? handleRoll : undefined}
            disabled={isRolling || gameState.phase === 'choosing' || (currentPlayer.diceCount === 0 && currentPlayer.whiteDiceCount === 0)}
            style={{ marginTop: 12, fontSize: 18 }}
          >
            {isRolling ? '굴리는 중...' : gameState.phase === 'rolling' ? '🎲 주사위 굴리기' : '숫자를 골라 배치하세요'}
          </button>
        </div>
      </div>

      {showRoundStart && (
        <RoundStartModal casinos={gameState.casinos} round={gameState.round} totalRounds={gameState.totalRounds} onStart={() => setShowRoundStart(false)} />
      )}
      {showScoringModal && (
        <ScoringAnimationModal
          gameState={gameState}
          onProceed={handleProceedScoring}
          proceedLabel={gameState.round >= gameState.totalRounds ? '최종 결과 보기 →' : '다음 라운드 →'}
        />
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
