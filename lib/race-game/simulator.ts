// ============================================================
// 레이스 시뮬레이션 엔진
// ============================================================
import {
  Character, Track, Weather,
  CharacterRaceState, RaceFrame, RaceResult,
  RaceEventLog, CheckpointRankings,
} from './types';
import { createRng } from './seededRandom';

// Race duration and time resolution
const RACE_DURATION = 150;   // seconds
const FRAME_INTERVAL = 0.5;  // record frame every 0.5s

// Checkpoint times
const CP_TIMES = { cp1: 35, cp2: 70, cp3: 110 };

// Phase definitions: [startTime, endTime, statWeights]
type Phase = {
  start: number; end: number;
  w: { spd: number; acc: number; sta: number; lck: number; tec: number };
};
const PHASES: Phase[] = [
  { start: 0,   end: 10,  w: { spd: 0.3, acc: 0.4, sta: 0.1, lck: 0.1, tec: 0.1 } },
  { start: 10,  end: 35,  w: { spd: 0.4, acc: 0.3, sta: 0.1, lck: 0.1, tec: 0.1 } },
  { start: 35,  end: 70,  w: { spd: 0.3, acc: 0.2, sta: 0.3, lck: 0.1, tec: 0.1 } },
  { start: 70,  end: 110, w: { spd: 0.2, acc: 0.1, sta: 0.4, lck: 0.2, tec: 0.1 } },
  { start: 110, end: 140, w: { spd: 0.3, acc: 0.1, sta: 0.4, lck: 0.1, tec: 0.1 } },
  { start: 140, end: 150, w: { spd: 0.5, acc: 0.1, sta: 0.3, lck: 0.05, tec: 0.05 } },
];

function getPhase(t: number): Phase {
  return PHASES.find(p => t >= p.start && t < p.end) ?? PHASES[PHASES.length - 1];
}

// Calculate base m/s for a character given track/weather context
function calcBaseSpeed(
  char: Character,
  track: Track,
  weather: Weather,
  t: number
): number {
  const p = getPhase(t);
  const s = char.stats;
  const statScore = (
    s.spd * p.w.spd +
    s.acc * p.w.acc +
    s.sta * p.w.sta +
    s.lck * p.w.lck +
    s.tec * p.w.tec
  );

  // Convert stat score (1-10) to m/s (roughly 16-28 m/s range)
  let speed = 8 + statScore * 2.0;

  // Track affinity bonus
  if (char.favoredTracks.includes(track.id)) speed *= 1.15;
  // Track weakness
  if (char.weakTracks.includes(track.id)) speed *= 0.85;

  // Weather affinity bonus
  if (char.favoredWeather.includes(weather.id)) speed *= 1.12;

  // Global weather modifier
  speed *= weather.globalSpeedMod;

  // Sandstorm penalty for non-resistant chars
  if (weather.id === 'sandstorm' && !['dune', 'roxy'].includes(char.id)) {
    speed *= 0.88;
  }

  // Gale wind bonus for gale
  if (weather.id === 'gale-wind' && char.id === 'gale') speed *= 1.22;

  // Fog bonus for misty/neo
  if (weather.id === 'fog' && ['misty', 'neo'].includes(char.id)) speed *= 1.1;

  // Rainbow LCK boost
  if (weather.id === 'rainbow') {
    speed *= 1 + (s.lck / 10) * 0.1;
  }

  // Bolt start dash
  if (char.id === 'bolt' && t < 10) speed *= 1.3;

  // Roxy late spurt (final 400m worth ~ last 25s)
  if (char.id === 'roxy' && t >= 110) speed *= 1.28;

  // Mudd underdog — handled dynamically in simulation based on rank

  // Sage second wind — handled via stamina check below

  return speed;
}

// Stamina drain rate per second
function getStaminaDrain(char: Character, weather: Weather): number {
  let rate = 1 / 5; // 1 point per 5 seconds baseline
  if (weather.id === 'heatwave' && !['ember', 'dune'].includes(char.id)) {
    rate *= 1.5;
  }
  if (track_isVolcano && char.id === 'frosty') rate *= 2;
  return rate;
}

// Globals for quick context checks (set per simulation)
let track_isVolcano = false;

type EventDef = {
  name: string;
  desc: string;
  isGood: boolean;
  speedEffect: number; // multiplier for speedBoost
  duration: number;    // seconds
  minTime: number;     // don't trigger before this time
  maxTime: number;
  prob: number;        // base per-second probability
};

