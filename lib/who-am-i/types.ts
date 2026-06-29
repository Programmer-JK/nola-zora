export type GameStatus = 'waiting' | 'playing' | 'result' | 'finished'

export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'lime'] as const
export type PlayerColor = typeof PLAYER_COLORS[number]

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#e84242',
  blue: '#4488ff',
  green: '#7ed957',
  yellow: '#ffb72b',
  purple: '#a274ff',
  pink: '#ff5da2',
  cyan: '#36e0cf',
  lime: '#a3e635',
}

export interface WhoAmIPlayerData {
  name: string
  color: PlayerColor
  assignedWord: string  // 빈 문자열 = 아직 미선정
  solved: boolean
  wrongAttempts: number
  nextAttemptAt: number  // ms timestamp, 0 = 쿨다운 없음
  joinedAt: number
}

export interface WhoAmIPlayer extends WhoAmIPlayerData {
  clientId: string
}

export interface RawChatMessage {
  clientId: string
  name: string
  color: PlayerColor
  text: string
  timestamp: number
  type: 'chat' | 'system' | 'correct' | 'wrong'
}

export interface ChatMessage extends RawChatMessage {
  id: string
}

export interface WhoAmIRoom {
  status: GameStatus
  hostClientId: string
  players: Record<string, WhoAmIPlayerData>
  messages?: Record<string, RawChatMessage>
  createdAt: number
}
