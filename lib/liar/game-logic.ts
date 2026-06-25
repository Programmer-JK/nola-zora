import { WORD_CATEGORIES, pickRandom, pickCategoryAndTwoWords } from './game-data';
import { LocalLiarState, LocalLiarMode, OnlineLiarGameState, OnlineLiarPlayer, OnlineLiarMode } from './types';

export function maxLiarCount(playerCount: number): number {
  return Math.floor((playerCount - 1) / 2); // 항상 시민 > 라이어 유지
}

function pickLiarIdxs(playerCount: number, liarCount: number): number[] {
  const indices = Array.from({ length: playerCount }, (_, i) => i);
  // Fisher-Yates shuffle, take first liarCount
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, liarCount).sort((a, b) => a - b);
}

function pickFromCategory(category: string, mode: LocalLiarMode | OnlineLiarMode, playerCount: number, liarCount: number) {
  const cat = WORD_CATEGORIES.find(c => c.category === category);
  const words = cat?.words ?? [];
  const liarIdxs = pickLiarIdxs(playerCount, liarCount);

  if (mode === 'fake') {
    const { word, liarWord } = (() => {
      if (words.length < 2) {
        const r = pickCategoryAndTwoWords([category]);
        return { word: r.word, liarWord: r.liarWord };
      }
      const wordIdx = Math.floor(Math.random() * words.length);
      let altIdx = Math.floor(Math.random() * (words.length - 1));
      if (altIdx >= wordIdx) altIdx++;
      return { word: words[wordIdx], liarWord: words[altIdx] };
    })();
    return { category, word, liarWord, liarIdxs };
  } else {
    const word = words.length ? pickRandom(words) : '???';
    return { category, word, liarWord: '', liarIdxs };
  }
}

// ─── 로컬 ────────────────────────────────────────────────────

export function createLocalGame(playerCount: number, liarCount: number, mode: LocalLiarMode): LocalLiarState {
  return {
    playerCount,
    liarCount,
    mode,
    category: '',
    word: '',
    liarWord: '',
    liarIdxs: [],
    phase: 'category-select',
    revealPlayerIdx: 0,
    roleShowing: false,
    liarGuess: null,
    liarGuessCorrect: null,
  };
}

export function selectLocalCategory(state: LocalLiarState, category: string): LocalLiarState {
  return {
    ...state,
    ...pickFromCategory(category, state.mode, state.playerCount, state.liarCount),
    phase: 'role-reveal',
    revealPlayerIdx: 0,
    roleShowing: false,
    liarGuess: null,
    liarGuessCorrect: null,
  };
}

export function restartLocalGame(state: LocalLiarState): LocalLiarState {
  return {
    ...state,
    category: '',
    word: '',
    liarWord: '',
    liarIdxs: [],
    phase: 'category-select',
    revealPlayerIdx: 0,
    roleShowing: false,
    liarGuess: null,
    liarGuessCorrect: null,
  };
}

// ─── 온라인 ──────────────────────────────────────────────────

export function createOnlineGame(players: OnlineLiarPlayer[], liarCount: number, mode: OnlineLiarMode): OnlineLiarGameState {
  return {
    players,
    phase: 'category-select',
    mode,
    liarCount,
    category: '',
    word: '',
    liarWord: '',
    liarIdxs: [],
    liarGuess: null,
    liarGuessCorrect: null,
    votes: {},
  };
}

export function selectOnlineCategory(state: OnlineLiarGameState, category: string): OnlineLiarGameState {
  return {
    ...state,
    ...pickFromCategory(category, state.mode, state.players.length, state.liarCount),
    phase: 'waiting',
  };
}

export function restartOnlineGame(state: OnlineLiarGameState): OnlineLiarGameState {
  return {
    ...state,
    category: '',
    word: '',
    liarWord: '',
    liarIdxs: [],
    phase: 'category-select',
    liarGuess: null,
    liarGuessCorrect: null,
    votes: {},
  };
}
