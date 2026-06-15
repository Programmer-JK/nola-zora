// ============================================================
// 놀아조라 ARCADE — Card Game Sound Effects (Web Audio API)
// ============================================================

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

type OscType = OscillatorType

function tone(freq: number, dur: number, type: OscType = 'square', vol = 0.12, startDelay = 0) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay)
    gain.gain.setValueAtTime(0, c.currentTime + startDelay)
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + startDelay + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + dur)
    osc.start(c.currentTime + startDelay)
    osc.stop(c.currentTime + startDelay + dur + 0.01)
  } catch { /* 브라우저 정책으로 재생 불가 시 무시 */ }
}

/** 카드 뽑기 — 상승 아르페지오 */
export function playDraw() {
  tone(220, 0.07, 'square', 0.10, 0)
  tone(330, 0.07, 'square', 0.10, 0.07)
  tone(440, 0.10, 'square', 0.09, 0.14)
}

/** 카드 뒤집기 — 짧은 클릭 */
export function playFlip() {
  tone(700, 0.04, 'sine', 0.07)
}

/** 버즈인 — 전기 충격음 */
export function playBuzz() {
  tone(880, 0.05, 'sawtooth', 0.14, 0)
  tone(660, 0.08, 'sawtooth', 0.10, 0.05)
  tone(440, 0.06, 'square', 0.07, 0.13)
}

/** 투표 — 부드러운 확인음 */
export function playVote() {
  tone(523, 0.06, 'sine', 0.07)
}

/** 점수 증가 — 긍정적 3음 */
export function playScore() {
  tone(523, 0.06, 'square', 0.11, 0)
  tone(659, 0.06, 'square', 0.11, 0.07)
  tone(784, 0.12, 'square', 0.10, 0.14)
}

/** 게임 시작 — 4음 팡파르 */
export function playGameStart() {
  const notes = [261, 329, 392, 523]
  notes.forEach((freq, i) => tone(freq, 0.12, 'square', 0.11, i * 0.1))
}

/** UI 클릭 — 아주 짧은 틱 */
export function playTick() {
  tone(440, 0.03, 'square', 0.06)
}
