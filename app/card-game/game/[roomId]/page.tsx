'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, BookOpen, LogOut, Crown, Zap, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import CardItem from '@/components/card-game/game/CardItem'
import CategorySelector from '@/components/card-game/game/CategorySelector'
import GuideOverlay from '@/components/card-game/game/GuideOverlay'
import LobbyWaiting from '@/components/card-game/online/LobbyWaiting'
import BuzzInButton from '@/components/card-game/online/BuzzInButton'
import VotePanel from '@/components/card-game/online/VotePanel'
import ChatPanel from '@/components/card-game/online/ChatPanel'
import {
  subscribeRoom, startGame, updateDrawnCards, buzzIn, castVote, resolveVotes, openVoting,
  endOnlineGame, updateRoomMeta, joinRoom, adjustScore, setSearchQuery, Room, RoomMember,
} from '@/lib/card-game/firebase-game'
import { buildDecks, pickRandom6, nextItem, toDrawnCard, DeckEntry, DrawnCard } from '@/lib/card-game/game-logic'
import { useSoundEnabled } from '@/hooks/useSoundEnabled'
import { playDraw, playBuzz, playVote, playScore, playGameStart } from '@/lib/card-game/sounds'

const MAX_GENRE_CARDS = 8
const GENRE_CARD_ROTS = [-2.8, 1.6, -1.4, 2.4, -0.6, 1.8, -2.2, 2.0, -1.8, 1.2, -0.9, 2.6, -1.6]

