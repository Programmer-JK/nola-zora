// ============================================================
// 아브라카왓 — Spell Sound Effects (Web Audio API)
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
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + startDelay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + dur + 0.01);
  } catch { /* ignore */ }
}

function noiseBurst(
  dur: number, vol = 0.15, startDelay = 0,
  filterFreq?: number, filterType: BiquadFilterType = 'lowpass',
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

// 1. 폭발 💥 — 저음 충격 + 노이즈 크래시
export function playExplosion() {
  noiseBurst(0.5, 0.22, 0, 900, 'lowpass');
  tone(80, 0.45, 'sine', 0.20, 0, 28);
  tone(130, 0.25, 'sawtooth', 0.10, 0.04);
  tone(55, 0.35, 'sine', 0.12, 0.08, 30);
}

// 2. 암흑 물질 🌑 — 불협화음 저음 드론
export function playDarkMatter() {
  tone(110, 0.7, 'sawtooth', 0.08, 0);
  tone(155, 0.6, 'sine', 0.05, 0.05);   // 불협화 장2도
  tone(82,  0.5, 'sawtooth', 0.07, 0.1, 55);
  tone(220, 0.35, 'sine', 0.04, 0.25, 110);
}

// 3. 치유의 바람 🌿 — 바람 소리 + 상승 펜타토닉
export function playHealingWind() {
  noiseBurst(0.7, 0.06, 0, 1800, 'highpass');
  const notes = [523, 659, 784, 988, 1047];
  notes.forEach((f, i) => tone(f, 0.28, 'sine', 0.09, i * 0.09));
}

// 4. 천리안 👁 — 신비로운 상승 아르페지오 + 고음 핑
export function playReveal() {
  const notes = [440, 554, 659, 831, 1109];
  notes.forEach((f, i) => tone(f, 0.22, 'sine', 0.08, i * 0.07));
  tone(1760, 0.5, 'sine', 0.07, 0.38);
  tone(2093, 0.3, 'sine', 0.04, 0.44);
}

// 5. 번개 폭풍 ⚡ — 빠른 전기 크래클 버스트
export function playLightning() {
  for (let i = 0; i < 6; i++) {
    noiseBurst(0.055, 0.14, i * 0.07, 3500, 'highpass');
    tone(900 + i * 180, 0.04, 'sawtooth', 0.07, i * 0.07);
  }
}

// 6. 얼음 공 ❄️ — 수정 같은 고음 + 고주파 노이즈
export function playIceBall() {
  noiseBurst(0.12, 0.07, 0, 6000, 'highpass');
  tone(1047, 0.35, 'sine', 0.11, 0);
  tone(1568, 0.28, 'sine', 0.08, 0.06);
  tone(2093, 0.22, 'sine', 0.06, 0.12);
  tone(2637, 0.18, 'sine', 0.04, 0.18);
}

// 7. 화염 공 🔥 — 휘익 + 크래클
export function playFireBall() {
  noiseBurst(0.45, 0.16, 0, 2200, 'lowpass');
  tone(320, 0.4, 'sawtooth', 0.10, 0, 140);
  tone(480, 0.25, 'sawtooth', 0.07, 0.06, 180);
  noiseBurst(0.12, 0.08, 0.3, 4000, 'highpass');
}

// 8. 치유 💚 — 부드러운 벨 화음
export function playHeal() {
  tone(523, 0.5, 'sine', 0.11, 0);
  tone(659, 0.45, 'sine', 0.09, 0.09);
  tone(784, 0.6, 'sine', 0.08, 0.18);
  tone(1047, 0.4, 'sine', 0.05, 0.28);
}

// 선언 실패 — 하강 버즈
export function playFail() {
  tone(440, 0.12, 'sawtooth', 0.13, 0, 220);
  tone(180, 0.18, 'sawtooth', 0.10, 0.10, 90);
}

// 주문 선택 UI — 짧은 틱
export function playSelect() {
  tone(660, 0.05, 'sine', 0.07);
}

export function playSpell(num: number) {
  switch (num) {
    case 1: playExplosion(); break;
    case 2: playDarkMatter(); break;
    case 3: playHealingWind(); break;
    case 4: playReveal(); break;
    case 5: playLightning(); break;
    case 6: playIceBall(); break;
    case 7: playFireBall(); break;
    case 8: playHeal(); break;
  }
}
