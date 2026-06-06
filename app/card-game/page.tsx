'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Infinity as InfinityIcon, HelpCircle, BookOpen } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useAuth } from '@/context/AuthContext'
import { createRoom, joinRoom } from '@/lib/card-game/firebase-game'
import GuideOverlay from '@/components/card-game/game/GuideOverlay'

const DOT_COLORS = [
  'bg-amber-400', 'bg-pink-500', 'bg-sky-400',
  'bg-green-400', 'bg-orange-400', 'bg-purple-400',
]

type GameMode = 'basic' | 'genre'
type PlayMode = 'local' | 'online'

interface SetupMember { name: string }

export default function CardGameSetupPage() {
  const router = useRouter()
  const { nickname, uid } = useAuth()
  const [members, setMembers] = useState<SetupMember[]>([])
  const [input, setInput] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('basic')
  const [playMode, setPlayMode] = useState<PlayMode>('local')
  const [infinite, setInfinite] = useState(true)
  const [roomInput, setRoomInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addMember = () => {
    const name = input.trim()
    if (!name) return
    setMembers(prev => [...prev, { name }])
    setInput('')
    inputRef.current?.focus()
  }

  const removeMember = (i: number) => setMembers(prev => prev.filter((_, idx) => idx !== i))
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') addMember() }

  const startLocal = () => {
    if (members.length === 0) return
    sessionStorage.setItem('players', JSON.stringify(members.map(m => m.name)))
    sessionStorage.setItem('infinite', String(infinite))
    sessionStorage.setItem('gameMode', gameMode)
    router.push('/card-game/game/local')
  }

  const createOnlineRoom = async () => {
    setLoading(true); setError('')
    try {
      const roomId = nanoid(6).toUpperCase()
      await createRoom(roomId, uid, nickname, gameMode, infinite)
      sessionStorage.setItem('gameMode', gameMode)
      router.push(`/card-game/game/${roomId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 생성 실패')
    } finally { setLoading(false) }
  }

  const joinOnlineRoom = async () => {
    const roomId = roomInput.trim().toUpperCase()
    if (!roomId) { setError('방 코드를 입력해주세요'); return }
    setLoading(true); setError('')
    try {
      await joinRoom(roomId, uid, nickname)
      router.push(`/card-game/game/${roomId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '방 참여 실패')
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcea] text-amber-900 px-4 py-10">
      <button
        onClick={() => router.push('/lobby')}
        className="fixed top-4 left-4 z-50 text-sm text-amber-700/50 hover:text-amber-800 border border-amber-300/40 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-all"
      >
        ← 로비
      </button>
      <button
        onClick={() => setGuideOpen(true)}
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600/50 hover:text-amber-700 hover:border-amber-400/50 transition-all"
        title="카드 도감"
      >
        <BookOpen size={15} />
      </button>

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-7xl mb-3">🎴</div>
        <h1
          className="text-5xl font-black tracking-widest text-amber-700 mb-2"
          style={{ fontFamily: 'var(--font-jua), sans-serif' }}
        >
          캐릭터 카드
        </h1>
        <p className="text-amber-700/50 text-sm tracking-widest uppercase">Character Card Game</p>
      </div>

      {/* Play mode tabs */}
      <div className="flex rounded-2xl bg-amber-50/80 border border-amber-200/60 p-1 mb-6 w-full max-w-lg">
        <button
          onClick={() => { setPlayMode('local'); setError('') }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${playMode === 'local' ? 'bg-white text-amber-900 shadow' : 'text-amber-600/60 hover:text-amber-800'}`}
        >
          🖥️ 로컬 플레이
        </button>
        <button
          onClick={() => { setPlayMode('online'); setError('') }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${playMode === 'online' ? 'bg-white text-amber-900 shadow' : 'text-amber-600/60 hover:text-amber-800'}`}
        >
          🌐 온라인 플레이
        </button>
      </div>

      {/* Settings card */}
      <div className="w-full max-w-lg bg-white/70 border border-amber-200/60 rounded-3xl p-8 backdrop-blur-sm shadow-xl shadow-amber-900/5 space-y-6">

        {/* Game Mode */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-amber-700/70 text-xs font-bold tracking-widest uppercase">게임 모드</h2>
            <button onClick={() => setShowGuide(true)} className="text-amber-600/30 hover:text-amber-600/60 transition-colors">
              <HelpCircle size={13} />
            </button>
          </div>
          <div className="flex rounded-xl bg-amber-50/80 p-1 gap-1 mb-3">
            {(['basic', 'genre'] as GameMode[]).map(gm => (
              <button
                key={gm}
                onClick={() => setGameMode(gm)}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${gameMode === gm ? 'bg-amber-400 text-black shadow' : 'text-amber-700/50 hover:text-amber-900'}`}
              >
                {gm === 'basic' ? '기본 (6장 자동)' : '카테고리 선택'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setInfinite(v => !v)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${infinite ? 'border-sky-500 text-sky-600 bg-sky-50' : 'border-amber-300/50 text-amber-600/50 hover:text-amber-700'}`}
          >
            <InfinityIcon size={12} /> 무한 모드 {infinite ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Local: Player setup */}
        {playMode === 'local' && (
          <div>
            <h2 className="text-amber-700/70 text-xs font-bold tracking-widest uppercase mb-3">플레이어 추가</h2>
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="이름 입력 후 Enter"
                className="flex-1 bg-white border border-amber-300/60 rounded-xl px-4 py-2.5 text-amber-950 text-sm outline-none focus:border-amber-500 transition-colors placeholder:text-amber-400/40"
              />
              <button
                onClick={addMember}
                className="bg-amber-100 border border-amber-400/60 text-amber-600 rounded-xl px-4 py-2.5 hover:bg-amber-200 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[i % 6]}`} />
                    <span className="text-amber-900/80 text-sm">{m.name}</span>
                    <button onClick={() => removeMember(i)} className="text-amber-500/40 hover:text-amber-600 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Online: Nickname + Room code */}
        {playMode === 'online' && (
          <>
            <div>
              <h2 className="text-amber-700/70 text-xs font-bold tracking-widest uppercase mb-2">내 닉네임</h2>
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                {nickname}
              </div>
            </div>
            <div>
              <h2 className="text-amber-700/70 text-xs font-bold tracking-widest uppercase mb-2">방 코드 (참여 시 입력)</h2>
              <input
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full bg-white border border-amber-300/60 rounded-xl px-4 py-3 text-amber-950 text-lg font-black tracking-[0.3em] text-center outline-none focus:border-amber-500 transition-colors placeholder:text-amber-400/30"
              />
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* CTA */}
        {playMode === 'local' ? (
          <button
            onClick={startLocal}
            disabled={members.length === 0}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            게임 시작 🎴
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={createOnlineRoom}
              disabled={loading}
              className="flex-1 py-4 rounded-2xl font-black text-base tracking-wider uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? '처리 중...' : '방 만들기'}
            </button>
            {roomInput.length === 6 && (
              <button
                onClick={joinOnlineRoom}
                disabled={loading}
                className="flex-1 py-4 rounded-2xl font-black text-base tracking-wider uppercase bg-sky-100 border border-sky-500/60 text-sky-700 hover:bg-sky-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? '처리 중...' : '참여하기'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 max-w-lg text-center text-amber-700/30 text-xs leading-relaxed">
        <p>🃏 카드를 뽑아 나만의 캐릭터를 만들어봐요</p>
        <p className="mt-1">카테고리별 특성을 조합해 이야기를 만들어봐요!</p>
      </div>

      {/* Guide modal */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-[#fffdf5] border border-amber-200 rounded-2xl p-6 max-w-sm w-[90%] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-amber-700 text-base font-black mb-4">게임 모드 안내</h3>
            <div className="space-y-3">
              <GuideItem
                title="기본 모드"
                desc="버튼을 누르면 6장의 카드가 무작위로 뽑혀요. 카테고리 균형이 자동으로 맞춰집니다."
              />
              <GuideItem
                title="카테고리 선택 모드"
                desc="원하는 카테고리 버튼을 직접 눌러 카드를 뽑아요. 최대 8장까지 뽑을 수 있어요."
              />
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2.5 rounded-xl border border-amber-200 text-amber-700/50 hover:text-amber-800 hover:border-amber-400 transition-all text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
    </main>
  )
}

function GuideItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
      <div className="text-amber-900 font-semibold text-sm mb-1">{title}</div>
      <div className="text-amber-700/50 text-xs leading-relaxed">{desc}</div>
    </div>
  )
}