export default function OnlineRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { uid: myUid, nickname: myName } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [myVote, setMyVote] = useState<'yes' | 'no' | null>(null)
  const [decks, setDecks] = useState<DeckEntry[]>([])
  const [catCounts, setCatCounts] = useState<Map<number, number>>(new Map())
  const [totalGenreCards, setTotalGenreCards] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const { soundEnabled, toggleSound } = useSoundEnabled()

  const prevRoundRef = useRef(-1)
  const prevCardCountRef = useRef(0)
  const cardKeysRef = useRef<number[]>([])

  useEffect(() => { setDecks(buildDecks()) }, [])

  useEffect(() => {
    if (!roomId) return
    const unsub = subscribeRoom(roomId, setRoom)
    return unsub
  }, [roomId])

  useEffect(() => {
    if (!room || !myUid || !myName) return
    if (room.meta.status === 'waiting' && !room.members?.[myUid]) {
      joinRoom(roomId, myUid, myName).catch(() => { })
    }
  }, [room, myUid, myName, roomId])

  useEffect(() => {
    if (room?.meta?.status === 'finished') {
      const memberArr = Object.values(room.members ?? {}).map(m => ({ name: m.name, score: m.score }))
      sessionStorage.setItem('results', JSON.stringify(memberArr))
      router.push('/card-game/result')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.meta?.status])

  useEffect(() => {
    if (room?.gameState?.drawnCards) setMyVote(null)
  }, [room?.gameState?.drawnCards])

  useEffect(() => {
    const buzzedAt = room?.gameState?.buzzedAt
    const buzzedBy = room?.gameState?.buzzedBy
    const timerSeconds = room?.meta?.timerSeconds ?? 0
    if (!buzzedAt || !buzzedBy || timerSeconds === 0) { setTimeLeft(null); return }
    const tick = () => {
      const remaining = Math.ceil((Number(buzzedAt) + timerSeconds * 1000 - Date.now()) / 1000)
      setTimeLeft(Math.max(0, remaining))
      return remaining <= 0
    }
    if (tick()) return
    const interval = setInterval(() => { if (tick()) clearInterval(interval) }, 500)
    return () => clearInterval(interval)
  }, [room?.gameState?.buzzedAt, room?.gameState?.buzzedBy, room?.meta?.timerSeconds])

  const isHost = room?.meta?.host === myUid
  const status = room?.meta?.status
  const gameState = room?.gameState
  const members = room?.members ?? {}
  const votes = room?.votes ?? {}
  const drawnCards: DrawnCard[] = gameState?.drawnCards ?? []
  const buzzedUid = gameState?.buzzedBy ?? null
  const buzzedName = buzzedUid ? members[buzzedUid]?.name ?? null : null
  const votingOpen = gameState?.votingOpen ?? false
  const mode = room?.meta?.mode ?? 'basic'
  const round = gameState?.round ?? 0
  const imageSearchMode = room?.meta?.imageSearch ?? false
  const searchQuery = gameState?.searchQuery ?? null

  if (round !== prevRoundRef.current) {
    prevRoundRef.current = round
    prevCardCountRef.current = drawnCards.length
    cardKeysRef.current = drawnCards.map((_, i) => Date.now() + i)
  } else if (drawnCards.length > prevCardCountRef.current) {
    const addedCount = drawnCards.length - prevCardCountRef.current
    prevCardCountRef.current = drawnCards.length
    cardKeysRef.current = [
      ...cardKeysRef.current,
      ...Array.from({ length: addedCount }, (_, i) => Date.now() + cardKeysRef.current.length + i),
    ]
  }
  const cardKeys = cardKeysRef.current

  useEffect(() => {
    if (timeLeft === 0 && isHost && buzzedUid) {
      resolveVotes(roomId, buzzedUid, votes, members as Record<string, RoomMember>).then(() => {
        if (mode === 'basic') handleDrawBasic()
        else handleGenreReset()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const handleStartGame = async () => {
    await startGame(roomId)
    setDecks(buildDecks()); setCatCounts(new Map()); setTotalGenreCards(0)
    if (soundEnabled) playGameStart()
  }

  const handleDrawBasic = async () => {
    const drawn = pickRandom6(decks, room!.meta.infiniteMode)
    await updateDrawnCards(roomId, drawn, (gameState?.round ?? 0) + 1)
    setCatCounts(new Map()); setTotalGenreCards(0)
    if (soundEnabled) playDraw()
  }

  const handleGenrePick = async (catIdx: number) => {
    if (totalGenreCards >= MAX_GENRE_CARDS) return
    const deckEntry = decks[catIdx]
    const item = nextItem(deckEntry, room!.meta.infiniteMode)
    const card = toDrawnCard(deckEntry.cat, catIdx, item)
    await updateDrawnCards(roomId, [...drawnCards, card])
    setCatCounts(prev => { const m = new Map(prev); m.set(catIdx, (m.get(catIdx) || 0) + 1); return m })
    setTotalGenreCards(totalGenreCards + 1)
    if (soundEnabled) playDraw()
  }

  const handleGenreReset = async () => {
    await updateDrawnCards(roomId, [], (gameState?.round ?? 0) + 1)
    setCatCounts(new Map()); setTotalGenreCards(0); setDecks(buildDecks())
  }

  const handleBuzzIn = async () => {
    if (!myUid || buzzedUid) return
    const ok = await buzzIn(roomId, myUid)
    if (ok) { await openVoting(roomId); if (soundEnabled) playBuzz() }
  }

  const handleBuzzInWithName = async (name: string) => {
    if (!myUid || buzzedUid) return
    const ok = await buzzIn(roomId, myUid)
    if (ok) { await setSearchQuery(roomId, name); await openVoting(roomId); if (soundEnabled) playBuzz() }
  }

  const handleVote = async (v: 'yes' | 'no') => {
    setMyVote(v)
    await castVote(roomId, myUid, v)
    if (soundEnabled) playVote()
  }

  const handleResolve = async () => {
    if (!buzzedUid) return
    await resolveVotes(roomId, buzzedUid, votes, members as Record<string, RoomMember>)
    if (soundEnabled) playScore()
    if (mode === 'basic') await handleDrawBasic()
    else await handleGenreReset()
  }

  const handleEndGame = async () => { await endOnlineGame(roomId) }

  if (!room) {
    return (
      <div className="cabinet" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="crt" />
        <p className="pix blink" style={{ fontSize: 9, color: 'var(--magenta)', letterSpacing: 1 }}>CONNECTING...</p>
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <LobbyWaiting
        roomId={roomId} meta={room.meta} members={members} myUid={myUid}
        onStart={handleStartGame}
        onModeChange={m => updateRoomMeta(roomId, { mode: m })}
        onInfiniteChange={v => updateRoomMeta(roomId, { infiniteMode: v })}
        onTimerChange={s => updateRoomMeta(roomId, { timerSeconds: s })}
        onImageSearchChange={v => updateRoomMeta(roomId, { imageSearch: v })}
      />
    )
  }

  const memberList = Object.entries(members)
  const maxScore = memberList.length > 0 ? Math.max(...memberList.map(([, m]) => m.score)) : 0
  const timerColor = timeLeft !== null && timeLeft <= 10 ? 'var(--red)' : 'var(--coin)'

  const TimerDisplay = timeLeft !== null && (
    <div style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'var(--f-disp)', fontSize: 30, color: timerColor, transition: 'color 0.3s' }}>
      ⏱ {timeLeft}
    </div>
  )

  const SidePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="arc-panel" style={{ padding: '14px' }}>
        <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 10, display: 'block' }}>SCORE</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {memberList.map(([uid, m]) => {
            const isTop = m.score > 0 && m.score === maxScore
            const isBuzzed = uid === buzzedUid
            return (
              <div
                key={uid}
                className="arc-panel-inset"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderColor: isBuzzed ? 'var(--magenta)' : 'var(--line)',
                  background: isBuzzed ? 'color-mix(in srgb, var(--magenta) 10%, transparent)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {isTop && !isBuzzed && <Crown size={11} color="var(--magenta)" style={{ flexShrink: 0 }} />}
                {isBuzzed && <Zap size={11} color="var(--magenta)" style={{ flexShrink: 0 }} />}
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 600,
                  color: uid === myUid ? 'var(--cyan)' : isBuzzed ? 'var(--magenta)' : 'var(--text)',
                }}>
                  {m.name}
                </span>
                {isHost && (
                  <button onClick={() => adjustScore(roomId, uid, -1, members as Record<string, RoomMember>)} className="score-step" style={{ background: 'var(--surface-3)', width: 22, height: 22 }}>−</button>
                )}
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: 'var(--coin)', minWidth: 32, textAlign: 'center' }}>{m.score}</span>
                {isHost && (
                  <button onClick={() => adjustScore(roomId, uid, +1, members as Record<string, RoomMember>)} className="score-step" style={{ background: 'var(--magenta)', color: '#fff', width: 22, height: 22 }}>+</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {drawnCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TimerDisplay}
          <BuzzInButton buzzedBy={buzzedUid} buzzedName={buzzedName} myUid={myUid} disabled={false} onBuzz={handleBuzzIn} imageSearchMode={imageSearchMode} onBuzzWithName={handleBuzzInWithName} />
          <VotePanel votingOpen={votingOpen} myUid={myUid} buzzedUid={buzzedUid} myVote={myVote} votes={votes} memberCount={memberList.length} onVote={handleVote} onResolve={handleResolve} isHost={isHost} />
        </div>
      )}

      {isHost && (
        <button onClick={handleEndGame} className="arc-btn-ghost" style={{ width: '100%', fontSize: 13, '--c': 'var(--red)' } as React.CSSProperties}>
          <LogOut size={13} /> 게임 종료
        </button>
      )}
    </div>
  )

  return (
    <div className="cabinet" style={{ minHeight: '100dvh' }}>
      <div className="crt" />

      <header style={{ position: 'relative', zIndex: 10, width: '100%', borderBottom: '1.5px solid var(--line)', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 16 }}>방 </span>
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: 'var(--magenta)', letterSpacing: 2 }}>{roomId}</span>
              {round > 0 && <span className="arc-badge" style={{ background: 'var(--surface-3)', color: 'var(--dim)' }}>R{round}</span>}
              <span className="arc-badge" style={{ background: 'var(--magenta)', color: '#fff' }}>{mode === 'basic' ? '기본' : '카테고리'}</span>
            </div>
            <div className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', marginTop: 3 }}>{memberList.length}명 참가 중</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="arc-btn-ghost" onClick={toggleSound} style={{ fontSize: 13, padding: '8px 12px' }} title={soundEnabled ? '소리 끄기' : '소리 켜기'}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button className="arc-btn-ghost" onClick={() => setGuideOpen(true)} style={{ fontSize: 13, padding: '8px 12px' }} title="카드 도감">
              <BookOpen size={14} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '16px 18px 80px', display: 'flex', gap: 20, minHeight: 'calc(100dvh - 57px)' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {isHost && mode === 'basic' && !votingOpen && (
            <button onClick={handleDrawBasic} className="arc-btn arc-btn--magenta" style={{ fontSize: 15, padding: '11px 0', marginBottom: 14 }}>
              <RefreshCw size={15} /> 카드 뽑기
            </button>
          )}
          {isHost && mode === 'genre' && !votingOpen && (
            <div style={{ marginBottom: 14 }}>
              <CategorySelector catCounts={catCounts} totalCards={totalGenreCards} maxCards={MAX_GENRE_CARDS} infiniteActive={room.meta.infiniteMode} onSelect={handleGenrePick} onReset={handleGenreReset} onToggleInfinite={() => updateRoomMeta(roomId, { infiniteMode: !room.meta.infiniteMode })} />
            </div>
          )}

          {searchQuery && (
            <a
              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
                padding: '12px 16px', borderRadius: 12, textDecoration: 'none',
                background: 'color-mix(in srgb, var(--violet) 12%, transparent)',
                border: '1.5px solid color-mix(in srgb, var(--violet) 40%, transparent)',
                color: 'var(--violet)', fontSize: 14, fontFamily: 'var(--f-kr)', fontWeight: 700,
              }}
            >
              🔍 {searchQuery} 구글 이미지 검색
            </a>
          )}

          {drawnCards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, justifyItems: 'center' }}>
              {drawnCards.map((card, i) => (
                <CardItem key={cardKeys[i] ?? i} card={card} index={i} rotation={mode === 'genre' ? GENRE_CARD_ROTS[i % GENRE_CARD_ROTS.length] : undefined} autoFlip />
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="pix" style={{ fontSize: 9, color: 'var(--faint)', textAlign: 'center', lineHeight: 2 }}>
                {isHost ? 'DRAW CARDS' : 'WAITING FOR HOST...'}
              </p>
            </div>
          )}

          {drawnCards.length > 0 && (
            <div className="buzz-mobile" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TimerDisplay}
              <BuzzInButton buzzedBy={buzzedUid} buzzedName={buzzedName} myUid={myUid} disabled={false} onBuzz={handleBuzzIn} imageSearchMode={imageSearchMode} onBuzzWithName={handleBuzzInWithName} />
              <VotePanel votingOpen={votingOpen} myUid={myUid} buzzedUid={buzzedUid} myVote={myVote} votes={votes} memberCount={memberList.length} onVote={handleVote} onResolve={handleResolve} isHost={isHost} />
            </div>
          )}
        </div>

        <aside className="side-panel-desktop" style={{ width: 260, flexShrink: 0 }}>{SidePanel}</aside>
      </div>

      <ChatPanel roomId={roomId} uid={myUid} myName={myName} />
      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />

      <style>{`
        @media (max-width: 767px) { .side-panel-desktop { display: none !important; } }
        @media (min-width: 768px) { .buzz-mobile { display: none !important; } }
      `}</style>
    </div>
  )
}
