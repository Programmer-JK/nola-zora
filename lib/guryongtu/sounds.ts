import { Howl } from 'howler';

// ─── BGM (Howler.js) ─────────────────────────────────────────
let _bgm: Howl | null = null;

export function getBgm(): Howl {
  if (!_bgm) {
    _bgm = new Howl({ src: ['/opening.mp3'], loop: true, volume: 0.18 });
  }
  return _bgm;
}

// ─── Web Audio SFX ───────────────────────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    _ctx = new (window.AudioContext || W.webkitAudioContext!)();
  }
  return _ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.25,
  startOffset = 0,
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + startOffset;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

export const sfx = {
  // 타일 클릭 (짧은 픽셀 비프)
  tileClick: () => tone(880, 0.07, 'square', 0.18),

  // 타일 확정 (두 음)
  tileSubmit: () => {
    tone(660, 0.08, 'square', 0.25);
    tone(990, 0.08, 'square', 0.22, 0.07);
  },

  // 공개 (긴박한 상승 사운드)
  reveal: () => {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.45);
    g.gain.setValueAtTime(0.45, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.55);
    osc.start();
    osc.stop(c.currentTime + 0.56);
  },

  // 라운드 승리 (상승 아르페지오)
  win: () => {
    [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'square', 0.3, i * 0.1));
  },

  // 라운드 패배 (하강)
  lose: () => {
    tone(330, 0.22, 'sawtooth', 0.3);
    tone(247, 0.28, 'sawtooth', 0.25, 0.18);
  },

  // 무승부
  draw: () => {
    tone(440, 0.12, 'square', 0.2);
    tone(440, 0.12, 'square', 0.15, 0.16);
  },

  // 매치 승리 (팡파레)
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.35, i * 0.13));
  },

  // 매치 패배 (슬픈 하강)
  defeat: () => {
    [330, 294, 247, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.3, i * 0.16));
  },
};
