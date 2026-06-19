import { AbraGameState, AbraPlayer, AbraSpell, AbraCastResult } from './types';

export const SPELLS: AbraSpell[] = [
  { num: 1, en: 'Explosion!',      kr: '폭발',       emoji: '💥', color: '#ff6f5a', targeting: 'all_dice',  effect: '주사위를 굴립니다. 다른 모든 플레이어가 그 숫자만큼 생명력을 잃습니다.' },
  { num: 2, en: 'Dark Matter',     kr: '암흑 물질',   emoji: '🌑', color: '#b07cff', targeting: 'all',       effect: '다른 모든 플레이어는 생명력을 1 잃고, 당신은 생명력을 1 얻습니다.' },
  { num: 3, en: 'Healing Wind',    kr: '치유의 바람', emoji: '🌿', color: '#7ed957', targeting: 'self_dice', effect: '주사위를 굴립니다. 당신은 그 숫자만큼 생명력을 얻습니다. (최대 3)' },
  { num: 4, en: 'I Can See...',    kr: '천리안',      emoji: '👁',  color: '#36e0cf', targeting: 'reveal',    effect: '비밀의 돌 1개를 가져와 이번 라운드 동안 볼 수 있습니다.' },
  { num: 5, en: 'Lightning Storm', kr: '번개 폭풍',   emoji: '⚡',  color: '#ffb72b', targeting: 'neighbors', effect: '당신의 왼쪽과 오른쪽 플레이어는 생명력을 1 잃습니다.' },
  { num: 6, en: 'Ice Ball',        kr: '얼음 공',     emoji: '❄️', color: '#5ab0e8', targeting: 'left',      effect: '당신의 왼쪽 플레이어는 생명력을 1 잃습니다.' },
  { num: 7, en: 'Fire Ball',       kr: '화염 공',     emoji: '🔥', color: '#ff5da2', targeting: 'right',     effect: '당신의 오른쪽 플레이어는 생명력을 1 잃습니다.' },
  { num: 8, en: 'Heal',            kr: '치유',        emoji: '💚', color: '#a274ff', targeting: 'self',      effect: '당신은 생명력을 1 얻습니다.' },
];

export const PLAYER_DOTS = ['#a274ff', '#ff5a4d', '#36e0cf', '#5ab0e8', '#ffb72b', '#7ed957'];

export function spellOf(num: number): AbraSpell {
  return SPELLS[num - 1];
}

// ─── Internals ──────────────────────────────────────────────

function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPool(): number[] {
  const tiles: number[] = [];
  for (let n = 1; n <= 8; n++) for (let i = 0; i < n; i++) tiles.push(n);
  return tiles; // 36 tiles
}

function abraConfig(n: number) {
  const big = n >= 6;
  return { maxHp: big ? 8 : 6, secret: big ? 6 : 4 };
}

function addLog(G: AbraGameState, who: number, txt: string) {
  G.log.unshift({ who, name: G.players[who].name, txt });
  if (G.log.length > 10) G.log.pop();
}

function damage(G: AbraGameState, idx: number, amt: number) {
  if (G.players[idx].eliminated) return;
  G.players[idx].hp = Math.max(0, G.players[idx].hp - amt);
  if (G.players[idx].hp <= 0) {
    G.players[idx].eliminated = true;
    addLog(G, idx, '💀 탈락!');
  }
}

function heal(G: AbraGameState, idx: number, amt: number): number {
  if (G.players[idx].eliminated) return 0;
  const prev = G.players[idx].hp;
  G.players[idx].hp = Math.min(G.maxHp, G.players[idx].hp + amt);
  return G.players[idx].hp - prev;
}

// ─── Public API ─────────────────────────────────────────────

export function createGame(
  players: { name: string; clientId: string }[],
  maxRounds: number,
): AbraGameState {
  const n = players.length;
  const G: AbraGameState = {
    players: players.map((p, i) => ({
      name: p.name,
      clientId: p.clientId,
      hp: 0,
      tiles: [],
      secretRevealed: [],
      usedICansee: false,
      eliminated: false,
      dot: PLAYER_DOTS[i % PLAYER_DOTS.length],
    })),
    deck: [],
    secretPile: [],
    maxHp: 6,
    combo: null,
    currentIdx: 0,
    turn: 0,
    round: 1,
    maxRounds,
    scores: Array(n).fill(0),
    log: [],
    pendingCast: null,
    phase: 'game',
    roundScores: null,
    castCounts: Array(8).fill(0),
  };
  initRound(G);
  return G;
}

export function initRound(G: AbraGameState) {
  const { maxHp, secret } = abraConfig(G.players.length);
  G.maxHp = maxHp;
  let pool = shuffle(createPool());
  G.secretPile = pool.splice(0, secret);
  G.players.forEach(p => {
    p.hp = maxHp;
    p.tiles = pool.splice(0, 5);
    p.secretRevealed = [];
    p.usedICansee = false;
    p.eliminated = false;
  });
  G.deck = pool;
  G.combo = null;
  G.currentIdx = 0;
  G.log = [];
  G.turn = 0;
  G.pendingCast = null;
  G.phase = 'game';
  G.roundScores = null;
  G.castCounts = Array(8).fill(0);
}

export function canDeclare(G: AbraGameState, playerIdx: number, num: number): boolean {
  if (G.players[playerIdx].eliminated) return false;
  if (G.combo !== null && num > G.combo) return false;
  return true;
}