const EVENTS: EventDef[] = [
  // Good events
  { name: '부스트 패드', desc: '속도 패드 통과! 속도 +25%',       isGood: true,  speedEffect: 1.25, duration: 4,  minTime: 10,  maxTime: 140, prob: 0.012 },
  { name: '제2의 바람', desc: '숨겨진 힘이 폭발! 속도 +20%',      isGood: true,  speedEffect: 1.20, duration: 6,  minTime: 40,  maxTime: 140, prob: 0.010 },
  { name: '슬립스트림', desc: '기류를 탔다! 속도 +15%',            isGood: true,  speedEffect: 1.15, duration: 5,  minTime: 15,  maxTime: 120, prob: 0.015 },
  { name: '니트로 캔',  desc: '니트로 발견! 속도 +30%',            isGood: true,  speedEffect: 1.30, duration: 3,  minTime: 20,  maxTime: 130, prob: 0.008 },
  { name: '클린 라인',  desc: '완벽한 경로! 속도 +10%',            isGood: true,  speedEffect: 1.10, duration: 8,  minTime: 5,   maxTime: 140, prob: 0.018 },
  { name: '상승 기류',  desc: '상승 기류를 탔다! 속도 +20%',       isGood: true,  speedEffect: 1.20, duration: 5,  minTime: 10,  maxTime: 130, prob: 0.010 },
  { name: '숏컷 발견',  desc: '숏컷 발견! 속도 +35%',              isGood: true,  speedEffect: 1.35, duration: 4,  minTime: 20,  maxTime: 125, prob: 0.007 },
  // Bad events
  { name: '슬립',       desc: '미끄러졌다! 속도 -30%',             isGood: false, speedEffect: 0.70, duration: 3,  minTime: 5,   maxTime: 145, prob: 0.012 },
  { name: '스핀 아웃',  desc: '스핀! 잠시 멈춘다. 속도 -40%',     isGood: false, speedEffect: 0.60, duration: 2,  minTime: 10,  maxTime: 140, prob: 0.008 },
  { name: '진흙 함정',  desc: '진흙에 빠졌다! 속도 -25%',          isGood: false, speedEffect: 0.75, duration: 5,  minTime: 10,  maxTime: 130, prob: 0.012 },
  { name: '낙석',       desc: '낙석에 맞았다! 속도 -35%',           isGood: false, speedEffect: 0.65, duration: 3,  minTime: 10,  maxTime: 140, prob: 0.010 },
  { name: '과열',       desc: '엔진 과열! 속도 -20%',               isGood: false, speedEffect: 0.80, duration: 6,  minTime: 60,  maxTime: 140, prob: 0.010 },
  { name: '충돌',       desc: '다른 선수와 충돌! 속도 -20%',        isGood: false, speedEffect: 0.80, duration: 4,  minTime: 5,   maxTime: 140, prob: 0.012 },
  // High-impact bad events (상위권에 가중치)
  { name: '타이어 펑크', desc: '타이어 펑크! 속도 -50%',            isGood: false, speedEffect: 0.50, duration: 5,  minTime: 20,  maxTime: 130, prob: 0.006 },
  { name: '역풍 직격',   desc: '강한 역풍 직격! 속도 -35%',         isGood: false, speedEffect: 0.65, duration: 7,  minTime: 10,  maxTime: 135, prob: 0.008 },
  { name: '급경사 충격', desc: '급경사에서 충격! 속도 -45%',        isGood: false, speedEffect: 0.55, duration: 4,  minTime: 15,  maxTime: 125, prob: 0.007 },
  { name: '장애물 충돌', desc: '장애물과 정면충돌! 속도 -55%',      isGood: false, speedEffect: 0.45, duration: 3,  minTime: 25,  maxTime: 120, prob: 0.004 },
];

// goodBias: negative = more bad events (for leaders), positive = more good events (for underdogs)
function selectEvent(rng: () => number, t: number, isGoodWeather: boolean, goodBias: number = 0): EventDef | null {
  const available = EVENTS.filter(e => t >= e.minTime && t <= e.maxTime);
  if (available.length === 0) return null;

  const goodWeight = Math.max(0.12, Math.min(0.85, (isGoodWeather ? 0.52 : 0.42) + goodBias));
  const pickGood = rng() < goodWeight;
  const pool = available.filter(e => e.isGood === pickGood);
  if (pool.length === 0) return available[Math.floor(rng() * available.length)];
  return pool[Math.floor(rng() * pool.length)];
}

