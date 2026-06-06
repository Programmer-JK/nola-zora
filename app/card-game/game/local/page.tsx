'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, RefreshCw, Infinity as InfinityIcon, Crown, RotateCcw } from 'lucide-react'
import CardItem from '@/components/card-game/game/CardItem'
import GuideOverlay from '@/components/card-game/game/GuideOverlay'
import CategorySelector from '@/components/card-game/game/CategorySelector'
import { buildDecks, pickRandom6, nextItem, toDrawnCard, DeckEntry, DrawnCard } from '@/lib/card-game/game-logic'
import { TOTAL_CARDS } from '@/lib/card-game/game-data'

interface Member { name: string; score: number }

const MAX_GENRE_CARDS = 8
const GENRE_CARD_ROTS = [-2.8, 1.6, -1.4, 2.4, -0.6, 1.8, -2.2, 2.0, -1.8, 1.2, -0.9, 2.6, -1.6]

export default function LocalGamePage() {
  const router = useRouter()
  const [gameMode, setGameMode] = useState<'basic' | 'genre'>('basic')
  const [members, setMembers] = useState<Member[]>([])
  const [infinite, setInfinite] = useState(false)
  const [decks, setDecks] = useState<DeckEntry[]>([])
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [cardKeys, setCardKeys] = useState<number[]>([])
  const [rotations, setRotations] = useState<number[]>([])
  const [remaining, setRemaining] = useState(TOTAL_CARDS)
  const [guideOpen, setGuideOpen] = useState(false)
  const [catCounts, setCatCounts] = useState<Map<number, number>>(new Map())
  const [totalGenreCards, setTotalGenreCards] = useState(0)
  const [scoreOpen, setScoreOpen] = useState(false)

  useEffect(() => {
    const savedPlayers = sessionStorage.getItem('players')
    const savedInfinite = sessionStorage.getItem('infinite') !== 'false'
    const savedMode = (sessionStorage.getItem('gameMode') as 'basic' | 'genre') || 'basic'

    if (savedPlayers) setMembers(JSON.parse(savedPlayers).map((name: string) => ({ name, score: 0 })))
    setInfinite(savedInfinite)
    setGameMode(savedMode)

    const newDecks = buildDecks()
    setDecks(newDecks)

    if (savedMode === 'basic') {
      const drawn = pickRandom6(newDecks, savedInfinite)
      setCards(drawn)
      setCardKeys(drawn.map((_, i) => Date.now() + i))
      setRemaining(newDecks.reduce((s, e) => s + e.remaining.length, 0))
    }
  }, [])

  const drawBasic = useCallback((d: DeckEntry[], inf: boolean) => {
    const drawn = pickRandom6(d, inf)
    setCards(drawn)
    setCardKeys(drawn.map((_, i) => Date.now() + i))
    setRotations([])
    setRemaining(d.reduce((s, e) => s + e.remaining.length, 0))
  }, [])

  const handleGenrePick = (catIdx: number) => {
    if (totalGenreCards >= MAX_GENRE_CARDS) return
    const deckEntry = decks[catIdx]
    const item = nextItem(deckEntry, infinite)
    const card = toDrawnCard(deckEntry.cat, catIdx, item)
    const newTotal = totalGenreCards + 1
    const rot = GENRE_CARD_ROTS[(newTotal - 1) % GENRE_CARD_ROTS.length]
    setCards(prev => [...prev, card])
    setCardKeys(prev => [...prev, Date.now()])
    setRotations(prev => [...prev, rot])
    setCatCounts(prev => { const m = new Map(prev); m.set(catIdx, (m.get(catIdx) || 0) + 1); return m })
    setTotalGenreCards(newTotal)
    setRemaining(decks.reduce((s, e) => s + e.remaining.length, 0))
  }

  const handleGenreReset = () => {
    setCards([]); setCardKeys([]); setRotations([]); setCatCounts(new Map()); setTotalGenreCards(0)
    const newDecks = buildDecks(); setDecks(newDecks); setRemaining(TOTAL_CARDS)
  }

  const addScore = (idx: number) => setMembers(prev => prev.map((m, i) => i === idx ? { ...m, score: m.score + 1 } : m))
  const removeScore = (idx: number) => setMembers(prev => prev.map((m, i) => i === idx ? { ...m, score: Math.max(0, m.score - 1) } : m))
  const resetScores = () => setMembers(prev => prev.map(m => ({ ...m, score: 0 })))
  const endGame = () => {
    sessionStorage.setItem('results', JSON.stringify(members))
    router.push('/card-game/result')
  }

  const maxScore = members.length > 0 ? Math.max(...members.map(m => m.score)) : 0

  return (
    <>
      {/* ── 헤더 ── */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 18, margin: 0 }}>
              {gameMode === 'basic' ? '기본 모드' : '카테고리 선택'}
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>남은 카드 {remaining} / {TOTAL_CARDS}</div>
          </div>
          <button onClick={() => setGuideOpen(true)} style={fabStyle} title="카드 도감">
            <BookOpen size={16} />
          </button>
        </div>
      </header>

      {/* ── 본문 (데스크톱 2열) ── */}
      <div style={{ maxWidth: 1024, margin: '0 auto', width: '100%', padding: '16px', display: 'flex', gap: 20, minHeight: 'calc(100dvh - 57px)' }}>

        {/* 게임 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {gameMode === 'genre' && (
            <div style={{ marginBottom: 16 }}>
              <CategorySelector catCounts={catCounts} totalCards={totalGenreCards} maxCards={MAX_GENRE_CARDS} infiniteActive={infinite} onSelect={handleGenrePick} onReset={handleGenreReset} onToggleInfinite={() => setInfinite(v => !v)} />
            </div>
          )}

          {gameMode === 'basic' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => drawBasic(decks, infinite)} style={drawBtnStyle}>
                <RefreshCw size={15} /> 카드 뽑기
              </button>
              <button
                onClick={() => setInfinite(v => !v)}
                title="무한 모드"
                style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${infinite ? 'var(--accent3)' : 'var(--border)'}`, background: infinite ? 'var(--accent3)22' : 'transparent', color: infinite ? 'var(--accent3)' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <InfinityIcon size={15} />
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignContent: 'start', justifyItems: 'center' }}>
            {cards.map((card, i) => (
              <CardItem key={cardKeys[i] ?? i} card={card} index={i} rotation={gameMode === 'genre' ? rotations[i] : undefined} autoFlip />
            ))}
          </div>
        </div>

        {/* 점수판 — 데스크톱(768px+)에서 항상 표시 */}
        {members.length > 0 && (
          <aside className="score-panel-desktop" style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 14, color: 'var(--accent1)', marginBottom: 2 }}>점수판</div>
            {members.map((m, i) => {
              const isTop = m.score > 0 && m.score === maxScore
              return (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', border: `1px solid ${isTop ? 'var(--accent1)44' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color 0.2s' }}>
                  <span style={{ flex: 1, fontSize: 13, color: isTop ? 'var(--accent1)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isTop && <Crown size={11} color="var(--accent1)" />}
                    {m.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => removeScore(i)} style={scoreBtnStyle('#666')}>−</button>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{m.score}</span>
                    <button onClick={() => addScore(i)} style={scoreBtnStyle('var(--accent3)')}>+</button>
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={resetScores} style={actionBtnStyle('var(--text-dim)')}><RotateCcw size={12} /> 점수 초기화</button>
              <button onClick={endGame} style={actionBtnStyle('var(--accent2)')}>게임 종료</button>
            </div>
          </aside>
        )}
      </div>

      {/* 모바일 점수판 FAB */}
      {members.length > 0 && (
        <button
          className="score-fab-mobile"
          onClick={() => setScoreOpen(true)}
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 30, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(232,201,122,0.4)', fontFamily: 'var(--font-jua), sans-serif', fontSize: 13, color: '#000', flexDirection: 'column', gap: 0, lineHeight: 1 }}
        >
          <span style={{ fontSize: 10 }}>점수</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{Math.max(...members.map(m => m.score))}</span>
        </button>
      )}

      {/* 모바일 점수판 드로어 */}
      {scoreOpen && (
        <>
          <div onClick={() => setScoreOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 260, zIndex: 50, background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 16, color: 'var(--accent1)' }}>점수판</span>
              <button onClick={() => setScoreOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m, i) => {
                const isTop = m.score > 0 && m.score === maxScore
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 14, color: isTop ? 'var(--accent1)' : 'var(--text)' }}>
                      {isTop && <Crown size={12} color="var(--accent1)" style={{ display: 'inline', marginRight: 4 }} />}
                      {m.name}
                    </span>
                    <button onClick={() => removeScore(i)} style={scoreBtnStyle('#555')}>−</button>
                    <span style={{ fontSize: 15, minWidth: 24, textAlign: 'center' }}>{m.score}</span>
                    <button onClick={() => addScore(i)} style={scoreBtnStyle('var(--accent3)')}>+</button>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={resetScores} style={actionBtnStyle('var(--text-dim)')}>점수 초기화</button>
              <button onClick={() => { setScoreOpen(false); endGame() }} style={actionBtnStyle('var(--accent2)')}>게임 종료</button>
            </div>
          </div>
        </>
      )}

      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />

      <style>{`
        @media (max-width: 767px) {
          .score-panel-desktop { display: none !important; }
        }
        @media (min-width: 768px) {
          .score-fab-mobile { display: none !important; }
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

const drawBtnStyle: React.CSSProperties = {
  flex: 1, padding: '11px 0', borderRadius: 10, fontSize: 15, fontWeight: 600,
  border: '1px solid var(--accent1)', background: 'var(--accent1)20',
  color: 'var(--accent1)', cursor: 'pointer', fontFamily: 'var(--font-jua), sans-serif',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

const scoreBtnStyle = (bg: string): React.CSSProperties => ({
  width: 24, height: 24, borderRadius: 6, border: 'none', background: bg,
  color: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
})

const actionBtnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 0', borderRadius: 8, border: `1px solid ${color}`, background: 'transparent',
  color, cursor: 'pointer', fontSize: 13, width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
})
