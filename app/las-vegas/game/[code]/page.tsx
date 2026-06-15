'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GameState } from '@/lib/las-vegas/types';
import { rollDice, chooseCasino, scoreRound, getColorHex, createInitialState } from '@/lib/las-vegas/gameLogic';
import { playDiceRoll } from '@/lib/las-vegas/sounds';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import { subscribeRoom, updateGameState, startGame, Room } from '@/lib/las-vegas/roomService';
import LobbyWaiting from '@/components/las-vegas/LobbyWaiting';
import Dice from '@/components/las-vegas/Dice';
import CasinoCard from '@/components/las-vegas/CasinoCard';
import PlayerPanel from '@/components/las-vegas/PlayerPanel';
import RoundStartModal from '@/components/las-vegas/RoundStartModal';
import ScoringAnimationModal from '@/components/las-vegas/ScoringAnimationModal';

function toArr<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val == null) return [];
  return Object.keys(val as object)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (val as Record<string, T>)[k]);
}

function sanitizeGameState(gs: GameState): GameState {
  return {
    ...gs,
    rolledDice: toArr<number>(gs.rolledDice),
    rolledWhiteDice: toArr<number>(gs.rolledWhiteDice),
    availableChoices: toArr<number>(gs.availableChoices),
    players: toArr<GameState['players'][0]>(gs.players).map((p) => ({ ...p })),
    casinos: toArr<GameState['casinos'][0]>(gs.casinos).map((c) => ({
      ...c,
      moneyCards: toArr<GameState['casinos'][0]['moneyCards'][0]>(c.moneyCards),
      placedDice: toArr<GameState['casinos'][0]['placedDice'][0]>(c.placedDice),
    })),
  };
}

