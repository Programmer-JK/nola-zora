'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, BookOpen, LogOut, Crown, Zap, Search } from 'lucide-react'
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
  endOnlineGame, updateRoomMeta, joinRoom, adjustScore, setSearchData, Room, RoomMember,
} from '@/lib/card-game/firebase-game'
import { buildDecks, pickRandom6, nextItem, toDrawnCard, DeckEntry, DrawnCard } from '@/lib/card-game/game-logic'

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
  const [reSearchInput, setReSearchInput] = useState('')

  // 카드 키: round가 바뀌거나 카드 수가 늘어날 때만 갱신 (Firebase 이벤트마다 재애니메이션 방지)
  const prevRoundRef = useRef(-1)
  const prevCardCountRef = useRef(0)
  const cardKeysRef = useRef<number[]>([])

  useEffect(() => { setDecks(buildDecks()) }, [])

  // 방 구독
  useEffect(() => {
    if (!roomId) return
    const unsub = subscribeRoom(roomId, setRoom)
    return unsub
  }, [roomId])

  // 링크로 직접 입장한 경우 자동 참여
  useEffect(() => {
    if (!room || !myUid || !myName) return
    if (room.meta.status === 'waiting' && !room.members?.[myUid]) {
      joinRoom(roomId, myUid, myName).catch(() => {})
    }
  }, [room, myUid, myName, roomId])

  // 게임 종료 시 전원 결과 페이지로 이동
  useEffect(() => {
    if (room?.meta?.status === 'finished') {
      const memberArr = Object.values(room.members ?? {}).map(m => ({ name: m.name, score: m.score }))
      sessionStorage.setItem('results', JSON.stringify(memberArr))
      router.push('/card-game/result')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.meta?.status])

  // 새 카드 뽑힐 때 투표 초기화
  useEffect(() => {
    if (room?.gameState?.drawnCards) setMyVote(null)
  }, [room?.gameState?.drawnCards])

  // 버즈인 타이머 카운트다운
  useEffect(() => {
    const buzzedAt = room?.gameState?.buzzedAt
    const buzzedBy = room?.gameState?.buzzedBy
    const timerSeconds = room?.meta?.timerSeconds ?? 0
    if (!buzzedAt || !buzzedBy || timerSeconds === 0) {
      setTimeLeft(null)
      return
    }
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
  const searchImages = gameState?.searchImages ?? null

  // 카드 키 동기적 계산: round 바뀌면 전체 갱신, 카드 수 늘면 새 카드만 추가
  // (Firebase 이벤트마다 ref가 달라져도 round/count가 같으면 재애니메이션 하지 않음)
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

  // 타이머 만료 시 호스트가 자동 resolveVotes → 다음 라운드
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
  }

  const handleDrawBasic = async () => {
    const drawn = pickRandom6(decks, room!.meta.infiniteMode)
    await updateDrawnCards(roomId, drawn, (gameState?.round ?? 0) + 1)
    setCatCounts(new Map()); setTotalGenreCards(0)
  }

  const handleGenrePick = async (catIdx: number) => {
    if (totalGenreCards >= MAX_GENRE_CARDS) return
    const deckEntry = decks[catIdx]
    const item = nextItem(deckEntry, room!.meta.infiniteMode)
    const card = toDrawnCard(deckEntry.cat, catIdx, item)
    await updateDrawnCards(roomId, [...drawnCards, card])
    setCatCounts(prev => { const m = new Map(prev); m.set(catIdx, (m.get(catIdx) || 0) + 1); return m })
    setTotalGenreCards(totalGenreCards + 1)
  }

  const handleGenreReset = async () => {
    await updateDrawnCards(roomId, [], (gameState?.round ?? 0) + 1)
    setCatCounts(new Map()); setTotalGenreCards(0); setDecks(buildDecks())
  }

  const handleBuzzIn = async () => {
    if (!myUid || buzzedUid) return
    const ok = await buzzIn(roomId, myUid)
    if (ok) await openVoting(roomId)
  }

  const handleReSearch = (name: string) => {
    if (!name.trim()) return
    setSearchData(roomId, name.trim(), [])
    setReSearchInput('')
    fetch(`/api/img-proxy?q=${encodeURIComponent(name.trim())}`)
      .then(r => r.json())
      .then(({ images }) => { if (images?.length) setSearchData(roomId, name.trim(), images) })
      .catch(() => {})
  }

  const handleBuzzInWithName = async (name: string) => {
    if (!myUid || buzzedUid) return
    const ok = await buzzIn(roomId, myUid)
    if (ok) {
      // 이름만 먼저 저장해서 모든 플레이어에게 즉시 표시 (로딩 상태)
      await setSearchData(roomId, name, [])
      await openVoting(roomId)
      // 백그라운드에서 이미지 가져와 업데이트
      fetch(`/api/img-proxy?q=${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(({ images }) => { if (images?.length) setSearchData(roomId, name, images) })
        .catch(() => {})
    }
  }

  const handleVote = async (v: 'yes' | 'no') => {
    setMyVote(v)
    await castVote(roomId, myUid, v)
  }

  const handleResolve = async () => {
    if (!buzzedUid) return
    await resolveVotes(roomId, buzzedUid, votes, members as Record<string, RoomMember>)
    // 투표 처리 후 자동으로 다음 라운드 카드 뽑기
    if (mode === 'basic') await handleDrawBasic()
    else await handleGenreReset()
  }

  const handleEndGame = async () => {
    await endOnlineGame(roomId)
    // 전원 redirect는 status 'finished' useEffect에서 처리
  }

  if (!room) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>연결 중...</div>
  }

  if (status === 'waiting') {
    return (
      <LobbyWaiting
        roomId={roomId}
        meta={room.meta}
        members={members}
        myUid={myUid}
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
  const timerColor = timeLeft !== null && timeLeft <= 10 ? 'var(--accent2)' : 'var(--accent1)'

  const TimerDisplay = timeLeft !== null && (
    <div style={{
      textAlign: 'center', padding: '6px 0',
      fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-jua), sans-serif',
      color: timerColor, transition: 'color 0.3s',
    }}>
      ⏱ {timeLeft}
    </div>
  )

  const SidePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 점수판 */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 14px', border: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 13, color: 'var(--accent1)', marginBottom: 10 }}>참가자 점수</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {memberList.map(([uid, m]) => {
            const isTop = m.score > 0 && m.score === maxScore
            const isBuzzed = uid === buzzedUid
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: isBuzzed ? 'var(--accent1)15' : 'rgba(255,255,255,0.03)', border: `1px solid ${isBuzzed ? 'var(--accent1)' : 'transparent'}`, transition: 'all 0.2s' }}>
                {isTop && !isBuzzed && <Crown size={11} color="var(--accent1)" />}
                {isBuzzed && <Zap size={11} color="var(--accent1)" />}
                <span style={{ flex: 1, fontSize: 13, color: uid === myUid ? 'var(--accent3)' : 'var(--text)' }}>{m.name}</span>
                {isHost && (
                  <button onClick={() => adjustScore(roomId, uid, -1, members as Record<string, RoomMember>)} style={scoreAdjBtnStyle}>−</button>
                )}
                <span style={{ fontSize: 14, fontWeight: 700, color: isBuzzed ? 'var(--accent1)' : 'var(--text)', minWidth: 32, textAlign: 'center' }}>{m.score}점</span>
                {isHost && (
                  <button onClick={() => adjustScore(roomId, uid, +1, members as Record<string, RoomMember>)} style={scoreAdjBtnStyle}>+</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 버즈인 + 타이머 + 투표 */}
      {drawnCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TimerDisplay}
          <BuzzInButton buzzedBy={buzzedUid} buzzedName={buzzedName} myUid={myUid} disabled={false} onBuzz={handleBuzzIn} imageSearchMode={imageSearchMode} onBuzzWithName={handleBuzzInWithName} />
          <VotePanel
            votingOpen={votingOpen}
            myUid={myUid}
            buzzedUid={buzzedUid}
            myVote={myVote}
            votes={votes}
            memberCount={memberList.length}
            onVote={handleVote}
            onResolve={handleResolve}
            isHost={isHost}
          />
        </div>
      )}

      {/* 호스트 게임 종료 */}
      {isHost && (
        <button onClick={handleEndGame} style={{ padding: '9px 0', borderRadius: 8, border: '1px solid var(--accent2)44', background: 'transparent', color: 'var(--accent2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <LogOut size={13} /> 게임 종료
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* 헤더 */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 18, margin: 0 }}>
              방 {roomId}
              {round > 0 && <span style={{ opacity: 0.6, fontSize: 14, marginLeft: 8 }}>· 라운드 {round}</span>}
              <span style={{ opacity: 0.5, fontSize: 14, marginLeft: 8 }}>— {mode === 'basic' ? '기본' : '카테고리'}</span>
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{memberList.length}명 참가 중</div>
          </div>
          <button onClick={() => setGuideOpen(true)} style={fabStyle}><BookOpen size={16} /></button>
        </div>
      </header>

      {/* 본문 (데스크톱 2열) */}
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '16px', display: 'flex', gap: 20, minHeight: 'calc(100dvh - 57px)' }}>

        {/* 왼쪽: 카드 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {isHost && mode === 'basic' && !votingOpen && (
            <button onClick={handleDrawBasic} style={drawBtnStyle}><RefreshCw size={15} /> 카드 뽑기</button>
          )}
          {isHost && mode === 'genre' && !votingOpen && (
            <div style={{ marginBottom: 14 }}>
              <CategorySelector catCounts={catCounts} totalCards={totalGenreCards} maxCards={MAX_GENRE_CARDS} infiniteActive={room.meta.infiniteMode} onSelect={handleGenrePick} onReset={handleGenreReset} onToggleInfinite={() => updateRoomMeta(roomId, { infiniteMode: !room.meta.infiniteMode })} />
            </div>
          )}

          {/* 이미지 검색 결과 (모든 플레이어에게 동시 표시) */}
          {searchQuery && (
            <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(139,92,246,0.12)' }}>
                <Search size={13} color="#8b5cf6" />
                <span style={{ fontSize: 13, fontFamily: 'var(--font-jua), sans-serif', color: '#8b5cf6', flex: 1 }}>{searchQuery}</span>
                {buzzedUid === myUid && (
                  <form onSubmit={e => { e.preventDefault(); handleReSearch(reSearchInput) }} style={{ display: 'flex', gap: 4 }}>
                    <input
                      value={reSearchInput}
                      onChange={e => setReSearchInput(e.target.value)}
                      placeholder="재검색..."
                      style={{ width: 90, padding: '3px 7px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.08)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                      검색
                    </button>
                  </form>
                )}
              </div>
              {!searchImages || searchImages.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                  이미지 불러오는 중...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: 'var(--surface)' }}>
                  {searchImages.map((url, i) => (
                    <img key={i} src={url} alt={searchQuery} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {drawnCards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, justifyItems: 'center' }}>
              {drawnCards.map((card, i) => (
                <CardItem key={cardKeys[i] ?? i} card={card} index={i} rotation={mode === 'genre' ? GENRE_CARD_ROTS[i % GENRE_CARD_ROTS.length] : undefined} autoFlip />
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
              {isHost ? '카드를 뽑아주세요!' : '호스트가 카드를 뽑을 거예요...'}
            </div>
          )}

          {/* 모바일: 타이머 + 버즈인 + 투표 */}
          {drawnCards.length > 0 && (
            <div className="buzz-mobile" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TimerDisplay}
              <BuzzInButton buzzedBy={buzzedUid} buzzedName={buzzedName} myUid={myUid} disabled={false} onBuzz={handleBuzzIn} imageSearchMode={imageSearchMode} onBuzzWithName={handleBuzzInWithName} />
              <VotePanel
                votingOpen={votingOpen}
                myUid={myUid}
                buzzedUid={buzzedUid}
                myVote={myVote}
                votes={votes}
                memberCount={memberList.length}
                onVote={handleVote}
                onResolve={handleResolve}
                isHost={isHost}
              />
            </div>
          )}
        </div>

        {/* 오른쪽: 점수 + 버즈인 패널 (데스크톱) */}
        <aside className="side-panel-desktop" style={{ width: 260, flexShrink: 0 }}>
          {SidePanel}
        </aside>
      </div>

      <ChatPanel roomId={roomId} uid={myUid} myName={myName} />
      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />

      <style>{`
        @media (max-width: 767px) {
          .side-panel-desktop { display: none !important; }
        }
        @media (min-width: 768px) {
          .buzz-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}

const fabStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const scoreAdjBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer',
  fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

const drawBtnStyle: React.CSSProperties = {
  width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 15,
  border: '1px solid var(--accent1)', background: 'var(--accent1)20',
  color: 'var(--accent1)', cursor: 'pointer', fontFamily: 'var(--font-jua), sans-serif',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  marginBottom: 14,
}
