'use client'

import { Zap, CheckCircle } from 'lucide-react'

interface Props {
  buzzedBy: string | null
  buzzedName: string | null
  myUid: string
  disabled: boolean
  onBuzz: () => void
}

export default function BuzzInButton({ buzzedBy, buzzedName, myUid, disabled, onBuzz }: Props) {
  const isBuzzedByMe = buzzedBy === myUid
  const isBuzzedByOther = buzzedBy && buzzedBy !== myUid

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
    <button
      onClick={onBuzz}
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
  )
}
