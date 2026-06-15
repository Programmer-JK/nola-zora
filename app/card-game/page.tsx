'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Infinity as InfinityIcon, HelpCircle, BookOpen, Volume2, VolumeX } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useAuth } from '@/context/AuthContext'
import { createRoom, joinRoom } from '@/lib/card-game/firebase-game'
import GuideOverlay from '@/components/card-game/game/GuideOverlay'
import CharacterIcon from '@/components/card-game/CharacterIcon'
import { useSoundEnabled } from '@/hooks/useSoundEnabled'

const DOT_COLORS = ['#ff5da2', '#ffb72b', '#36e0cf', '#7ed957', '#a274ff', '#ff8c42']

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
  const [onlineTab, setOnlineTab] = useState<'create' | 'join'>('create')
  const [infinite, setInfinite] = useState(true)
  const [roomInput, setRoomInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { soundEnabled, toggleSound } = useSoundEnabled()

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

  const magSeg: React.CSSProperties = {
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--magenta) 92%, #fff), var(--magenta))',
    color: '#fff',
    boxShadow: '0 3px 0 0 var(--magenta-lo)',
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <main className="arc-screen">

        {/* HUD */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 10px', gap: 8 }}>
          <button className="arc-btn-ghost" onClick={() => router.push('/lobby')} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="arc-btn-ghost" onClick={toggleSound} style={{ fontSize: 13, padding: '9px 12px' }} title={soundEnabled ? '소리 끄기' : '소리 켜기'}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button className="arc-btn-ghost" onClick={() => setGuideOpen(true)} style={{ fontSize: 13, padding: '9px 14px' }}>
              <BookOpen size={14} /> 도감
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '6px 0 22px' }}>
          <div className="arc-float" style={{ lineHeight: 1 }}><CharacterIcon size={120} /></div>
          <h1
            className="neon-magenta"
            style={{ fontFamily: 'var(--f-disp)', fontSize: 26, letterSpacing: 1, margin: '8px 0 2px' }}
          >
            CHARACTER CARD
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)' }}>캐릭터 카드</div>
        </div>

        {/* Play mode tabs */}
        <div className="arc-seg" style={{ marginBottom: 16, '--c': 'var(--magenta)', '--seg-text': '#fff' } as React.CSSProperties}>
          <button className={playMode === 'local' ? 'on' : ''} style={playMode === 'local' ? magSeg : {}} onClick={() => { setPlayMode('local'); setError('') }}>
            🖥️ 로컬 플레이
          </button>
          <button className={playMode === 'online' ? 'on' : ''} style={playMode === 'online' ? magSeg : {}} onClick={() => { setPlayMode('online'); setError('') }}>
            🌐 온라인 플레이
          </button>
        </div>

        {/* Settings panel */}
        <div className="arc-panel ticks" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Online: sub-tabs at top */}
          {playMode === 'online' && (
            <div className="arc-seg" style={{ '--c': 'var(--magenta)', '--seg-text': '#fff' } as React.CSSProperties}>
              <button
                className={onlineTab === 'create' ? 'on' : ''}
                style={onlineTab === 'create' ? magSeg : {}}
                onClick={() => { setOnlineTab('create'); setError(''); setRoomInput('') }}
              >
                방 만들기
              </button>
              <button
                className={onlineTab === 'join' ? 'on' : ''}
                style={onlineTab === 'join' ? magSeg : {}}
                onClick={() => { setOnlineTab('join'); setError('') }}
              >
                방 참가하기
              </button>
            </div>
          )}

          {/* Game Mode (로컬 or 온라인 방 만들기 탭에서만) */}
          {(playMode === 'local' || onlineTab === 'create') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="arc-lbl" style={{ color: 'var(--magenta)' }}>GAME MODE</span>
                <button
                  onClick={() => setShowGuide(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', lineHeight: 0, padding: 0 }}
                >
                  <HelpCircle size={13} />
                </button>
              </div>
              <div className="arc-seg" style={{ marginBottom: 10, '--c': 'var(--magenta)', '--seg-text': '#fff' } as React.CSSProperties}>
                <button className={gameMode === 'basic' ? 'on' : ''} style={gameMode === 'basic' ? magSeg : {}} onClick={() => setGameMode('basic')}>
                  기본 (6장 자동)
                </button>
                <button className={gameMode === 'genre' ? 'on' : ''} style={gameMode === 'genre' ? magSeg : {}} onClick={() => setGameMode('genre')}>
                  카테고리 선택
                </button>
              </div>
              <button
                onClick={() => setInfinite(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${infinite ? 'var(--magenta)' : 'var(--line-2)'}`,
                  color: infinite ? 'var(--magenta)' : 'var(--dim)',
                  background: infinite ? 'color-mix(in srgb, var(--magenta) 14%, transparent)' : 'transparent',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <InfinityIcon size={12} /> 무한 모드 {infinite ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--line)' }} />

          {/* Local: Player setup */}
          {playMode === 'local' && (
            <div>
              <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 10 }}>PLAYERS</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 10 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="이름 입력 후 Enter"
                  className="arc-field"
                  style={{ flex: 1, '--c': 'var(--magenta)' } as React.CSSProperties}
                />
                <button
                  onClick={addMember}
                  className="arc-btn-ghost"
                  style={{ padding: '0 16px', flexShrink: 0 }}
                >
                  <Plus size={16} />
                </button>
              </div>
              {members.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {members.map((m, i) => (
                    <div key={i} className="arc-chip">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOT_COLORS[i % 6], flexShrink: 0 }} />
                      <span>{m.name}</span>
                      <button
                        onClick={() => removeMember(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', lineHeight: 0, padding: 0 }}
                      >
                        <X size={11} />
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
                <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 8 }}>내 닉네임</span>
                <div className="arc-panel-inset" style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 15, marginTop: 8 }}>
                  {nickname}
                </div>
              </div>
              {onlineTab === 'join' && (
                <div>
                  <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 8 }}>ROOM CODE</span>
                  <input
                    value={roomInput}
                    onChange={e => { setRoomInput(e.target.value.toUpperCase()); setError('') }}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="arc-field"
                    style={{
                      marginTop: 8, textAlign: 'center', fontSize: 20, fontWeight: 700,
                      letterSpacing: '0.3em', '--c': 'var(--magenta)',
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </>
          )}

          {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>}

          {/* CTA */}
          {playMode === 'local' ? (
            <button
              onClick={startLocal}
              disabled={members.length === 0}
              className="arc-btn arc-btn--magenta"
              style={{ fontSize: 18 }}
            >
              게임 시작
            </button>
          ) : (
            <button
              onClick={onlineTab === 'create' ? createOnlineRoom : joinOnlineRoom}
              disabled={loading || (onlineTab === 'join' && roomInput.length < 6)}
              className="arc-btn arc-btn--magenta"
              style={{ fontSize: 18 }}
            >
              {loading ? '처리 중...' : onlineTab === 'create' ? '방 만들기' : '참가하기'}
            </button>
          )}
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 22, lineHeight: 1.8 }}>
          BEST DESCRIPTION WINS
        </p>
      </main>

      {/* Guide modal */}
      {showGuide && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowGuide(false)}
        >
          <div
            className="arc-panel ticks"
            style={{ padding: '24px 22px', maxWidth: 360, width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="arc-lbl" style={{ color: 'var(--magenta)' }}>GAME MODE GUIDE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div className="arc-panel-inset" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>기본 모드</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>버튼을 누르면 6장의 카드가 무작위로 뽑혀요. 카테고리 균형이 자동으로 맞춰집니다.</div>
              </div>
              <div className="arc-panel-inset" style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>카테고리 선택 모드</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>원하는 카테고리 버튼을 직접 눌러 카드를 뽑아요. 최대 8장까지 뽑을 수 있어요.</div>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="arc-btn-ghost" style={{ width: '100%', marginTop: 16, fontSize: 14 }}>
              닫기
            </button>
          </div>
        </div>
      )}

      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
