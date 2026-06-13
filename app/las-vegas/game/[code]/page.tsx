'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GameState } from '@/lib/las-vegas/types';
import { rollDice, chooseCasino, scoreRound, getColorClasses } from '@/lib/las-vegas/gameLogic';
import { playDiceRoll } from '@/lib/las-vegas/sounds';
import { subscribeRoom, updateGameState } from '@/lib/las-vegas/roomService';
import Dice from '@/components/las-vegas/Dice';
import CasinoCard from '@/components/las-vegas/CasinoCard';
import PlayerPanel from '@/components/las-vegas/PlayerPanel';
import DiceRollModal from '@/components/las-vegas/DiceRollModal';
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

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showRoundStart, setShowRoundStart] = useState(true);
  const [showRollModal, setShowRollModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [isScoringInProgress, setIsScoringInProgress] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPhaseRef = useRef<GameState['phase'] | null>(null);
  const prevRoundRef = useRef<number>(0);

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
    const unsub = subscribeRoom(code, (room) => {
      if (!room) { router.replace('/las-vegas'); return; }
      const gs = room.gameState ? sanitizeGameState(room.gameState) : null;
      if (!gs) return;
      setGameState(gs);
    });
    return unsub;
  }, [code, router]);

  // gameState 변화를 감지해 모달 상태 동기화 (로컬·Firebase 모두 처리)
  useEffect(() => {
    if (!gameState) return;
    const prevPhase = prevPhaseRef.current;
    const prevRound = prevRoundRef.current;
    prevPhaseRef.current = gameState.phase;
    prevRoundRef.current = gameState.round;

    if (prevPhase === null) return; // 최초 로드

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
    if (prevPhase === 'rolling' && gameState.phase === 'choosing') {
      setShowRollModal(true);
    }
  }, [gameState]);

  const myPlayerIndex = gameState?.players.findIndex((p) => p.clientId === uid) ?? -1;
  const isMyTurn = myPlayerIndex >= 0 && gameState?.currentPlayerIndex === myPlayerIndex;

  const setGame = (gs: GameState) => setGameState(sanitizeGameState(gs));

  const handleRoll = useCallback(async () => {
    if (!gameState || gameState.phase !== 'rolling' || !isMyTurn) return;
    playDiceRoll();
    const next = rollDice(gameState);
    setGame(next);
    setShowRollModal(true);
    await updateGameState(code, next);
  }, [gameState, isMyTurn, code]);

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

  if (!gameState) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]"><div className="text-amber-400 text-xl animate-pulse">로딩 중...</div></div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const cc = getColorClasses(currentPlayer.color);

  const diceGroups = (gameState.rolledDice ?? []).reduce<Record<number, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});
  const whiteDiceGroups = (gameState.rolledWhiteDice ?? []).reduce<Record<number, number>>((acc, v) => { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {});

  if (gameState.phase === 'gameOver') {
    const sorted = [...gameState.players].sort((a, b) => b.totalMoney - a.totalMoney);
    const winner = sorted[0];
    const wcc = getColorClasses(winner.color);
    const RANK_MEDALS = ['🥇', '🥈', '🥉'];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1a0f] via-[#17130c] to-[#100e09] px-4 py-10 relative overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${wcc.bg}`} />
        <div className="text-center mb-8 relative z-10">
          <div className="text-7xl mb-3">🏆</div>
          <h1 className="text-5xl font-black text-amber-400 tracking-wider mb-1">게임 종료!</h1>
          <p className="text-white/30 text-xs tracking-widest uppercase">Final Results</p>
        </div>
        <div className="relative w-full max-w-sm mb-5 z-10">
          <div className={`absolute -inset-1 rounded-3xl blur-lg opacity-40 ${wcc.bg}`} />
          <div className={`relative rounded-3xl p-5 border-2 ${wcc.border} bg-black/60 backdrop-blur-sm`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${wcc.bg} flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0`}>1위</div>
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Winner</p>
                <p className={`text-xl font-black truncate ${wcc.text}`}>{winner.name}</p>
                <p className="text-amber-400 font-bold text-base">{(winner.totalMoney / 10000).toFixed(0)}만원</p>
              </div>
              <span className="text-4xl">🥇</span>
            </div>
          </div>
        </div>
        {sorted.length > 1 && (
          <div className="w-full max-w-sm space-y-2 z-10 mb-8">
            {sorted.slice(1).map((p, i) => {
              const pcc = getColorClasses(p.color);
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <span className="text-xl w-7 text-center">{RANK_MEDALS[i + 1] ?? `${i + 2}`}</span>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pcc.bg}`} />
                  <span className="flex-1 font-bold text-white/70 truncate">{p.name}</span>
                  <span className={`font-black text-sm ${pcc.text}`}>{(p.totalMoney / 10000).toFixed(0)}만원</span>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={() => router.push('/las-vegas')} className="z-10 px-10 py-4 rounded-2xl font-black text-base tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30">
          다시 하기 🎲
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1a0f] via-[#17130c] to-[#100e09] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => router.push('/las-vegas')} className="text-white/40 hover:text-white text-sm transition-colors">← 나가기</button>
        <div className="text-center">
          <h1 className="text-amber-400 font-black text-lg tracking-widest">LAS VEGAS</h1>
          <p className="text-white/40 text-xs">라운드 {gameState.round} / {gameState.totalRounds}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono">{code}</span>
          <button onClick={toggleMusic} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-base hover:bg-white/20 transition-all">{musicOn ? '🎵' : '🔇'}</button>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-white/10">
        <PlayerPanel players={gameState.players} currentPlayerId={currentPlayer.id} />
      </div>

      <div className="flex-1 px-3 py-4">
        <div className="grid grid-cols-3 gap-5 max-w-2xl mx-auto">
          {gameState.casinos.map((casino) => (
            <CasinoCard
              key={casino.id}
              casino={casino}
              players={gameState.players}
              isSelectable={gameState.phase === 'choosing' && !showRollModal && isMyTurn && gameState.availableChoices.includes(casino.id)}
              isHighlighted={gameState.phase === 'choosing' && !showRollModal && isMyTurn && gameState.availableChoices.includes(casino.id)}
              onSelect={() => handleChoose(casino.id)}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-white/10 bg-black/20">
        <p className="text-center text-white/50 text-xs mb-3 h-4">{gameState.lastAction}</p>
        {gameState.phase === 'choosing' && !showRollModal && gameState.availableChoices.length > 0 && (
          <div className="mb-4">
            <p className="text-center text-white/40 text-xs mb-2">{isMyTurn ? '굴린 주사위 — 카지노 번호를 선택하세요' : `${currentPlayer.name}의 선택을 기다리는 중...`}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {gameState.availableChoices.map((val) => {
                const count = diceGroups[val] ?? 0;
                const whiteCount = whiteDiceGroups[val] ?? 0;
                const isWhiteOnly = count === 0;
                return (
                  <button key={val} onClick={() => isMyTurn && handleChoose(val)} disabled={!isMyTurn}
                    className={['flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150',
                      isMyTurn ? (isWhiteOnly ? 'bg-white/10 border-white/30 hover:scale-105 active:scale-95' : `${cc.light} ${cc.border} border hover:scale-105 active:scale-95`) : 'bg-white/5 border-white/10 opacity-40',
                    ].join(' ')}
                  >
                    {!isWhiteOnly && (<><Dice value={val} color={currentPlayer.color} size="sm" /><span className="text-black font-bold text-sm">×{count}</span></>)}
                    {whiteCount > 0 && (<>{!isWhiteOnly && <span className="text-white/40 text-xs">+</span>}<Dice value={val} color="white" size="sm" /><span className={`font-bold text-sm ${isWhiteOnly ? 'text-white' : 'text-black'}`}>×{whiteCount}</span></>)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <div className={`flex-1 rounded-xl p-3 ${cc.light} border ${cc.border}`}>
            <p className={`text-xs font-bold ${cc.text}`}>{currentPlayer.name}의 턴{isMyTurn && <span className="text-white/60 font-normal"> (나)</span>}</p>
            <p className="text-black text-xs">남은 주사위: {currentPlayer.diceCount}개</p>
          </div>
          {gameState.phase === 'rolling' && (
            isMyTurn ? (
              <button onClick={handleRoll} disabled={currentPlayer.diceCount === 0 && currentPlayer.whiteDiceCount === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              ><span className="text-xl">🎲</span>굴리기</button>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/30 text-xs text-center">대기 중...</div>
            )
          )}
        </div>
      </div>

      {showRoundStart && <RoundStartModal casinos={gameState.casinos} round={gameState.round} totalRounds={gameState.totalRounds} onStart={() => setShowRoundStart(false)} />}
      {showRollModal && <DiceRollModal dice={gameState.rolledDice} whiteDice={gameState.rolledWhiteDice} playerColor={currentPlayer.color} playerName={currentPlayer.name} onClose={() => setShowRollModal(false)} />}

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
