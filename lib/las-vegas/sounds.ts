export function playDiceRoll() {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/roll-dice.mp3');
    audio.volume = 1.0;
    audio.play().catch(() => { });
  } catch {
    // Silently ignore if Audio is not available
  }
}