// ── Main simulation function ──────────────────────────────────
export function simulateRace(
  characters: Character[],
  track: Track,
  weather: Weather,
  seed: number
): RaceResult {
  track_isVolcano = track.id === 'volcano';
  const rng = createRng(seed);
  const DT = 0.1; // simulation time step in seconds
  const totalMeters = track.distance;
  const isGoodWeather = ['clear', 'rainbow', 'gale-wind'].includes(weather.id);

  // Initialize character states
  const states: CharacterRaceState[] = characters.map((c, i) => ({
    characterId: c.id,
    position: 0,
    speed: calcBaseSpeed(c, track, weather, 0),
    stamina: c.stats.sta,
    rank: i + 1,
    isFinished: false,
    speedBoost: 1.0,
    boostRemaining: 0,
    slowRemaining: 0,
    slowFactor: 1.0,
    activeUsed: false,
    lastEventTime: -10,
  }));

  const frames: RaceFrame[] = [];
  const allEvents: RaceEventLog[] = [];
  let nextFrameTime = 0;

  const cpRankings: CheckpointRankings = { cp1: [], cp2: [], cp3: [] };
  const finishOrder: string[] = [];

  // Simulation loop
  for (let t = 0; t <= RACE_DURATION; t = +(t + DT).toFixed(2)) {
    const newEvents: RaceEventLog[] = [];

    for (const st of states) {
      if (st.isFinished) continue;

      const char = characters.find(c => c.id === st.characterId)!;

      // Stamina drain
      st.stamina = Math.max(0, st.stamina - getStaminaDrain(char, weather) * DT);

      // Boost/slow timers
      if (st.boostRemaining > 0) {
        st.boostRemaining = Math.max(0, st.boostRemaining - DT);
        if (st.boostRemaining <= 0) st.speedBoost = 1.0;
      }
      if (st.slowRemaining > 0) {
        st.slowRemaining = Math.max(0, st.slowRemaining - DT);
        if (st.slowRemaining <= 0) st.slowFactor = 1.0;
      }

      // Base speed calculation
      let spd = calcBaseSpeed(char, track, weather, t);

      // Stamina speed cap
      if (st.stamina <= 0) {
        if (char.id === 'sage') {
          spd *= 0.92; // Second Wind passive: 92% even at STA 0
        } else {
          spd *= 0.75; // Normal stamina-out cap (was 60%, too harsh)
        }
      }

      // Mudd underdog passive
      if (char.id === 'mudd') {
        const rankBonus = 1 + Math.max(0, (st.rank - 6) / characters.length) * 0.3;
        spd *= rankBonus;
      }

      // Terrain section modifier
      const posFrac = st.position / totalMeters;
      const sect = track.sections?.find(s => posFrac >= s.from && posFrac < s.to);
      if (sect) {
        const s = char.stats;
        if (sect.type === 'uphill') {
          // STA dominates — high STA near no penalty, low STA heavy penalty
          spd *= 0.80 + (s.sta / 10) * 0.16 + (s.spd / 10) * 0.04;
        } else if (sect.type === 'downhill') {
          // Everyone speeds up; SPD chars gain more
          spd *= 1.06 + (s.spd / 10) * 0.06;
        } else if (sect.type === 'curves') {
          // TEC helps; low TEC gets penalty
          spd *= 0.84 + (s.tec / 10) * 0.13 + (s.acc / 10) * 0.03;
        } else if (sect.type === 'hazard') {
          // Slight global slowdown (events handle the rest)
          spd *= 0.91;
        }
        // flat: no modifier
      }

      // Rubber-band: 하위 40%는 캐치업 보너스
      const catchupThreshold = Math.ceil(characters.length * 0.6);
      if (st.rank > catchupThreshold) {
        const catchup = 1 + ((st.rank - catchupThreshold) / characters.length) * 0.20;
        spd *= catchup;
      }

      // Apply boost/slow
      spd *= st.speedBoost * st.slowFactor;

      // Noise ±7%, 4% 확률로 큰 변동 (±15%)
      const noise = 0.93 + rng() * 0.14;
      const bigSwing = rng() < 0.04 ? (rng() < 0.5 ? 0.85 : 1.15) : 1.0;
      spd *= noise * bigSwing;

      st.speed = spd;

      // 순위 기반 이벤트 확률: 1등 2배, 2-3등 1.4배, 하위권 0.75배
      const rankEventMult = st.rank === 1 ? 2.0 : st.rank <= 3 ? 1.4 : st.rank <= 6 ? 1.0 : 0.75;
      const timeSinceLastEvent = t - st.lastEventTime;
      const eventProb = track.eventRate * DT * (timeSinceLastEvent > 4 ? 1.5 : 0.4) * rankEventMult;

      // Rainbow weather doubles good event chance
      const weatherFactor = weather.id === 'rainbow' ? 1.8 : weather.id === 'storm' ? 1.5 : 1.0;

      // 상위권: 나쁜 이벤트 편향 / 하위권: 좋은 이벤트 편향
      const goodBias = st.rank === 1 ? -0.32 : st.rank <= 3 ? -0.16 : st.rank >= 8 ? 0.12 : 0;

      if (rng() < eventProb * weatherFactor && t > 5) {
        const ev = selectEvent(rng, t, isGoodWeather, goodBias);
        if (ev && !(ev.isGood && st.speedBoost > 1.1) && !(ev.isGood === false && st.slowRemaining > 0)) {
          if (ev.isGood) {
            st.speedBoost = ev.speedEffect;
            st.boostRemaining = ev.duration;
          } else {
            // Neo is immune to collision/corner events
            if (char.id === 'neo' && ['스핀 아웃', '충돌'].includes(ev.name)) {
              // skip
            } else {
              st.slowFactor = ev.speedEffect;
              st.slowRemaining = ev.duration;
            }
          }
          st.lastEventTime = t;
          const log: RaceEventLog = {
            time: t,
            characterId: st.characterId,
            eventName: ev.name,
            description: `${char.name} — ${ev.desc}`,
            isGood: ev.isGood,
          };
          newEvents.push(log);
          allEvents.push(log);
        }
      }

      // Update position
      st.position += st.speed * DT;

      // Check finish
      if (st.position >= totalMeters) {
        st.position = totalMeters;
        st.isFinished = true;
        st.finishTime = t;
        finishOrder.push(st.characterId);
      }
    }

    // Update ranks
    const sorted = [...states].sort((a, b) => b.position - a.position);
    sorted.forEach((s, i) => { s.rank = i + 1; });

    // Record checkpoints
    if (Math.abs(t - CP_TIMES.cp1) < DT / 2 && cpRankings.cp1.length === 0) {
      cpRankings.cp1 = sorted.map(s => s.characterId);
    }
    if (Math.abs(t - CP_TIMES.cp2) < DT / 2 && cpRankings.cp2.length === 0) {
      cpRankings.cp2 = sorted.map(s => s.characterId);
    }
    if (Math.abs(t - CP_TIMES.cp3) < DT / 2 && cpRankings.cp3.length === 0) {
      cpRankings.cp3 = sorted.map(s => s.characterId);
    }

    // Record frame
    if (t >= nextFrameTime) {
      frames.push({
        time: t,
        states: states.map(s => ({ ...s })),
        newEvents,
      });
      nextFrameTime = +(nextFrameTime + FRAME_INTERVAL).toFixed(2);
    }

    // End early if all finished
    if (finishOrder.length === characters.length) break;
  }

  // Fill in remaining unfinished chars by position
  const unfinished = states
    .filter(s => !s.isFinished)
    .sort((a, b) => b.position - a.position);
  for (const s of unfinished) finishOrder.push(s.characterId);

  // Fill cp rankings if race ended early
  if (cpRankings.cp1.length === 0) cpRankings.cp1 = [...finishOrder];
  if (cpRankings.cp2.length === 0) cpRankings.cp2 = [...finishOrder];
  if (cpRankings.cp3.length === 0) cpRankings.cp3 = [...finishOrder];

  return { finishOrder, frames, checkpoints: cpRankings, events: allEvents };
}

// Get frame index for a given race time
export function getFrameAtTime(frames: RaceFrame[], time: number): RaceFrame {
  const idx = Math.floor(time / FRAME_INTERVAL);
  return frames[Math.min(idx, frames.length - 1)];
}

// Checkpoint frame indices for pausing
export const CHECKPOINT_FRAME_INDICES = {
  cp1: Math.floor(CP_TIMES.cp1 / FRAME_INTERVAL),
  cp2: Math.floor(CP_TIMES.cp2 / FRAME_INTERVAL),
  cp3: Math.floor(CP_TIMES.cp3 / FRAME_INTERVAL),
  finish: Math.floor(RACE_DURATION / FRAME_INTERVAL),
};

export const TOTAL_RACE_FRAMES = Math.ceil(RACE_DURATION / FRAME_INTERVAL);
