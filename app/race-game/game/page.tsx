'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Flame, Snowflake, Leaf, Sparkles, Droplets, Bot, Wind, Clover, Shield, type LucideIcon } from 'lucide-react';
import PixelRaceCanvas from './PixelRaceCanvas';
import { CHARACTERS, getCharacter } from '@/lib/race-game/characters';
import { TRACKS } from '@/lib/race-game/tracks';
import { WEATHER_LIST } from '@/lib/race-game/weather';
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/race-game/contracts';
import { simulateRace, CHECKPOINT_FRAME_INDICES } from '@/lib/race-game/simulator';
import { calculateLiveOdds } from '@/lib/race-game/odds';
import {
  generateRoundData, generateContractOptions, settleRound,
  MAX_ROUNDS, STARTING_CHIPS,
} from '@/lib/race-game/gameLogic';
import type {
  Player, Bet, ContractCard, GamePhase,
  RaceResult, PlayerRoundResult, CharacterRaceState,
} from '@/lib/race-game/types';

// ── Colors ───────────────────────────────────────────────────
const C = {
  bg: '#0b0a17', panel: '#181433', panelAlt: '#1e1842',
  gold: '#f5c542', green: '#4fd88a', red: '#ff5d6c',
  purple: '#7a5cf0', cyan: '#57c7ff', text: '#ece9ff',
  dim: '#9a92c4', line: '#3a3168', black: '#050410',
};

const pix: React.CSSProperties = { fontFamily: 'var(--f-pix)' };
const kr: React.CSSProperties = { fontFamily: 'var(--f-title)' };

const CHAR_ICONS: Record<string, LucideIcon> = {
  bolt: Zap, ember: Flame, frosty: Snowflake, sage: Leaf,
  nova: Sparkles, mudd: Droplets, neo: Bot, gale: Wind, coco: Clover, roxy: Shield,
};
function CharIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = CHAR_ICONS[id];
  const c = getCharacter(id);
  if (!Icon || !c) return null;
  return <Icon size={size} color={c.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />;
}

// ── Utility ──────────────────────────────────────────────────
let _betId = 0;
function newBetId() { return `b${++_betId}`; }

function nanoid6() { return Math.random().toString(36).slice(2, 8); }

// ── Web Audio sound effects ───────────────────────────────────
let _ac: AudioContext | null = null;
function getAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return _ac;
  } catch { return null; }
}

function playSound(type: 'bet' | 'cp' | 'good' | 'bad' | 'finish' | 'tick' | 'start') {
  try {
    const ac = getAC();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();

    const master = ac.createGain();
    master.gain.value = 0.35;
    master.connect(ac.destination);

    const note = (
      freq: number, start: number, dur: number,
      vol = 1, shape: OscillatorType = 'square',
    ) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = shape;
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(master);
      g.gain.setValueAtTime(vol, ac.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
      osc.start(ac.currentTime + start);
      osc.stop(ac.currentTime + start + dur + 0.01);
    };

    if (type === 'bet') {
      // Coin click: two-tone blip
      note(880, 0, 0.05, 0.6, 'sine');
      note(1320, 0.05, 0.07, 0.35, 'sine');
    } else if (type === 'tick') {
      // Countdown tick
      note(440, 0, 0.06, 0.5, 'sine');
    } else if (type === 'cp') {
      // Checkpoint fanfare: C-E-G-C ascending
      ([523, 659, 784, 1047] as const).forEach((f, i) => note(f, i * 0.075, 0.2, 0.45));
    } else if (type === 'good') {
      // Positive chime
      note(659, 0, 0.07, 0.35, 'sine');
      note(784, 0.07, 0.12, 0.25, 'sine');
    } else if (type === 'bad') {
      // Negative buzz
      note(220, 0, 0.08, 0.4, 'sawtooth');
      note(165, 0.08, 0.1, 0.25, 'sawtooth');
    } else if (type === 'start') {
      // Race start: rising 4-note
      ([262, 330, 392, 523] as const).forEach((f, i) => note(f, i * 0.06, 0.14, 0.35, 'square'));
    } else if (type === 'finish') {
      // Victory fanfare
      ([523, 659, 784, 1047, 784, 1047, 1319] as const).forEach((f, i) =>
        note(f, i * 0.1, 0.18, 0.38, 'square'));
    }

    setTimeout(() => { try { master.disconnect(); } catch {} }, 2000);
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────

// Chip display
function Chip({ n, size = 14 }: { n: number; size?: number }) {
  const col = n > 0 ? C.green : n < 0 ? C.red : C.dim;
  return (
    <span style={{ ...pix, fontSize: size, color: col }}>
      {n >= 0 ? '+' : ''}{n}
    </span>
  );
}

// Rarity badge
function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span style={{
      ...pix, fontSize: 7, letterSpacing: 1,
      color: RARITY_COLORS[rarity] ?? C.dim,
      border: `1px solid ${RARITY_COLORS[rarity] ?? C.dim}`,
      borderRadius: 3, padding: '2px 5px',
    }}>
      {RARITY_LABELS[rarity]}
    </span>
  );
}

// Contract Card
function ContractCardUI({
  card, selected, onSelect, minimal,
}: {
  card: ContractCard;
  selected?: boolean;
  onSelect?: () => void;
  minimal?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? '#1e183a' : C.panel,
        border: `1.5px solid ${selected ? RARITY_COLORS[card.rarity] : C.line}`,
        borderRadius: 10,
        padding: minimal ? '10px 12px' : '14px 16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all .15s',
        boxShadow: selected ? `0 0 12px ${RARITY_COLORS[card.rarity]}44` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ ...kr, fontSize: 14, fontWeight: 700, color: C.text }}>{card.name}</span>
        <RarityBadge rarity={card.rarity} />
      </div>
      {!minimal && (
        <p style={{ ...kr, fontSize: 12, color: C.dim, margin: '0 0 10px', lineHeight: 1.5 }}>
          {card.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ ...pix, fontSize: 8, color: C.green }}>+{card.reward} 성공</span>
        {card.penalty > 0 && <span style={{ ...pix, fontSize: 8, color: C.red }}>-{card.penalty} 실패</span>}
        <span style={{ ...pix, fontSize: 8, color: C.dim }}>최소 베팅 {card.minBet}</span>
      </div>
    </div>
  );
}

// Character odds row for betting
function CharOddsRow({
  charId, winOdds, placeOdds, onBet,
}: {
  charId: string;
  winOdds: number;
  placeOdds: number;
  onBet: (type: 'win' | 'place') => void;
}) {
  const c = getCharacter(charId);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      background: C.panel, borderRadius: 8,
      border: `1px solid ${C.line}`,
    }}>
      <span style={{ width: 28, display: 'flex', alignItems: 'center' }}><CharIcon id={c.id} size={20} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ ...kr, fontSize: 13, fontWeight: 700, color: C.text }}>{c.name}</div>
        <div style={{ ...pix, fontSize: 8, color: C.dim }}>{c.role}</div>
      </div>
      <button onClick={() => onBet('win')} style={betBtnStyle(C.gold)}>
        우승 {winOdds}x
      </button>
      <button onClick={() => onBet('place')} style={betBtnStyle(C.purple)}>
        3위 {placeOdds}x
      </button>
    </div>
  );
}