export default function OnlineGamePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { uid } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showRoundStart, setShowRoundStart] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [tumblingDice, setTumblingDice] = useState<{ colored: number[]; white: number[] } | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [isScoringInProgress, setIsScoringInProgress] = useState(false);
  const [starting, setStarting] = useState(false);
  const { soundEnabled: musicOn, toggleSound: toggleMusic } = useSoundEnabled();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPhaseRef = useRef<GameState['phase'] | null>(null);
  const prevRoundRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio('/game.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) audio.play().catch(() => {});
    else audio.pause();
  }, [musicOn]);

  useEffect(() => {
    const unsub = subscribeRoom(code, (r) => {
      if (!r) { router.replace('/las-vegas'); return; }
      setRoom(r);
      const gs = r.gameState ? sanitizeGameState(r.gameState) : null;
      if (gs) setGameState(gs);
    });
    return unsub;
  }, [code, router]);

  const handleStart = async () => {
    if (!room || starting) return;
    setStarting(true);
    try {
      const setup = room.players.map((p) => ({
        name: p.name,
        color: p.color,
        clientId: p.clientId,
      }));
      const gs = createInitialState(setup);
      await startGame(code, gs);
    } catch {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!gameState) return;
    const prevPhase = prevPhaseRef.current;
    const prevRound = prevRoundRef.current;
    prevPhaseRef.current = gameState.phase;
    prevRoundRef.current = gameState.round;
    if (prevPhase === null) return;
    if (gameState.round > prevRound && gameState.phase !== 'gameOver') {
      setShowRoundStart(true);
      setShowScoringModal(false);
      setIsScoringInProgress(false);
    }
    if (gameState.phase === 'scoring' && prevPhase !== 'scoring') {
      setShowScoringModal(true);
    }
    if (prevPhase === 'scoring' && gameState.phase !== 'scoring') {
      setShowScoringModal(false);
      setIsScoringInProgress(false);
    }
    // 다른 플레이어가 굴렸을 때 rolling → choosing 전환 시 텀블링 표시
    if (prevPhase === 'rolling' && gameState.phase === 'choosing') {
      const cLen = gameState.rolledDice.length;
      const wLen = gameState.rolledWhiteDice.length;
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
          setIsRolling(false);
        } else {
          setTumblingDice(randDice());
        }
      }, 70);
    }
  }, [gameState]);

  const myPlayerIndex = gameState?.players.findIndex((p) => p.clientId === uid) ?? -1;
  const isMyTurn = myPlayerIndex >= 0 && gameState?.currentPlayerIndex === myPlayerIndex;

  const setGame = (gs: GameState) => setGameState(sanitizeGameState(gs));

  const handleRoll = useCallback(async () => {
    if (!gameState || gameState.phase !== 'rolling' || !isMyTurn || isRolling) return;
    if (musicOn) playDiceRoll();
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
        setGame(next);
        setIsRolling(false);
      } else {
        setTumblingDice(randDice());
      }
    }, 70);
    await updateGameState(code, next);
  }, [gameState, isMyTurn, isRolling, code]);

  const handleChoose = useCallback(async (casinoId: number) => {
    if (!gameState || gameState.phase !== 'choosing' || !isMyTurn) return;
    const next = chooseCasino(gameState, casinoId);
    setGame(next);
    await updateGameState(code, next);
  }, [gameState, isMyTurn, code]);

  const handleScoring = useCallback(async () => {
    if (!gameState || gameState.phase !== 'scoring' || isScoringInProgress) return;
    setIsScoringInProgress(true);
    const next = scoreRound(gameState);
    setGame(next);
    setShowScoringModal(false);
    try {
      await updateGameState(code, next);
    } catch {
      setIsScoringInProgress(false);
    }
  }, [gameState, isScoringInProgress, code]);

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  if (room.status === 'waiting') {
    return (
      <LobbyWaiting
        code={code}
        room={room}
        myUid={uid}
        onStart={handleStart}
        starting={starting}
      />
    );
  }

  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="pix blink" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerHex = getColorHex(currentPlayer.color);

  const diceGroups = (gameState.rolledDice ?? []).reduce<Record<number, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});
  const whiteDiceGroups = (gameState.rolledWhiteDice ?? []).reduce<Record<number, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});

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
          {sorted.length > 1 && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {sorted.slice(1).map((p, i) => {
                const rank = i + 2;
                const hex = getColorHex(p.color);
                return (
                  <div key={p.id} className="arc-panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                    <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{RANK_MEDALS[rank - 1] ?? `${rank}위`}</span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex, boxShadow: `0 0 6px ${hex}`, flexShrink: 0 }} />
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
          <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 3 }}>ROUND {gameState.round} / {gameState.totalRounds} · <span style={{ color: 'var(--faint)' }}>{code}</span></div>
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
              isSelectable={gameState.phase === 'choosing' && !isRolling && isMyTurn && gameState.availableChoices.includes(casino.id)}
              isHighlighted={gameState.phase === 'choosing' && !isRolling && isMyTurn && gameState.availableChoices.includes(casino.id)}
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
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: playerHex, boxShadow: `0 0 8px ${playerHex}`, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                {currentPlayer.name}의 차례{isMyTurn && <span style={{ color: playerHex, fontSize: 12, marginLeft: 6 }}>(나)</span>}
              </span>
            </div>
            <span className="pix" style={{ fontSize: 8, color: 'var(--dim)' }}>
              {gameState.phase === 'choosing' ? '같은 숫자를 탭해 배치' : isMyTurn ? 'ROLL THE DICE' : '대기 중...'}
            </span>
          </div>

          {/* 주사위 영역 */}
          <div style={{ minHeight: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {gameState.phase === 'rolling' && !isRolling && (
              <span className="pix" style={{ fontSize: 9, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.8 }}>
                {isMyTurn ? '🎲 주사위를 굴려\n같은 숫자를 카지노에 배치하세요' : `${currentPlayer.name}이(가) 굴리는 중...`}
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
            {gameState.phase === 'choosing' && !isRolling && gameState.availableChoices.length > 0 && (
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
                      onClick={() => isMyTurn && handleChoose(val)}
                      disabled={!isMyTurn}
                      style={{
                        background: 'rgba(0,0,0,.3)', border: '1.5px solid var(--line)', borderRadius: 14,
                        padding: '10px 12px 8px', cursor: isMyTurn ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'transform .12s, border-color .15s',
                        opacity: isMyTurn ? 1 : 0.4,
                      }}
                      onMouseEnter={e => { if (isMyTurn) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = playerHex; } }}
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
                      <span className="pix" style={{ fontSize: 8, color: isMyTurn ? playerHex : 'var(--faint)' }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <button
            className="arc-btn"
            onClick={gameState.phase === 'rolling' && isMyTurn && !isRolling ? handleRoll : undefined}
            disabled={isRolling || gameState.phase === 'choosing' || !isMyTurn || (currentPlayer.diceCount === 0 && currentPlayer.whiteDiceCount === 0)}
            style={{ marginTop: 12, fontSize: 18 }}
          >
            {isRolling ? '굴리는 중...' : gameState.phase === 'rolling' ? (isMyTurn ? '🎲 주사위 굴리기' : '대기 중...') : '숫자를 골라 배치하세요'}
          </button>
        </div>
      </div>

      {showRoundStart && (
        <RoundStartModal casinos={gameState.casinos} round={gameState.round} totalRounds={gameState.totalRounds} onStart={() => setShowRoundStart(false)} />
      )}
      {showScoringModal && (
        <ScoringAnimationModal
          gameState={gameState}
          onProceed={handleScoring}
          proceedLabel={
            !isMyTurn ? '상대방의 확인을 기다리는 중...' :
            isScoringInProgress ? '계산 중...' :
            '점수 계산하기 →'
          }
          proceedDisabled={isScoringInProgress || !isMyTurn}
        />
      )}
    </div>
  );
}
