'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, CheckCircle, Search } from 'lucide-react'
import { playBuzz } from '@/lib/card-game/sounds'
import { useSoundEnabled } from '@/hooks/useSoundEnabled'

interface Props {
  buzzedBy: string | null
  buzzedName: string | null
  myUid: string
  disabled: boolean
  onBuzz: () => void
  imageSearchMode?: boolean
  onBuzzWithName?: (name: string) => void
}

export default function BuzzInButton({ buzzedBy, buzzedName, myUid, disabled, onBuzz, imageSearchMode, onBuzzWithName }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [charName, setCharName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { soundEnabled } = useSoundEnabled()
  const isBuzzedByMe = buzzedBy === myUid
  const isBuzzedByOther = buzzedBy && buzzedBy !== myUid

  useEffect(() => {
    if (modalOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [modalOpen])

  const handleClick = () => {
    if (soundEnabled) playBuzz()
    if (imageSearchMode) setModalOpen(true)
    else onBuzz()
  }

  const handleConfirm = () => {
    const name = charName.trim()
    if (!name) return
    if (soundEnabled) playBuzz()
    onBuzzWithName?.(name)
    setModalOpen(false)
    setCharName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') { setModalOpen(false); setCharName('') }
  }

  if (isBuzzedByOther) {
    return (
      <div
        className="arc-panel"
        style={{
          padding: '14px 18px', textAlign: 'center',
          borderColor: 'var(--magenta)',
          boxShadow: '0 0 20px -6px var(--magenta)',
        }}
      >
        <div className="pix" style={{ fontSize: 8, color: 'var(--magenta)', marginBottom: 6 }}>BUZZED IN</div>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--magenta)' }}>
          ⚡ {buzzedName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>설명을 들어봐요!</div>
      </div>
    )
  }

  if (isBuzzedByMe) {
    return (
      <div
        className="arc-panel"
        style={{
          padding: '14px 18px', textAlign: 'center',
          borderColor: 'var(--cyan)',
          boxShadow: '0 0 20px -6px var(--cyan)',
        }}
      >
        <CheckCircle size={24} color="var(--cyan)" style={{ margin: '0 auto 6px' }} />
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--cyan)' }}>내가 먼저!</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>캐릭터를 설명해봐요</div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="arc-btn arc-btn--magenta"
        style={{ fontSize: 17, opacity: disabled ? 0.4 : 1 }}
      >
        <Zap size={18} /> 저요! 저요!
      </button>

      {modalOpen && (
        <div
          onClick={() => { setModalOpen(false); setCharName('') }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="arc-panel ticks"
            style={{ padding: '24px 22px', width: 320 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Search size={15} color="var(--magenta)" />
              <span className="arc-lbl" style={{ color: 'var(--magenta)' }}>캐릭터 이름 입력</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14, lineHeight: 1.5 }}>
              입력 후 모든 참가자에게 구글 이미지 검색 링크가 표시돼요
            </p>
            <input
              ref={inputRef}
              value={charName}
              onChange={e => setCharName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예) 나루토, 해리포터..."
              className="arc-field"
              style={{ '--c': 'var(--magenta)' } as React.CSSProperties}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => { setModalOpen(false); setCharName('') }}
                className="arc-btn-ghost"
                style={{ flex: 1, fontSize: 13 }}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={!charName.trim()}
                className="arc-btn arc-btn--magenta"
                style={{ flex: 2, fontSize: 13, padding: '11px 0' }}
              >
                검색 시작!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