export function resolveDeclaration(
  G: AbraGameState,
  playerIdx: number,
  num: number,
): { success: boolean } {
  const p = G.players[playerIdx];
  const inTiles = p.tiles.includes(num);
  const inSecret = p.secretRevealed.includes(num);
  const success = inTiles || inSecret;
  G.turn++;
  if (success) {
    if (inTiles) {
      p.tiles.splice(p.tiles.indexOf(num), 1);
    } else {
      p.secretRevealed.splice(p.secretRevealed.indexOf(num), 1);
    }
    G.combo = num;
    G.castCounts[num - 1]++;
    addLog(G, playerIdx, `${num} 선언 → ✓ 성공! ${spellOf(num).kr}`);
  } else {
    damage(G, playerIdx, 1);
    addLog(G, playerIdx, `${num} 선언 → ✗ 실패… 체력 -1`);
  }
  return { success };
}

export function applyEffect(
  G: AbraGameState,
  spellNum: number,
  casterIdx: number,
): Omit<AbraCastResult, 'spellNum' | 'success'> {
  const sp = spellOf(spellNum);
  const n = G.players.length;
  const living = (i: number) => !G.players[i].eliminated;
  const leftOf  = (i: number) => { for (let d = 1; d < n; d++) { const j = (i - d + n) % n; if (living(j)) return j; } return -1; };
  const rightOf = (i: number) => { for (let d = 1; d < n; d++) { const j = (i + d) % n; if (living(j)) return j; } return -1; };

  const lines: string[] = [];
  let diceRoll: number | null = null;
  let revealedTile: number | null = null;

  switch (sp.targeting) {
    case 'all_dice': {
      const roll = rollD6(); diceRoll = roll;
      for (let i = 0; i < n; i++) {
        if (i !== casterIdx && living(i)) { damage(G, i, roll); lines.push(`${G.players[i].name} -${roll} HP`); }
      }
      break;
    }
    case 'all': {
      for (let i = 0; i < n; i++) {
        if (i !== casterIdx && living(i)) { damage(G, i, 1); lines.push(`${G.players[i].name} -1 HP`); }
      }
      const gained = heal(G, casterIdx, 1);
      if (gained > 0) lines.push(`${G.players[casterIdx].name} +${gained} HP`);
      break;
    }
    case 'self_dice': {
      const roll = rollD6(); diceRoll = roll;
      const healAmt = Math.min(roll, 3);
      const gained = heal(G, casterIdx, healAmt);
      lines.push(`🎲 ${roll} → ${G.players[casterIdx].name} +${gained} HP`);
      break;
    }
    case 'self': {
      const gained = heal(G, casterIdx, 1);
      lines.push(`${G.players[casterIdx].name} +${gained} HP`);
      break;
    }
    case 'reveal': {
      if (G.secretPile.length > 0) {
        const tile = G.secretPile.pop()!;
        G.players[casterIdx].secretRevealed.push(tile);
        G.players[casterIdx].usedICansee = true;
        revealedTile = tile;
        lines.push(`비밀의 돌 ${tile} 획득!`);
      } else {
        lines.push('비밀의 돌이 남아있지 않습니다.');
      }
      break;
    }
    case 'neighbors': {
      const l = leftOf(casterIdx), r = rightOf(casterIdx);
      if (l !== -1) { damage(G, l, 1); lines.push(`${G.players[l].name} -1 HP`); }
      if (r !== -1 && r !== l) { damage(G, r, 1); lines.push(`${G.players[r].name} -1 HP`); }
      break;
    }
    case 'left': {
      const l = leftOf(casterIdx);
      if (l !== -1) { damage(G, l, 1); lines.push(`${G.players[l].name} -1 HP`); }
      break;
    }
    case 'right': {
      const r = rightOf(casterIdx);
      if (r !== -1) { damage(G, r, 1); lines.push(`${G.players[r].name} -1 HP`); }
      break;
    }
  }
  addLog(G, casterIdx, `${sp.kr}: ${lines.join(', ')}`);
  return { lines, diceRoll, revealedTile };
}

export function drawTiles(G: AbraGameState, idx: number) {
  const p = G.players[idx];
  const need = 5 - p.tiles.length;
  if (need > 0 && G.deck.length > 0) {
    const drawn = G.deck.splice(0, Math.min(need, G.deck.length));
    p.tiles.push(...drawn);
  }
}

export function endTurn(G: AbraGameState) {
  drawTiles(G, G.currentIdx);
  G.combo = null;
  const n = G.players.length;
  for (let d = 1; d <= n; d++) {
    const next = (G.currentIdx + d) % n;
    if (!G.players[next].eliminated) { G.currentIdx = next; break; }
  }
}

export function checkRoundEnd(G: AbraGameState): boolean {
  const living = G.players.filter(p => !p.eliminated);
  if (living.length <= 1) return true;
  if (living.some(p => p.tiles.length === 0 && p.secretRevealed.length === 0)) return true;
  return false;
}

export function scoreRound(G: AbraGameState): number[] {
  const n = G.players.length;
  const round = Array(n).fill(0);
  G.players.forEach((p, i) => { if (!p.eliminated) round[i] += 1; });
  G.players.forEach((p, i) => { if (!p.eliminated && p.tiles.length === 0 && p.secretRevealed.length === 0) round[i] += 3; });
  G.players.forEach((p, i) => { if (p.usedICansee) round[i] += 1; });
  round.forEach((v, i) => { G.scores[i] = (G.scores[i] || 0) + v; });
  G.roundScores = round;
  G.phase = 'round-end';
  return round;
}

export function goalReached(G: AbraGameState): boolean {
  return G.round >= G.maxRounds;
}
