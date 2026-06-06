'use client'

import { Crown, Copy, Check, Infinity as InfinityIcon, Link } from 'lucide-react'
import { useState } from 'react'
import { RoomMeta, RoomMember } from '@/lib/card-game/firebase-game'

interface Props {
  roomId: string
  meta: RoomMeta
  members: Record<string, RoomMember>
  myUid: string
  onStart: () => void
  onModeChange: (mode: 'basic' | 'genre') => void
  onInfiniteChange: (v: boolean) => void
  onTimerChange: (seconds: number) => void
}

const TIMER_OPTIONS = [
  { label: '없음', value: 0 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '90초', value: 90 },
]

export default function LobbyWaiting({ roomId, meta, members, myUid, onStart, onModeChange, onInfiniteChange, onTimerChange }: Props) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const isHost = meta.host === myUid
  const memberList = Object.entries(members)

  const copyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/card-game/game/${roomId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1a0f] via-[#17130c] to-[#100e09] px-4 py-10">

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🎴</div>
        <h1
          className="text-4xl font-black tracking-widest text-amber-400 mb-1"
          style={{ fontFamily: 'var(--font-jua), sans-serif' }}
        >
          대기실
        </h1>
        <p className="text-amber-300/50 text-xs tracking-widest uppercase">Waiting for players...</p>
      </div>

      {/* Room code + share */}
      <div className="text-center mb-6">
        <p className="text-white/40 text-xs tracking-widest uppercase mb-2">방 코드</p>
        <div className="flex items-center gap-3 justify-center mb-2">
          <span
            className="text-4xl font-black tracking-[0.3em] text-amber-400"
            style={{ fontFamily: 'var(--font-jua), sans-serif' }}
          >
            {roomId}
          </span>
          <button
            onClick={copyCode}
            title="코드 복사"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 mx-auto text-xs text-white/40 hover:text-amber-400/80 transition-colors"
        >
          <Link size={11} />
          {linkCopied ? '링크 복사됨!' : '입장 링크 복사'}
        </button>
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* 참가자 목록 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <h2 className="text-amber-300 text-xs font-bold tracking-widest uppercase mb-3">
            참가자 ({memberList.length}명)
          </h2>
          <div className="space-y-2">
            {memberList.map(([uid, m]) => (
              <div
                key={uid}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${uid === myUid ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-white/5'}`}
              >
                {uid === meta.host
                  ? <Crown size={14} className="text-amber-400 flex-shrink-0" />
                  : <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex-shrink-0" />
                }
                <span className={`flex-1 text-sm font-medium ${uid === myUid ? 'text-amber-300' : 'text-white/80'}`}>
                  {m.name}
                </span>
                {uid === myUid && <span className="text-white/30 text-xs">나</span>}
                {uid === meta.host && uid !== myUid && <span className="text-amber-400/50 text-xs">호스트</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 호스트 게임 설정 */}
        {isHost && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm space-y-4">
            <h2 className="text-amber-300 text-xs font-bold tracking-widest uppercase">게임 설정</h2>

            {/* 모드 */}
            <div>
              <p className="text-white/40 text-xs mb-2">카드 모드</p>
              <div className="flex rounded-xl bg-white/5 p-1 gap-1">
                {(['basic', 'genre'] as const).map(gm => (
                  <button
                    key={gm}
                    onClick={() => onModeChange(gm)}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${meta.mode === gm ? 'bg-amber-400 text-black shadow' : 'text-white/50 hover:text-white'}`}
                  >
                    {gm === 'basic' ? '기본 (6장 자동)' : '카테고리 선택'}
                  </button>
                ))}
              </div>
            </div>

            {/* 무한 모드 */}
            <div>
              <p className="text-white/40 text-xs mb-2">카드 중복</p>
              <button
                onClick={() => onInfiniteChange(!meta.infiniteMode)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${meta.infiniteMode ? 'border-sky-400 text-sky-400 bg-sky-400/10' : 'border-white/20 text-white/40 hover:text-white/60'}`}
              >
                <InfinityIcon size={12} /> 무한 모드 {meta.infiniteMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 타이머 */}
            <div>
              <p className="text-white/40 text-xs mb-2">설명 타이머</p>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onTimerChange(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${meta.timerSeconds === opt.value ? 'bg-amber-400 text-black border-amber-400' : 'border-white/20 text-white/50 hover:text-white hover:border-white/40'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 비호스트 설정 표시 */}
        {!isHost && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
              <span className="text-white/70 font-medium">{meta.mode === 'basic' ? '기본 (6장 자동)' : '카테고리 선택'}</span>
              {meta.infiniteMode && <span className="text-sky-400 text-xs border border-sky-400/30 rounded-full px-2 py-0.5">∞ 무한</span>}
              {meta.timerSeconds > 0 && <span className="text-amber-400/70 text-xs border border-amber-400/20 rounded-full px-2 py-0.5">⏱ {meta.timerSeconds}초</span>}
            </div>
          </div>
        )}

        {/* 시작 버튼 */}
        {isHost ? (
          <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
            style={{ fontFamily: 'var(--font-jua), sans-serif' }}
          >
            게임 시작 🎴
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl text-center text-sm text-white/40 border border-white/10 bg-white/5">
            호스트가 게임을 시작할 때까지 기다려요...
          </div>
        )}
      </div>
    </main>
  )
}
