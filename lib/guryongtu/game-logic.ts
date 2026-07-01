import { GameState, PlayerState, RoundResult, TileValue } from './types';

const ALL_TILES: TileValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 1은 9를 이긴다. 나머지는 숫자 크기 비교.
function compare(p0: TileValue, p1: TileValue): 'p0' | 'p1' | 'draw' {
  if (p0 === p1) return 'draw';
  if (p0 === 1 && p1 === 9) return 'p0';
  if (p1 === 1 && p0 === 9) return 'p1';
  return p0 > p1 ? 'p0' : 'p1';
}

function makePlayer(id: string, name: string): PlayerState {
  return {
    id, name,
    remainingTiles: [...ALL_TILES],
    selectedTile: null,
    roundWins: 0,
    gameWins: 0,
  };
}

export function createGame(
  p0Id: string, p0Name: string,
  p1Id: string, p1Name: string,
): GameState {
  return {
    players: [makePlayer(p0Id, p0Name), makePlayer(p1Id, p1Name)],
    currentRound: 1,
    phase: 'selecting',
    roundResults: [],
    currentGameNumber: 1,
    matchWinnerId: null,
  };
}

// 공개 후 라운드 결산 → 다음 라운드 or 게임 종료
export function resolveRound(state: GameState): GameState {
  if (state.phase !== 'revealing') return state;

  const p0Tile = state.players[0].selectedTile!;
  const p1Tile = state.players[1].selectedTile!;
  const outcome = compare(p0Tile, p1Tile);

  const players = state.players.map((p, i) => ({
    ...p,
    remainingTiles: p.remainingTiles.filter(t => t !== p.selectedTile),
    selectedTile: null,
    roundWins: p.roundWins + (
      (outcome === 'p0' && i === 0) || (outcome === 'p1' && i === 1) ? 1 : 0
    ),
  })) as [PlayerState, PlayerState];

  const roundResult: RoundResult = { round: state.currentRound, p0Tile, p1Tile, outcome };
  const roundResults = [...state.roundResults, roundResult];

  const p0Wins = players[0].roundWins;
  const p1Wins = players[1].roundWins;
  const gameEnds = p0Wins >= 5 || p1Wins >= 5 || state.currentRound >= 9;

  if (gameEnds) {
    let gameWinnerIdx: number | null = null;
    if (p0Wins > p1Wins) gameWinnerIdx = 0;
    else if (p1Wins > p0Wins) gameWinnerIdx = 1;

    const updatedPlayers = players.map((p, i) => ({
      ...p,
      gameWins: p.gameWins + (i === gameWinnerIdx ? 1 : 0),
    })) as [PlayerState, PlayerState];

    const gw0 = updatedPlayers[0].gameWins;
    const gw1 = updatedPlayers[1].gameWins;
    const matchWinner = gw0 >= 2 ? updatedPlayers[0].id : gw1 >= 2 ? updatedPlayers[1].id : null;

    if (matchWinner) {
      return {
        ...state,
        players: updatedPlayers,
        roundResults,
        phase: 'match-over',
        matchWinnerId: matchWinner,
      };
    }

    // 다음 게임 (타일 리셋)
    const resetPlayers = updatedPlayers.map(p => ({
      ...p,
      remainingTiles: [...ALL_TILES],
      selectedTile: null,
      roundWins: 0,
    })) as [PlayerState, PlayerState];

    return {
      ...state,
      players: resetPlayers,
      currentRound: 1,
      phase: 'selecting',
      roundResults: [],
      currentGameNumber: state.currentGameNumber + 1,
      matchWinnerId: null,
    };
  }

  return {
    ...state,
    players,
    currentRound: state.currentRound + 1,
    phase: 'selecting',
    roundResults,
  };
}
