'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, CheckCircle, Search } from 'lucide-react'

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

  const isBuzzedByMe = buzzedBy === myUid
  const isBuzzedByOther = buzzedBy && buzzedBy !== myUid

  useEffect(() => {
    if (modalOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [modalOpen])

  const handleClick = () => {
    if (imageSearchMode) {
      setModalOpen(true)
    } else {
      onBuzz()
    }
  }

  const handleConfirm = () => {
    const name = charName.trim()
    if (!name) return
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
      <div style={{
        padding: '14px 20px', borderRadius: 12, textAlign: 'center',
        background: 'var(--accent1)15', border: '2px solid var(--accent1)',
        animation: 'pulse 1s infinite',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>먼저 준비한 사람</div>
        <div style={{ fontSize: 22, fontFamily: 'var(--font-jua), sans-serif', color: 'var(--accent1)' }}>
          ⚡ {buzzedName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>설명을 들어봐요!</div>
      </div>
    )
  }

  if (isBuzzedByMe) {
    return (
      <div style={{
        padding: '14px 20px', borderRadius: 12, textAlign: 'center',
        background: 'var(--accent3)15', border: '2px solid var(--accent3)',
      }}>
        <CheckCircle size={24} color="var(--accent3)" style={{ margin: '0 auto 6px' }} />
        <div style={{ fontSize: 15, fontFamily: 'var(--font-jua), sans-serif', color: 'var(--accent3)' }}>내가 먼저!</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>캐릭터를 설명해봐요</div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 12, fontSize: 17,
          fontFamily: 'var(--font-jua), sans-serif', border: 'none',
          background: disabled ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, var(--accent1), var(--accent2))',
          color: disabled ? 'var(--text-dim)' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: disabled ? 'none' : '0 4px 20px rgba(232,201,122,0.3)',
          transition: 'all 0.2s',
        }}
      >
        <Zap size={20} />
        저요! 저요!
      </button>

      {/* 캐릭터 이름 입력 모달 */}
      {modalOpen && (
        <div
          onClick={() => { setModalOpen(false); setCharName('') }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '28px 24px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Search size={16} color="var(--accent1)" />
              <span style={{ fontSize: 15, fontFamily: 'var(--font-jua), sans-serif', color: 'var(--accent1)' }}>
                캐릭터 이름 입력
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
              입력 후 모든 참가자에게 구글 이미지 검색 링크가 표시돼요
            </p>
            <input
              ref={inputRef}
              value={charName}
              onChange={e => setCharName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예) 나루토, 해리포터..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => { setModalOpen(false); setCharName('') }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={!charName.trim()}
                style={{
                  flex: 2, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: charName.trim() ? 'var(--accent1)' : 'var(--accent1)44',
                  color: charName.trim() ? '#000' : 'rgba(0,0,0,0.3)', cursor: charName.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontFamily: 'var(--font-jua), sans-serif',
                }}
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