function betBtnStyle(color: string): React.CSSProperties {
  return {
    ...pix, fontSize: 8,
    background: `${color}22`,
    border: `1px solid ${color}88`,
    borderRadius: 6, color,
    padding: '5px 8px', cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all .1s',
  };
}

// Race track visualization
function RaceTrack({
  frame,
  trackEmoji,
  trackDistance,
}: {
  frame: { states: CharacterRaceState[]; newEvents: { characterId: string; eventName: string; isGood: boolean }[] };
  trackEmoji: string;
  trackDistance: number;
}) {
  const sorted = [...frame.states].sort((a, b) => a.rank - b.rank);

  return (
    <div style={{
      background: '#0d0b20',
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      padding: '12px 16px',
      overflowX: 'hidden',
    }}>
      {/* Track lanes */}
      <div style={{ position: 'relative', height: sorted.length * 38 + 8 }}>
        {sorted.map((state, laneIdx) => {
          const c = getCharacter(state.characterId);
          const pct = Math.min(100, (state.position / trackDistance) * 100);
          const hasBoost = state.speedBoost > 1.05;
          const hasSlow = state.slowFactor < 0.95;
          const recentEvent = frame.newEvents?.find(e => e.characterId === state.characterId);

          return (
            <div key={state.characterId} style={{
              position: 'absolute',
              top: laneIdx * 38,
              left: 0, right: 0,
              height: 34,
            }}>
              {/* Track lane background */}
              <div style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                left: 32, right: 0,
                height: 4,
                background: '#ffffff10',
                borderRadius: 2,
              }} />
              {/* Progress fill */}
              <div style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                left: 32,
                width: `calc(${pct}% - 32px)`,
                height: 4,
                background: `${c.color}44`,
                borderRadius: 2,
                transition: 'width .15s',
              }} />
              {/* Rank badge */}
              <div style={{
                position: 'absolute', left: 0,
                top: '50%', transform: 'translateY(-50%)',
                ...pix, fontSize: 8, color: laneIdx === 0 ? C.gold : C.dim,
                width: 18, textAlign: 'center',
              }}>{state.rank}</div>
              {/* Character marker */}
              <div style={{
                position: 'absolute',
                left: `calc(32px + max(0px, min(${pct}%, calc(100% - 32px - 80px))))`,
                top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: 4,
                background: hasBoost ? `${c.color}44` : hasSlow ? '#ff5d6c22' : `${c.color}22`,
                border: `1px solid ${hasBoost ? c.color : hasSlow ? C.red : `${c.color}66`}`,
                borderRadius: 20, padding: '2px 6px 2px 3px',
                transition: 'left .15s',
                zIndex: 2,
              }}>
                <CharIcon id={c.id} size={14} />
                <span style={{ ...kr, fontSize: 11, color: C.text, whiteSpace: 'nowrap' }}>{c.name}</span>
                {hasBoost && <span style={{ ...pix, fontSize: 7, color: C.green }}>▲</span>}
                {hasSlow && <span style={{ ...pix, fontSize: 7, color: C.red }}>▼</span>}
              </div>
              {/* Event flash */}
              {recentEvent && (
                <div style={{
                  position: 'absolute',
                  left: `calc(32px + min(${pct}%, calc(100% - 150px)))`,
                  top: -16,
                  ...kr, fontSize: 10,
                  color: recentEvent.isGood ? C.green : C.red,
                  whiteSpace: 'nowrap',
                  animation: 'none',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}>
                  {recentEvent.isGood ? '✨' : '💥'} {recentEvent.eventName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PHASE: Round Intro ────────────────────────────────────────
function RoundIntro({ round, trackId, weatherId, onNext }: {
  round: number; trackId: string; weatherId: string; onNext: () => void;
}) {
  const track = TRACKS.find(t => t.id === trackId)!;
  const weather = WEATHER_LIST.find(w => w.id === weatherId)!;

  // 3 → 2 → 1 → 0 (GO!) → auto-proceed
  const [countdown, setCountdown] = useState(3);
  const [key, setKey] = useState(3); // re-trigger animation on each count change

  useEffect(() => {
    if (countdown <= 0) {
      playSound('start');
      const t = setTimeout(onNext, 600);
      return () => clearTimeout(t);
    }
    playSound('tick');
    const t = setTimeout(() => {
      setCountdown(c => c - 1);
      setKey(c => c - 1);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle neon lines behind content */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${C.purple}18 0%, transparent 70%)`,
      }} />

      <div style={{ ...pix, fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 16, position: 'relative' }}>
        ROUND {round} / {MAX_ROUNDS}
      </div>

      {/* Track card */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: C.panel, border: `1px solid ${C.purple}55`,
        borderRadius: 16, padding: '20px 32px', marginBottom: 28,
        position: 'relative',
        boxShadow: `0 0 32px ${C.purple}33`,
      }}>
        <div style={{ fontSize: 72, marginBottom: 10, lineHeight: 1 }}>{track.emoji}</div>
        <div style={{ ...kr, fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          {track.name} 코스
        </div>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          ...kr, fontSize: 13, color: C.dim, marginBottom: 14,
        }}>
          <span>{weather.emoji} {weather.name}</span>
          <span style={{ color: C.line }}>·</span>
          <span>거리 {(track.distance / 1000).toFixed(1)}km</span>
          <span style={{ color: C.line }}>·</span>
          <span>{track.terrain}</span>
        </div>
        <div style={{
          ...kr, fontSize: 12, color: C.dim, textAlign: 'center',
          maxWidth: 300, lineHeight: 1.6,
          padding: '8px 12px',
          background: '#ffffff08', borderRadius: 8,
        }}>
          {weather.effect}
        </div>
      </div>

      {/* Countdown */}
      <div style={{ position: 'relative', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {countdown > 0 ? (
          <div
            key={key}
            className="race-countdown"
            style={{
              ...pix, fontSize: 72,
              color: countdown === 1 ? C.red : countdown === 2 ? C.gold : C.cyan,
              textShadow: `0 0 30px currentColor`,
              lineHeight: 1,
            }}
          >
            {countdown}
          </div>
        ) : (
          <div
            className="race-go"
            style={{
              ...pix, fontSize: 40,
              color: C.green,
              textShadow: `0 0 30px ${C.green}`,
            }}
          >
            GO!
          </div>
        )}
      </div>
    </div>
  );
}

// ── PHASE: Contract Selection ─────────────────────────────────
function ContractSelection({
  players, currentIdx, contractOptions, selectedContracts,
  onSelect, onSkip,
}: {
  players: Player[];
  currentIdx: number;
  contractOptions: Record<string, ContractCard[]>;
  selectedContracts: Record<string, ContractCard | null>;
  onSelect: (playerId: string, card: ContractCard) => void;
  onSkip: (playerId: string) => void;
}) {
  const player = players[currentIdx];
  const options = contractOptions[player.id] ?? [];
  const [chosen, setChosen] = useState<string | null>(null);

  function confirm() {
    if (chosen === 'skip') { onSkip(player.id); return; }
    const card = options.find(c => c.id === chosen);
    if (card) onSelect(player.id, card);
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ ...pix, fontSize: 9, color: C.gold, letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>
        CONTRACT SELECTION
      </div>
      <h2 style={{ ...kr, fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
        {player.name}의 차례
      </h2>
      <div style={{ ...pix, fontSize: 9, color: C.dim, marginBottom: 24 }}>
        💰 {player.chips} 칩 보유
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {players.map((p, i) => (
          <div key={p.id} style={{
            width: 8, height: 8, borderRadius: 4,
            background: i < currentIdx ? C.green : i === currentIdx ? C.gold : C.line,
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(card => (
          <ContractCardUI
            key={card.id}
            card={card}
            selected={chosen === card.id}
            onSelect={() => setChosen(chosen === card.id ? null : card.id)}
          />
        ))}
        {/* Skip option */}
        <div
          onClick={() => setChosen(chosen === 'skip' ? null : 'skip')}
          style={{
            background: chosen === 'skip' ? '#1a1a1a' : C.panel,
            border: `1.5px solid ${chosen === 'skip' ? C.dim : C.line}`,
            borderRadius: 10, padding: '14px 16px',
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          <span style={{ ...kr, fontSize: 14, color: C.dim }}>건너뛰기 (보상/패널티 없음)</span>
        </div>
      </div>

      <button
        onClick={confirm}
        disabled={!chosen}
        style={{
          ...kr, fontSize: 16, fontWeight: 700,
          background: chosen ? `linear-gradient(135deg, ${C.gold}, #e09010)` : '#222',
          color: chosen ? '#000' : C.dim,
          border: 'none', borderRadius: 8,
          padding: '14px 40px', cursor: chosen ? 'pointer' : 'not-allowed',
          marginTop: 20,
        }}
      >
        확인 →
      </button>
    </div>
  );
}

// ── PHASE: Pre-Betting ────────────────────────────────────────
function PreBetting({
  player, allCharIds, preRaceOdds,
  currentBets, onAddBet, onRemoveBet, onDone,
  round,
}: {
  player: Player;
  allCharIds: string[];
  preRaceOdds: Record<string, number>;
  currentBets: Bet[];
  onAddBet: (bet: Bet) => void;
  onRemoveBet: (betId: string) => void;
  onDone: () => void;
  round: number;
}) {
  const TIMER_MAX = 45;
  const [timeLeft, setTimeLeft] = useState(TIMER_MAX);
  const [betAmount, setBetAmount] = useState(50);
  const [tab, setTab] = useState<'list' | 'mybets'>('list');

  const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);
  const remainChips = player.chips - totalBet;
  const isUrgent = timeLeft <= 10;

  useEffect(() => {
    if (timeLeft <= 0) { onDone(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onDone]);

  function addBet(charId: string, type: 'win' | 'place') {
    if (betAmount <= 0 || betAmount > remainChips) return;
    const baseOdds = preRaceOdds[charId] ?? 2.0;
    const odds = type === 'place' ? Math.round(Math.max(1.05, baseOdds / 2.5) * 100) / 100 : baseOdds;
    onAddBet({
      id: newBetId(),
      playerId: player.id,
      characterId: charId,
      type, amount: betAmount, odds,
      isLive: false,
    });
    playSound('bet');
  }

  const timerPct = (timeLeft / TIMER_MAX) * 100;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', paddingBottom: 100 }}>

      {/* Sticky header */}
      <div style={{
        background: '#0d0c22',
        borderBottom: `1px solid ${isUrgent ? C.red + '88' : C.purple + '55'}`,
        padding: '10px 16px',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: isUrgent ? `0 2px 12px ${C.red}44` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            ...pix, fontSize: 8, color: C.gold, letterSpacing: 1,
          }}>PRE-RACE BET · R{round}</div>
          <div style={{ flex: 1 }} />
          {/* Countdown */}
          <div className={isUrgent ? 'race-timer-urgent' : ''} style={{
            ...pix, fontSize: 14,
            color: isUrgent ? C.red : timeLeft <= 20 ? C.gold : C.green,
            textShadow: isUrgent ? `0 0 10px ${C.red}` : 'none',
            minWidth: 36, textAlign: 'right',
          }}>
            {timeLeft}s
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 5, background: '#ffffff10', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            transition: 'width 1s linear',
            width: `${timerPct}%`,
            background: isUrgent
              ? C.red
              : timeLeft <= 20
                ? `linear-gradient(90deg, ${C.gold}, ${C.red})`
                : `linear-gradient(90deg, ${C.green}, ${C.gold})`,
            boxShadow: isUrgent ? `0 0 8px ${C.red}` : 'none',
          }} />
        </div>

        {/* Player / chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...kr, fontSize: 14, fontWeight: 700, color: C.text, flex: 1 }}>
            {player.name}
          </span>
          <span style={{ ...pix, fontSize: 9, color: C.gold }}>💰 {remainChips}</span>
          <span style={{ ...kr, fontSize: 11, color: C.dim }}>잔여 칩</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}` }}>
        {(['list', 'mybets'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', background: 'none',
            border: 'none', borderBottom: `2px solid ${tab === t ? C.gold : 'transparent'}`,
            color: tab === t ? C.gold : C.dim,
            ...pix, fontSize: 8, cursor: 'pointer', letterSpacing: 1,
          }}>
            {t === 'list' ? '캐릭터' : `내 베팅 (${currentBets.length})`}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div style={{ padding: '12px 16px' }}>
          {/* Amount selector */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...pix, fontSize: 7, color: C.dim }}>BET</span>
            {[25, 50, 100, 150, 200].map(a => (
              <button key={a} onClick={() => setBetAmount(a)} style={{
                padding: '5px 10px',
                background: betAmount === a ? C.gold : C.panelAlt,
                color: betAmount === a ? '#000' : C.text,
                border: `1px solid ${betAmount === a ? C.gold : C.line}`,
                borderRadius: 6, ...pix, fontSize: 8, cursor: 'pointer',
              }}>{a}</button>
            ))}
            <input
              type="number"
              value={betAmount}
              onChange={e => setBetAmount(Math.max(10, Math.min(remainChips, +e.target.value)))}
              style={{
                width: 64, padding: '5px 8px',
                background: C.panelAlt, border: `1px solid ${C.line}`,
                borderRadius: 6, color: C.text, ...pix, fontSize: 8,
              }}
            />
          </div>

          {/* 2-column character grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {allCharIds.map(charId => {
              const c = getCharacter(charId);
              const winOdds = preRaceOdds[charId] ?? 2.0;
              const placeOdds = Math.round(Math.max(1.05, winOdds / 2.5) * 100) / 100;
              const myBets = currentBets.filter(b => b.characterId === charId).length;
              const canBet = betAmount <= remainChips;
              return (
                <div key={charId} style={{
                  background: myBets > 0 ? `${C.gold}10` : C.panel,
                  border: `1px solid ${myBets > 0 ? C.gold + '55' : C.line}`,
                  borderRadius: 10, padding: '10px 10px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CharIcon id={c.id} size={18} />
                    <div style={{ flex: 1 }}>
                      <div style={{ ...kr, fontSize: 12, fontWeight: 700, color: C.text }}>{c.name}</div>
                      <div style={{ ...pix, fontSize: 6, color: C.dim }}>{c.role}</div>
                    </div>
                    {myBets > 0 && (
                      <span style={{ ...pix, fontSize: 7, color: C.gold }}>{myBets}★</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => addBet(charId, 'win')}
                      disabled={!canBet}
                      style={{
                        flex: 1,
                        ...pix, fontSize: 7,
                        background: canBet ? `${C.gold}22` : C.panelAlt,
                        border: `1px solid ${canBet ? C.gold + '88' : C.line}`,
                        borderRadius: 6, color: canBet ? C.gold : C.dim,
                        padding: '5px 4px', cursor: canBet ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                      }}>
                      WIN {winOdds}x
                    </button>
                    <button
                      onClick={() => addBet(charId, 'place')}
                      disabled={!canBet}
                      style={{
                        flex: 1,
                        ...pix, fontSize: 7,
                        background: canBet ? `${C.purple}22` : C.panelAlt,
                        border: `1px solid ${canBet ? C.purple + '88' : C.line}`,
                        borderRadius: 6, color: canBet ? C.purple : C.dim,
                        padding: '5px 4px', cursor: canBet ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                      }}>
                      TOP3 {placeOdds}x
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'mybets' && (
        <div style={{ padding: '12px 16px' }}>
          {currentBets.length === 0 ? (
            <div style={{ textAlign: 'center', ...kr, fontSize: 14, color: C.dim, paddingTop: 40 }}>
              아직 베팅이 없습니다
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentBets.map(bet => {
                const c = getCharacter(bet.characterId);
                return (
                  <div key={bet.id} style={{
                    background: C.panel, border: `1px solid ${C.line}`,
                    borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CharIcon id={c.id} size={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ ...kr, fontSize: 12, color: C.text }}>
                        {c.name}
                        <span style={{ ...pix, fontSize: 7, color: C.dim, marginLeft: 6 }}>
                          {bet.type === 'win' ? 'WIN' : 'TOP3'}
                        </span>
                      </div>
                      <div style={{ ...pix, fontSize: 7, color: C.dim }}>
                        {bet.amount} × {bet.odds}x = <span style={{ color: C.green }}>{Math.round(bet.amount * bet.odds)}</span>
                      </div>
                    </div>
                    <button onClick={() => onRemoveBet(bet.id)} style={{
                      background: `${C.red}22`, border: `1px solid ${C.red}55`,
                      borderRadius: 5, color: C.red, padding: '3px 8px',
                      ...pix, fontSize: 7, cursor: 'pointer',
                    }}>✕</button>
                  </div>
                );
              })}
              <div style={{ ...pix, fontSize: 9, color: C.dim, textAlign: 'right', paddingTop: 2 }}>
                총 베팅: <span style={{ color: C.gold }}>{totalBet}</span> 칩
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '10px 16px',
        background: C.bg, borderTop: `1px solid ${C.line}`,
      }}>
        <button onClick={onDone} style={{
          width: '100%', padding: '14px',
          background: `linear-gradient(135deg, ${C.gold}, #e09010)`,
          color: '#000', border: 'none', borderRadius: 8,
          ...pix, fontSize: 10, cursor: 'pointer', letterSpacing: 2,
          boxShadow: `0 0 12px ${C.gold}44`,
        }}>
          베팅 완료 →
        </button>
      </div>
    </div>
  );
}

// ── PHASE: Race ───────────────────────────────────────────────
function RacePhase({
  raceResult, trackId, weatherId, preRaceOdds, round,
  players, currentBets, onLiveBet, onRaceDone,
}: {
  raceResult: RaceResult;
  trackId: string;
  weatherId: string;
  preRaceOdds: Record<string, number>;
  round: number;
  players: Player[];
  currentBets: Bet[];
  onLiveBet: (bet: Bet) => void;
  onRaceDone: () => void;
}) {
  const track = TRACKS.find(t => t.id === trackId)!;
  const weather = WEATHER_LIST.find(w => w.id === weatherId)!;
  const [frameIdx, setFrameIdx] = useState(0);
  const [eventLog, setEventLog] = useState<{ id: string; text: string; good: boolean }[]>([]);
  const [liveOdds, setLiveOdds] = useState<Record<string, number>>(preRaceOdds);
  const [liveBetPlayerId, setLiveBetPlayerId] = useState(players[0]?.id ?? '');
  const [betAmount, setBetAmount] = useState(50);
  const [notifs, setNotifs] = useState<{ id: string; charId: string; name: string; good: boolean; laneIdx: number; born: number }[]>([]);
  const [cpFlash, setCpFlash] = useState<{ cp: number; born: number } | null>(null);
  const betsRef = useRef(currentBets);
  betsRef.current = currentBets;

  // Fixed lane order — defined early so effects can reference it
  const fixedOrder = raceResult.frames[0].states;

  const totalFrames = raceResult.frames.length;
  const frame = raceResult.frames[Math.min(frameIdx, totalFrames - 1)];
  const isFinished = frameIdx >= totalFrames - 1;

  // Continuous playback — no pausing
  useEffect(() => {
    if (isFinished) return;
    const iv = setInterval(() => {
      setFrameIdx(prev => (prev + 1 >= totalFrames ? prev : prev + 1));
    }, 120);
    return () => clearInterval(iv);
  }, [isFinished, totalFrames]);

  // Update live odds at each checkpoint + sound
  useEffect(() => {
    const { cp1, cp2, cp3 } = CHECKPOINT_FRAME_INDICES;
    if (frameIdx === cp1 || frameIdx === cp2 || frameIdx === cp3) {
      const cpNum = frameIdx === cp1 ? 1 : frameIdx === cp2 ? 2 : 3;
      setLiveOdds(calculateLiveOdds(CHARACTERS, track, preRaceOdds, frame.states, cpNum));
      setCpFlash({ cp: cpNum, born: frameIdx });
      playSound('cp');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx]);

  // Collect events + push canvas notifications + sound
  useEffect(() => {
    if (!frame?.newEvents?.length) return;
    const logs = frame.newEvents.map(e => ({
      id: e.characterId + String(e.time),
      text: e.description,
      good: e.isGood,
    }));
    setEventLog(prev => [...logs, ...prev].slice(0, 5));

    const toAdd = frame.newEvents.map(e => ({
      id: `${e.characterId}_${e.time}`,
      charId: e.characterId,
      name: e.eventName,
      good: e.isGood,
      laneIdx: fixedOrder.findIndex(s => s.characterId === e.characterId),
      born: frameIdx,
    }));
    setNotifs(prev => [...prev.filter(n => frameIdx - n.born < 22), ...toAdd].slice(-12));

    // Play sound for first event (avoid stacking)
    const first = frame.newEvents[0];
    if (first) playSound(first.isGood ? 'good' : 'bad');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIdx]);

  // Race done
  useEffect(() => {
    if (isFinished) {
      playSound('finish');
      setTimeout(onRaceDone, 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  const liveBetPlayer = players.find(p => p.id === liveBetPlayerId) ?? players[0];
  const liveBetPlayerBetTotal = betsRef.current
    .filter(b => b.playerId === liveBetPlayer?.id)
    .reduce((s, b) => s + b.amount, 0);
  const liveBetPlayerRemain = (liveBetPlayer?.chips ?? 0) - liveBetPlayerBetTotal;

  function addLiveBet(charId: string) {
    if (!liveBetPlayer || betAmount <= 0 || betAmount > liveBetPlayerRemain) return;
    const odds = liveOdds[charId] ?? 3.0;
    onLiveBet({
      id: newBetId(),
      playerId: liveBetPlayer.id,
      characterId: charId,
      type: 'win',
      amount: betAmount,
      odds,
      isLive: true,
    });
    playSound('bet');
  }

  const rankMap = Object.fromEntries(frame.states.map(s => [s.characterId, s]));
  const { cp1, cp2, cp3 } = CHECKPOINT_FRAME_INDICES;
  const cpLabel = frameIdx < cp1 ? 'START' : frameIdx < cp2 ? 'CP1' : frameIdx < cp3 ? 'CP2' : frameIdx < totalFrames - 1 ? 'CP3' : 'FINISH';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 80px' }}>

      {/* ── Arcade Header ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px',
        background: '#0d0c22',
        borderBottom: `1px solid ${C.purple}55`,
      }}>
        <div className="race-live" style={{
          ...pix, fontSize: 8,
          background: '#cc0022', color: '#fff',
          padding: '3px 8px', borderRadius: 4, letterSpacing: 1,
        }}>
          ● LIVE
        </div>
        <span style={{ ...pix, fontSize: 8, color: C.gold }}>{track.emoji} {track.name}</span>
        <span style={{ ...pix, fontSize: 8, color: C.dim }}>{weather.emoji} {weather.name}</span>
        <div style={{ flex: 1 }} />
        <span style={{
          ...pix, fontSize: 9,
          color: isFinished ? C.gold : C.cyan,
          textShadow: `0 0 8px ${isFinished ? C.gold : C.cyan}88`,
        }}>
          {cpLabel}
        </span>
        <span style={{ ...kr, fontSize: 11, color: C.dim }}>R{round}</span>
      </div>

      {/* ── Canvas + Overlays ──────────────────────────────────── */}
      {(() => {
        const laneCount = frame.states.length;
        const LH = 14 + laneCount * 9;
        const cpAge = cpFlash ? frameIdx - cpFlash.born : 999;
        const cpVisible = cpAge < 20;
        const cpOpacity = cpAge < 5 ? cpAge / 5 : cpAge < 14 ? 1 : Math.max(0, 1 - (cpAge - 14) / 6);

        return (
          <div style={{ position: 'relative' }}>
            <PixelRaceCanvas
              states={frame.states}
              trackDistance={track.distance}
              tick={frameIdx}
              trackId={trackId}
              events={notifs}
            />

            {/* CP Flash overlay */}
            {cpVisible && cpFlash && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', zIndex: 20,
                opacity: cpOpacity,
              }}>
                <div style={{
                  ...pix, fontSize: 14,
                  color: '#fff',
                  textShadow: `0 0 20px ${C.cyan}, 0 0 40px ${C.cyan}`,
                  background: `${C.cyan}22`,
                  border: `2px solid ${C.cyan}`,
                  padding: '8px 24px', borderRadius: 8, letterSpacing: 2,
                  transform: cpAge < 5 ? `scaleX(${0.5 + (cpAge / 5) * 0.5})` : 'scaleX(1)',
                }}>
                  ◆ CHECKPOINT {cpFlash.cp} ◆
                </div>
              </div>
            )}

            {/* Notif badges */}
            {notifs.map(n => {
              const age = frameIdx - n.born;
              if (age > 22) return null;
              const opacity = age < 3 ? age / 3 : age > 12 ? Math.max(0, 1 - (age - 12) / 10) : 1;
              const tx = age < 3 ? (1 - age / 3) * 48 : 0;
              const scale = age < 3 ? 0.4 + (age / 3) * 0.6 : 1;
              const topPct = (14 + n.laneIdx * 9) / LH * 100;
              const hPct = 9 / LH * 100;
              const c = getCharacter(n.charId);
              const col = n.good ? C.green : C.red;
              const glowPx = Math.round((1 - age / 22) * 12);
              return (
                <div key={n.id} style={{
                  position: 'absolute',
                  top: `${topPct}%`, height: `${hPct}%`,
                  left: '6%', right: '2%',
                  opacity,
                  transform: `translateX(${tx}px) scale(${scale})`,
                  transformOrigin: 'right center',
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '0 8px',
                  background: n.good ? '#00ff8828' : '#ff003328',
                  border: `${age < 4 ? 2 : 1}px solid ${col}${age < 4 ? 'cc' : '88'}`,
                  borderRadius: 5,
                  boxShadow: `0 0 ${glowPx}px ${col}88`,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}>
                  <CharIcon id={n.charId} size={age < 4 ? 13 : 11} />
                  <span style={{ ...kr, fontSize: age < 4 ? 12 : 11, color: col, lineHeight: 1 }}>
                    {c?.name}
                  </span>
                  <span style={{ ...pix, fontSize: age < 4 ? 8 : 7, color: '#fff', flex: 1 }}>
                    {n.name}
                  </span>
                  <span style={{ ...pix, fontSize: age < 4 ? 9 : 8, color: col }}>
                    {n.good ? '▲' : '▼'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Progress Bar ───────────────────────────────────────── */}
      <div style={{ padding: '6px 14px 2px', position: 'relative' }}>
        <div style={{ position: 'relative', height: 8, background: '#ffffff11', borderRadius: 4 }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            borderRadius: 4, transition: 'width .1s',
            width: `${(frameIdx / (totalFrames - 1)) * 100}%`,
            background: `linear-gradient(90deg, ${C.purple}, ${C.cyan}, ${C.gold})`,
            boxShadow: `0 0 8px ${C.cyan}88`,
          }} />
          {/* Glow dot */}
          <div style={{
            position: 'absolute', top: '50%',
            left: `${(frameIdx / (totalFrames - 1)) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: C.gold, boxShadow: `0 0 10px ${C.gold}`,
          }} />
          {/* CP tick marks */}
          {[{ f: cp1 }, { f: cp2 }, { f: cp3 }].map(({ f }, i) => (
            <div key={i} style={{
              position: 'absolute', top: -2, bottom: -2,
              left: `${(f / (totalFrames - 1)) * 100}%`,
              width: 2,
              background: frameIdx >= f ? C.gold + 'cc' : C.dim + '44',
              borderRadius: 1,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, padding: '0 2px' }}>
          {[
            { label: 'START', f: 0 }, { label: 'CP1', f: cp1 }, { label: 'CP2', f: cp2 },
            { label: 'CP3', f: cp3 }, { label: 'FINISH', f: totalFrames - 1 },
          ].map(({ label, f }) => (
            <span key={label} style={{
              ...pix, fontSize: 6,
              color: label === cpLabel ? C.cyan : frameIdx >= f ? C.gold : C.dim,
              textShadow: label === cpLabel ? `0 0 6px ${C.cyan}` : 'none',
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Live Rank Ticker ───────────────────────────────────── */}
      <div style={{ padding: '4px 14px 8px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
          {[...frame.states]
            .sort((a, b) => a.rank - b.rank)
            .map((st, i) => {
              const c = getCharacter(st.characterId);
              const odds = liveOdds[st.characterId] ?? 3.0;
              const medalColors = ['#f5c542', '#c0c0c0', '#cd7f32'];
              const isTop = i < 3;
              return (
                <div key={st.characterId}
                  className={i === 0 ? 'race-rank-top' : ''}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 2, padding: '4px 8px',
                    background: isTop ? `${medalColors[i]}18` : C.panelAlt,
                    border: `1px solid ${isTop ? medalColors[i] + '66' : C.line}`,
                    borderRadius: 8, minWidth: 52,
                  }}>
                  <span style={{ ...pix, fontSize: 8, color: isTop ? medalColors[i] : C.dim }}>
                    {i + 1}위
                  </span>
                  <CharIcon id={c.id} size={14} />
                  <span style={{ ...kr, fontSize: 9, color: C.text, whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ ...pix, fontSize: 6, color: C.cyan }}>{odds}x</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Live Betting ───────────────────────────────────────── */}
      <div style={{
        margin: '0 14px',
        background: C.panel, border: `1px solid ${C.line}`,
        borderRadius: 10, padding: '10px 12px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...pix, fontSize: 8, color: C.cyan }}>⚡ LIVE BET</span>
          <div style={{ flex: 1 }} />
          <span style={{ ...kr, fontSize: 11, color: C.dim }}>
            {liveBetPlayer?.name}{' '}
            <span style={{ color: C.gold }}>{liveBetPlayerRemain}</span>칩
          </span>
        </div>

        {/* Player tabs */}
        {players.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {players.map(p => {
              const pBetTotal = betsRef.current.filter(b => b.playerId === p.id).reduce((s, b) => s + b.amount, 0);
              const pRemain = p.chips - pBetTotal;
              const active = liveBetPlayerId === p.id;
              return (
                <button key={p.id} onClick={() => setLiveBetPlayerId(p.id)} style={{
                  ...kr, fontSize: 11,
                  background: active ? C.cyan : C.panelAlt,
                  color: active ? '#000' : C.dim,
                  border: `1px solid ${active ? C.cyan : C.line}`,
                  borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                }}>
                  {p.name} <span style={{ fontSize: 9 }}>({pRemain})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Amount selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[25, 50, 100, 150].map(a => (
            <button key={a} onClick={() => setBetAmount(a)} style={{
              ...pix, fontSize: 7,
              background: betAmount === a ? C.gold : C.panelAlt,
              color: betAmount === a ? '#000' : C.dim,
              border: `1px solid ${betAmount === a ? C.gold : C.line}`,
              borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
            }}>{a}</button>
          ))}
          <input
            type="number" value={betAmount}
            onChange={e => setBetAmount(Math.max(10, Math.min(liveBetPlayerRemain, Number(e.target.value))))}
            style={{
              width: 52, padding: '3px 6px',
              background: C.panelAlt, border: `1px solid ${C.line}`,
              borderRadius: 5, color: C.text, ...pix, fontSize: 7,
            }}
          />
        </div>

        {/* 2-column character grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {fixedOrder.map(fixed => {
            const state = rankMap[fixed.characterId] ?? fixed;
            const c = getCharacter(state.characterId);
            const odds = liveOdds[state.characterId] ?? 3.0;
            const top3 = state.rank <= 3;
            const canBet = betAmount <= liveBetPlayerRemain;
            const myBetCount = betsRef.current.filter(
              b => b.playerId === liveBetPlayer?.id && b.characterId === state.characterId && b.isLive
            ).length;
            return (
              <button
                key={state.characterId}
                onClick={() => addLiveBet(state.characterId)}
                disabled={!canBet}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 8px',
                  background: top3 ? `${C.gold}12` : canBet ? `${C.cyan}08` : C.panelAlt,
                  border: `1px solid ${top3 ? C.gold + '55' : canBet ? C.cyan + '33' : C.line}`,
                  borderRadius: 7, cursor: canBet ? 'pointer' : 'not-allowed',
                  textAlign: 'left', opacity: canBet ? 1 : 0.5,
                }}
              >
                <span style={{ ...pix, fontSize: 7, color: top3 ? C.gold : C.dim, minWidth: 14 }}>
                  {state.rank}
                </span>
                <CharIcon id={c.id} size={13} />
                <span style={{ ...kr, fontSize: 10, color: C.text, flex: 1 }}>{c.name}</span>
                {myBetCount > 0 && (
                  <span style={{ ...pix, fontSize: 6, color: C.gold }}>{myBetCount}★</span>
                )}
                {state.speedBoost > 1.1 && <span style={{ fontSize: 9 }}>⚡</span>}
                <span style={{ ...pix, fontSize: 7, color: C.cyan, whiteSpace: 'nowrap' }}>
                  {odds}x
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Finish Banner ──────────────────────────────────────── */}
      {isFinished && (
        <div className="race-finish" style={{
          margin: '12px 14px 0',
          background: `linear-gradient(135deg, ${C.gold}18, ${C.purple}22)`,
          border: `2px solid ${C.gold}`,
          borderRadius: 14, padding: '20px 16px', textAlign: 'center',
        }}>
          <div style={{
            ...pix, fontSize: 18, color: C.gold, letterSpacing: 4, marginBottom: 14,
            textShadow: `0 0 20px ${C.gold}`,
          }}>
            🏁 FINISH! 🏁
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end' }}>
            {/* 2nd */}
            {raceResult.finishOrder[1] && (() => {
              const c = getCharacter(raceResult.finishOrder[1]);
              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>🥈</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><CharIcon id={c.id} size={22} /></div>
                  <div style={{ ...kr, fontSize: 10, color: '#c0c0c0', marginTop: 3 }}>{c.name}</div>
                </div>
              );
            })()}
            {/* 1st — biggest, center */}
            {raceResult.finishOrder[0] && (() => {
              const c = getCharacter(raceResult.finishOrder[0]);
              return (
                <div style={{ textAlign: 'center', transform: 'scale(1.25)', marginBottom: 4 }}>
                  <div style={{ fontSize: 30 }}>🥇</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><CharIcon id={c.id} size={28} /></div>
                  <div style={{
                    ...kr, fontSize: 12, color: C.gold, marginTop: 4,
                    textShadow: `0 0 8px ${C.gold}`,
                  }}>{c.name}</div>
                </div>
              );
            })()}
            {/* 3rd */}
            {raceResult.finishOrder[2] && (() => {
              const c = getCharacter(raceResult.finishOrder[2]);
              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>🥉</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><CharIcon id={c.id} size={22} /></div>
                  <div style={{ ...kr, fontSize: 10, color: '#cd7f32', marginTop: 3 }}>{c.name}</div>
                </div>
              );
            })()}
          </div>
          <div style={{ ...kr, fontSize: 12, color: C.dim, marginTop: 16 }}>결과 집계 중...</div>
        </div>
      )}
    </div>
  );
}

// ── PHASE: Settlement ─────────────────────────────────────────
function Settlement({
  results, round, raceResult, onNext,
}: {
  results: PlayerRoundResult[];
  round: number;
  raceResult: RaceResult;
  onNext: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = results.slice().sort((a, b) => b.netChange - a.netChange);
  const top3finish = raceResult.finishOrder.slice(0, 3).map(id => getCharacter(id));

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: '#0d0c22', borderBottom: `1px solid ${C.gold}44`,
      }}>
        <span style={{
          ...pix, fontSize: 10, color: C.gold, letterSpacing: 3,
          textShadow: `0 0 10px ${C.gold}88`,
        }}>
          ROUND {round} RESULT
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ ...kr, fontSize: 11, color: C.dim }}>
          {round < MAX_ROUNDS ? `${MAX_ROUNDS - round}라운드 남음` : '마지막 라운드'}
        </span>
      </div>

      {/* Podium */}
      <div style={{
        margin: '16px 16px 12px',
        background: `linear-gradient(180deg, ${C.gold}18 0%, transparent 100%)`,
        border: `1px solid ${C.gold}44`,
        borderRadius: 14, padding: '16px 12px 12px',
      }}>
        <div style={{ ...pix, fontSize: 7, color: C.dim, letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>
          FINISH ORDER
        </div>
        {/* Top 3 podium */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, marginBottom: 12 }}>
          {/* 2nd */}
          {top3finish[1] && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>🥈</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                <CharIcon id={top3finish[1].id} size={20} />
              </div>
              <div style={{ ...kr, fontSize: 10, color: '#c0c0c0' }}>{top3finish[1].name}</div>
              <div style={{
                marginTop: 4, height: 36,
                background: '#c0c0c022', border: '1px solid #c0c0c044',
                borderRadius: '4px 4px 0 0',
              }} />
            </div>
          )}
          {/* 1st */}
          {top3finish[0] && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>🥇</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                <CharIcon id={top3finish[0].id} size={26} />
              </div>
              <div style={{ ...kr, fontSize: 12, color: C.gold, textShadow: `0 0 6px ${C.gold}` }}>
                {top3finish[0].name}
              </div>
              <div style={{
                marginTop: 4, height: 52,
                background: `${C.gold}22`, border: `1px solid ${C.gold}55`,
                borderRadius: '4px 4px 0 0',
              }} />
            </div>
          )}
          {/* 3rd */}
          {top3finish[2] && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>🥉</div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                <CharIcon id={top3finish[2].id} size={20} />
              </div>
              <div style={{ ...kr, fontSize: 10, color: '#cd7f32' }}>{top3finish[2].name}</div>
              <div style={{
                marginTop: 4, height: 24,
                background: '#cd7f3222', border: '1px solid #cd7f3244',
                borderRadius: '4px 4px 0 0',
              }} />
            </div>
          )}
        </div>
        {/* Rest of finish order */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {raceResult.finishOrder.slice(3).map((id, i) => {
            const c = getCharacter(id);
            return (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 8px',
                background: C.panelAlt, border: `1px solid ${C.line}`,
                borderRadius: 12,
              }}>
                <span style={{ ...pix, fontSize: 7, color: C.dim }}>{i + 4}</span>
                <CharIcon id={c.id} size={11} />
                <span style={{ ...kr, fontSize: 9, color: C.dim }}>{c.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player results */}
      <div style={{ padding: '0 16px' }}>
        {sorted.map((r, rank) => {
          const isExpanded = expanded === r.playerId;
          const won = r.netChange > 0;
          const lost = r.netChange < 0;
          return (
            <div key={r.playerId} style={{
              background: C.panel,
              border: `1.5px solid ${won ? C.green + '55' : lost ? C.red + '33' : C.line}`,
              borderRadius: 12, marginBottom: 8,
              overflow: 'hidden',
            }}>
              <div
                onClick={() => setExpanded(isExpanded ? null : r.playerId)}
                style={{
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  background: rank === 0 ? `${C.green}08` : 'transparent',
                }}
              >
                {rank === 0 && (
                  <span style={{ ...pix, fontSize: 11, color: C.green }}>👑</span>
                )}
                <span style={{ ...kr, fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>
                  {r.name}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    ...pix, fontSize: 12,
                    color: won ? C.green : lost ? C.red : C.dim,
                    textShadow: won ? `0 0 8px ${C.green}88` : 'none',
                  }}>
                    {r.netChange >= 0 ? '+' : ''}{r.netChange}
                  </div>
                  <div style={{ ...pix, fontSize: 8, color: C.dim }}>{r.chipsAfter} 칩</div>
                </div>
                <span style={{ ...pix, fontSize: 8, color: C.dim }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.line}` }}>
                  <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {r.betResults.map((br, i) => {
                      const c = getCharacter(br.bet.characterId);
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 6px',
                          background: br.won ? `${C.green}10` : '#ffffff06',
                          borderRadius: 6,
                          opacity: br.won ? 1 : 0.6,
                        }}>
                          <CharIcon id={c.id} size={13} />
                          <span style={{ ...kr, fontSize: 11, color: C.text, flex: 1 }}>
                            {c.name} <span style={{ ...pix, fontSize: 7, color: C.dim }}>
                              {br.bet.type === 'win' ? 'WIN' : 'PLACE'}{br.bet.isLive ? '·LIVE' : ''}
                            </span>
                          </span>
                          <span style={{ ...pix, fontSize: 8, color: br.won ? C.green : C.red }}>
                            {br.won ? `+${br.payout - br.bet.amount}` : `-${br.bet.amount}`}
                          </span>
                        </div>
                      );
                    })}
                    {r.contractResult && (
                      <div style={{
                        marginTop: 6, padding: '7px 10px',
                        background: r.contractResult.fulfilled ? `${C.green}18` : `${C.red}18`,
                        border: `1px solid ${r.contractResult.fulfilled ? C.green + '55' : C.red + '55'}`,
                        borderRadius: 8,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ ...kr, fontSize: 11, color: C.text }}>
                          📋 {r.contractResult.contract.name}
                        </span>
                        <span style={{ ...pix, fontSize: 8, color: r.contractResult.fulfilled ? C.green : C.red }}>
                          {r.contractResult.fulfilled
                            ? `✓ +${r.contractResult.contract.reward}`
                            : `✗ -${r.contractResult.contract.penalty}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <div style={{ padding: '8px 16px' }}>
        <button onClick={onNext} style={{
          width: '100%', padding: '16px',
          background: round < MAX_ROUNDS
            ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})`
            : `linear-gradient(135deg, ${C.gold}, #e09010)`,
          color: '#000', border: 'none', borderRadius: 10,
          ...pix, fontSize: 11, cursor: 'pointer', letterSpacing: 2,
          boxShadow: round < MAX_ROUNDS ? `0 0 16px ${C.purple}55` : `0 0 16px ${C.gold}55`,
        }}>
          {round < MAX_ROUNDS ? `▶ ROUND ${round + 1} START` : '🏆 FINAL RESULT'}
        </button>
      </div>
    </div>
  );
}

// ── PHASE: Final ──────────────────────────────────────────────
function FinalResults({ players, roundResults, onRestart }: {
  players: Player[];
  roundResults: PlayerRoundResult[][];
  onRestart: () => void;
}) {
  const final = [...players].sort((a, b) => b.chips - a.chips);
  const winner = final[0];

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
      <div style={{ ...pix, fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 8 }}>
        FINAL RESULT
      </div>
      <h2 style={{ ...kr, fontSize: 28, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
        {winner.name}
      </h2>
      <div style={{ ...pix, fontSize: 10, color: C.gold, marginBottom: 32 }}>
        {winner.chips} 칩 우승!
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {final.map((p, i) => (
          <div key={p.id} style={{
            background: i === 0 ? `${C.gold}22` : C.panel,
            border: `1.5px solid ${i === 0 ? C.gold : C.line}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ ...pix, fontSize: 14, color: i === 0 ? C.gold : C.dim }}>
              {['🥇', '🥈', '🥉', '4', '5', '6'][i]}
            </span>
            <span style={{ ...kr, fontSize: 16, fontWeight: 700, color: C.text, flex: 1 }}>
              {p.name}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...pix, fontSize: 11, color: i === 0 ? C.gold : C.text }}>
                {p.chips}
              </div>
              <div style={{ ...pix, fontSize: 8, color: C.dim }}>
                {p.chips >= STARTING_CHIPS ? '+' : ''}{p.chips - STARTING_CHIPS}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        <button onClick={onRestart} style={{
          ...pix, fontSize: 9, letterSpacing: 2,
          background: `linear-gradient(135deg, ${C.gold}, #e09010)`,
          color: '#000', border: 'none', borderRadius: 8,
          padding: '12px 28px', cursor: 'pointer',
        }}>
          ▶ PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

// ── Main Game Component ───────────────────────────────────────
function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [round, setRound] = useState(1);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  // Round data
  const [trackId, setTrackId] = useState('');
  const [weatherId, setWeatherId] = useState('');
  const [seed, setSeed] = useState(0);
  const [preRaceOdds, setPreRaceOdds] = useState<Record<string, number>>({});
  const [racingCharIds, setRacingCharIds] = useState<string[]>([]);

  // Contracts
  const [contractOptions, setContractOptions] = useState<Record<string, ContractCard[]>>({});
  const [selectedContracts, setSelectedContracts] = useState<Record<string, ContractCard | null>>({});

  // Bets
  const [bets, setBets] = useState<Record<string, Bet[]>>({});

  // Race
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);

  // Results history
  const [roundResults, setRoundResults] = useState<PlayerRoundResult[][]>([]);

  // Setup from URL params
  useEffect(() => {
    const setup = searchParams.get('setup');
    if (!setup) { router.replace('/race-game'); return; }
    try {
      const raw: { name: string; chips: number }[] = JSON.parse(setup);
      const ps: Player[] = raw.map((p, i) => ({
        id: nanoid6() + i,
        name: p.name,
        chips: p.chips,
      }));
      setPlayers(ps);
      setPhase('round-intro');
      initRound(1, ps, Math.floor(Math.random() * 99999));
    } catch {
      router.replace('/race-game');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initRound(r: number, ps: Player[], baseSeed: number) {
    const data = generateRoundData(r, baseSeed);
    setTrackId(data.trackId);
    setWeatherId(data.weatherId);
    setSeed(data.seed);
    setPreRaceOdds(data.preRaceOdds);
    setRacingCharIds(data.racingCharIds);

    // Contract options per player
    const opts: Record<string, ContractCard[]> = {};
    for (const p of ps) {
      opts[p.id] = generateContractOptions(p.id, r, baseSeed);
    }
    setContractOptions(opts);
    setSelectedContracts({});
    setBets({});
    setRaceResult(null);
    setCurrentPlayerIdx(0);
    setRound(r);
  }

  // ── Phase transitions ────────────────────────────────────────

  function onRoundIntroNext() {
    setPhase('contract-select');
  }

  function onContractSelect(playerId: string, card: ContractCard) {
    setSelectedContracts(prev => ({ ...prev, [playerId]: card }));
    advanceContractPlayer();
  }

  function onContractSkip(playerId: string) {
    setSelectedContracts(prev => ({ ...prev, [playerId]: null }));
    advanceContractPlayer();
  }

  function advanceContractPlayer() {
    setCurrentPlayerIdx(prev => {
      const next = prev + 1;
      if (next >= players.length) {
        setPhase('pre-betting');
        return 0;
      }
      return next;
    });
  }

  function onBettingDone() {
    setCurrentPlayerIdx(prev => {
      const next = prev + 1;
      if (next >= players.length) {
        startRace();
        return 0;
      }
      return next;
    });
  }

  function startRace() {
    const track = TRACKS.find(t => t.id === trackId)!;
    const weather = WEATHER_LIST.find(w => w.id === weatherId)!;
    const chars = racingCharIds.map(id => getCharacter(id));
    const result = simulateRace(chars, track, weather, seed);
    setRaceResult(result);
    setPhase('race');
  }

  function onAddBet(bet: Bet) {
    setBets(prev => ({
      ...prev,
      [bet.playerId]: [...(prev[bet.playerId] ?? []), bet],
    }));
  }

  function onRemoveBet(playerId: string, betId: string) {
    setBets(prev => ({
      ...prev,
      [playerId]: (prev[playerId] ?? []).filter(b => b.id !== betId),
    }));
  }

  function onLiveBet(bet: Bet) {
    setBets(prev => ({
      ...prev,
      [bet.playerId]: [...(prev[bet.playerId] ?? []), bet],
    }));
  }

  function onRaceDone() {
    if (!raceResult) return;
    const results = settleRound(players, bets, selectedContracts, raceResult);
    setRoundResults(prev => [...prev, results]);
    // Update player chips
    setPlayers(prev => prev.map(p => {
      const r = results.find(r => r.playerId === p.id);
      return r ? { ...p, chips: r.chipsAfter } : p;
    }));
    setPhase('settlement');
  }

  function onSettlementNext() {
    if (round >= MAX_ROUNDS) {
      setPhase('final');
    } else {
      const nextRound = round + 1;
      initRound(nextRound, players.map(p => {
        const r = roundResults[roundResults.length - 1]?.find(r => r.playerId === p.id);
        return r ? { ...p, chips: r.chipsAfter } : p;
      }), Math.floor(Math.random() * 99999));
      setPhase('round-intro');
    }
  }

  const currentPlayer = players[currentPlayerIdx];

  // ── Render phases ─────────────────────────────────────────────
  if (phase === 'lobby' || players.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.text, ...pix, fontSize: 10,
      }}>로딩 중...</div>
    );
  }

  if (phase === 'round-intro') {
    return (
      <RoundIntro
        round={round}
        trackId={trackId}
        weatherId={weatherId}
        onNext={onRoundIntroNext}
      />
    );
  }

  if (phase === 'contract-select' && currentPlayer) {
    return (
      <ContractSelection
        players={players}
        currentIdx={currentPlayerIdx}
        contractOptions={contractOptions}
        selectedContracts={selectedContracts}
        onSelect={onContractSelect}
        onSkip={onContractSkip}
      />
    );
  }

  if (phase === 'pre-betting' && currentPlayer) {
    return (
      <PreBetting
        player={currentPlayer}
        allCharIds={racingCharIds}
        preRaceOdds={preRaceOdds}
        currentBets={bets[currentPlayer.id] ?? []}
        onAddBet={onAddBet}
        onRemoveBet={id => onRemoveBet(currentPlayer.id, id)}
        onDone={onBettingDone}
        round={round}
      />
    );
  }

  if (phase === 'race' && raceResult) {
    return (
      <RacePhase
        raceResult={raceResult}
        trackId={trackId}
        weatherId={weatherId}
        preRaceOdds={preRaceOdds}
        round={round}
        players={players}
        currentBets={Object.values(bets).flat()}
        onLiveBet={onLiveBet}
        onRaceDone={onRaceDone}
      />
    );
  }

  if (phase === 'settlement' && roundResults.length > 0) {
    return (
      <Settlement
        results={roundResults[roundResults.length - 1]}
        round={round}
        raceResult={raceResult!}
        onNext={onSettlementNext}
      />
    );
  }

  if (phase === 'final') {
    return (
      <FinalResults
        players={players}
        roundResults={roundResults}
        onRestart={() => router.replace('/race-game')}
      />
    );
  }

  return null;
}

export default function RaceGamePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#0b0a17',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#f5c542', fontFamily: 'var(--f-pix)', fontSize: 10,
      }}>LOADING...</div>
    }>
      <GameContent />
    </Suspense>
  );
}
