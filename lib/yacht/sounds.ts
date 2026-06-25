// ============================================================
// 야추 — Sound Effects (Web Audio API)
// ============================================================

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number, dur: number,
  type: OscillatorType = 'sine',
  vol = 0.12,
  startDelay = 0,
  freqEnd?: number,
) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + startDelay + dur * 0.85);
    }
    gain.gain.setValueAtTime(0, c.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + startDelay + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + dur + 0.01);
  } catch { /* ignore */ }
}

function noiseBurst(
  dur: number, vol = 0.15, startDelay = 0,
  filterFreq?: number, filterType: BiquadFilterType = 'bandpass',
) {
  try {
    const c = getCtx();
    const bufLen = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur * 0.9);
    gain.connect(c.destination);
    if (filterFreq !== undefined) {
      const filter = c.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    src.start(c.currentTime + startDelay);
  } catch { /* ignore */ }
}

// 주사위 굴리는 중 — 딸깍딸깍 흔들리는 소리 (매 tick마다 호출)
export function playDiceRattle() {
  noiseBurst(0.045, 0.12, 0, 1800, 'bandpass');
  tone(420, 0.025, 'square', 0.05, 0, 320);
}

// 주사위 착지 — 탁! 하는 소리
export function playDiceLand() {
  noiseBurst(0.12, 0.18, 0, 900, 'lowpass');
  tone(180, 0.09, 'sine', 0.13, 0, 80);
  tone(340, 0.04, 'square', 0.06, 0.01);
}

// 점수 선택 확정 — 경쾌한 확인음
export function playScoreCommit() {
  tone(523, 0.10, 'sine', 0.10, 0);
  tone(659, 0.12, 'sine', 0.09, 0.07);
  tone(784, 0.18, 'sine', 0.10, 0.14);
}

// 주사위 HOLD 토글 — 짧은 틱
export function playHoldToggle() {
  tone(880, 0.04, 'sine', 0.07);
}
