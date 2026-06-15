'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, RefreshCw, Infinity as InfinityIcon, Crown, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import CardItem from '@/components/card-game/game/CardItem'
import GuideOverlay from '@/components/card-game/game/GuideOverlay'
import CategorySelector from '@/components/card-game/game/CategorySelector'
import { buildDecks, pickRandom6, nextItem, toDrawnCard, DeckEntry, DrawnCard } from '@/lib/card-game/game-logic'
import { TOTAL_CARDS } from '@/lib/card-game/game-data'
import { useSoundEnabled } from '@/hooks/useSoundEnabled'
import { playDraw, playScore, playTick } from '@/lib/card-game/sounds'

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
  const { soundEnabled, toggleSound } = useSoundEnabled()

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
    if (soundEnabled) playDraw()
  }, [soundEnabled])

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
    if (soundEnabled) playDraw()
  }

  const handleGenreReset = () => {
    setCards([]); setCardKeys([]); setRotations([]); setCatCounts(new Map()); setTotalGenreCards(0)
    const newDecks = buildDecks(); setDecks(newDecks); setRemaining(TOTAL_CARDS)
  }

  const addScore = (idx: number) => { setMembers(prev => prev.map((m, i) => i === idx ? { ...m, score: m.score + 1 } : m)); if (soundEnabled) playScore() }
  const removeScore = (idx: number) => { setMembers(prev => prev.map((m, i) => i === idx ? { ...m, score: Math.max(0, m.score - 1) } : m)); if (soundEnabled) playTick() }
  const resetScores = () => setMembers(prev => prev.map(m => ({ ...m, score: 0 })))
  const endGame = () => {
    sessionStorage.setItem('results', JSON.stringify(members))
    router.push('/card-game/result')
  }

  const maxScore = members.length > 0 ? Math.max(...members.map(m => m.score)) : 0

  return (
    <div className="cabinet" style={{ minHeight: '100dvh' }}>
      <div className="crt" />

      {/* ── 헤더 ── */}
      <header style={{
        position: 'relative', zIndex: 10, width: '100%',
        borderBottom: '1.5px solid var(--line)', background: 'var(--bg-2)',
      }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="arc-btn-ghost"
              onClick={() => router.push('/card-game')}
              style={{ fontSize: 13, padding: '8px 13px' }}
            >
              ← 로비
            </button>
            <div>
              <span className="arc-badge" style={{ background: 'var(--magenta)', color: '#fff' }}>
                {gameMode === 'basic' ? '기본 모드' : '카테고리 선택'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pix" style={{ fontSize: 7.5, color: 'var(--faint)' }}>
              {infinite ? '∞ 무한' : `${remaining} / ${TOTAL_CARDS}`}
            </span>
            <button className="arc-btn-ghost" onClick={toggleSound} style={{ fontSize: 13, padding: '8px 12px' }} title={soundEnabled ? '소리 끄기' : '소리 켜기'}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button
              className="arc-btn-ghost"
              onClick={() => setGuideOpen(true)}
              style={{ fontSize: 13, padding: '8px 12px' }}
              title="카드 도감"
            >
              <BookOpen size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div style={{
        position: 'relative', zIndex: 1, maxWidth: 1024, margin: '0 auto', width: '100%',
        padding: '16px 18px 80px', display: 'flex', gap: 20,
        minHeight: 'calc(100dvh - 57px)',
      }}>

        {/* 게임 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* 카테고리 모드 */}
          {gameMode === 'genre' && (
            <div style={{ marginBottom: 16 }}>
              <CategorySelector
                catCounts={catCounts}
                totalCards={totalGenreCards}
                maxCards={MAX_GENRE_CARDS}
                infiniteActive={infinite}
                onSelect={handleGenrePick}
                onReset={handleGenreReset}
                onToggleInfinite={() => setInfinite(v => !v)}
              />
            </div>
          )}

          {/* 기본 모드 컨트롤 */}
          {gameMode === 'basic' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => drawBasic(decks, infinite)}
                className="arc-btn arc-btn--magenta"
                style={{ flex: 1, fontSize: 15, padding: '11px 0' }}
              >
                <RefreshCw size={15} /> 카드 뽑기
              </button>
              <button
                onClick={() => setInfinite(v => !v)}
                title="무한 모드"
                style={{
                  padding: '11px 14px', borderRadius: 12,
                  border: `1.5px solid ${infinite ? 'var(--magenta)' : 'var(--line-2)'}`,
                  background: infinite ? 'color-mix(in srgb, var(--magenta) 14%, transparent)' : 'transparent',
                  color: infinite ? 'var(--magenta)' : 'var(--dim)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s',
                }}
              >
                <InfinityIcon size={16} />
              </button>
            </div>
          )}

          {/* 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignContent: 'start', justifyItems: 'center' }}>
            {cards.map((card, i) => (
              <CardItem key={cardKeys[i] ?? i} card={card} index={i} rotation={gameMode === 'genre' ? rotations[i] : undefined} autoFlip />
            ))}
          </div>

          {gameMode === 'basic' && cards.length > 0 && (
            <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', textAlign: 'center', marginTop: 14 }}>
              탭하면 카드 뒤집기
            </p>
          )}
        </div>

        {/* 점수판 — 데스크톱(768px+)에서 항상 표시 */}
        {members.length > 0 && (
          <aside className="score-panel-desktop" style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 4 }}>SCORE BOARD</span>
            {members.map((m, i) => {
              const isTop = m.score > 0 && m.score === maxScore
              return (
                <div
                  key={i}
                  className="arc-panel"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px',
                    borderColor: isTop ? 'var(--magenta)' : 'var(--line)',
                    boxShadow: isTop ? '0 0 18px -6px var(--magenta)' : 'none',
                    transition: 'border-color .2s, box-shadow .2s',
                  }}
                >
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                    {isTop ? '👑' : ['🥇', '🥈', '🥉'][i] || '🎮'}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 600,
                    color: isTop ? 'var(--magenta)' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {isTop && <Crown size={11} color="var(--magenta)" />}
                    {m.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => removeScore(i)} className="score-step" style={{ background: 'var(--surface-3)' }}>−</button>
                    <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: 'var(--coin)', minWidth: 22, textAlign: 'center' }}>{m.score}</span>
                    <button onClick={() => addScore(i)} className="score-step" style={{ background: 'var(--magenta)', color: '#fff' }}>+</button>
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={resetScores} className="arc-btn-ghost" style={{ fontSize: 12, padding: '8px 0', width: '100%' }}>
                <RotateCcw size={12} /> 점수 초기화
              </button>
              <button onClick={endGame} className="arc-btn arc-btn--magenta" style={{ fontSize: 13, padding: '11px 0' }}>
                게임 종료
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* 모바일 점수판 FAB */}
      {members.length > 0 && (
        <button
          className="score-fab-mobile"
          onClick={() => setScoreOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 30,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--magenta)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px -4px var(--magenta), 0 4px 16px rgba(0,0,0,0.4)',
            flexDirection: 'column', gap: 0, lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 9, color: '#fff', fontFamily: 'var(--f-pix)', letterSpacing: 0 }}>점수</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', fontFamily: 'var(--f-disp)' }}>
            {Math.max(...members.map(m => m.score))}
          </span>
        </button>
      )}

      {/* 모바일 점수판 드로어 */}
      {scoreOpen && (
        <>
          <div onClick={() => setScoreOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100%', width: 270, zIndex: 50,
            background: 'var(--bg-2)', borderLeft: '1.5px solid var(--line)',
            padding: '22px 18px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span className="arc-lbl" style={{ color: 'var(--magenta)' }}>SCORE BOARD</span>
              <button onClick={() => setScoreOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m, i) => {
                const isTop = m.score > 0 && m.score === maxScore
                return (
                  <div
                    key={i}
                    className="arc-panel"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderColor: isTop ? 'var(--magenta)' : 'var(--line)',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 14, color: isTop ? 'var(--magenta)' : 'var(--text)', fontWeight: 600 }}>
                      {isTop && '👑 '}{m.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => removeScore(i)} className="score-step" style={{ background: 'var(--surface-3)' }}>−</button>
                      <span style={{ fontFamily: 'var(--f-disp)', fontSize: 15, color: 'var(--coin)', minWidth: 22, textAlign: 'center' }}>{m.score}</span>
                      <button onClick={() => addScore(i)} className="score-step" style={{ background: 'var(--magenta)', color: '#fff' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={resetScores} className="arc-btn-ghost" style={{ width: '100%', fontSize: 13 }}>
                <RotateCcw size={12} /> 점수 초기화
              </button>
              <button onClick={() => { setScoreOpen(false); endGame() }} className="arc-btn arc-btn--magenta" style={{ fontSize: 15 }}>
                게임 종료
              </button>
            </div>
          </div>
        </>
      )}

      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />

      <style>{`
        @media (max-width: 767px) { .score-panel-desktop { display: none !important; } }
        @media (min-width: 768px) { .score-fab-mobile { display: none !important; } }
      `}</style>
    </div>
  )
}
