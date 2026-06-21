'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginGuest, getGuestNickname } from '@/lib/auth'

function Bulbs({ n = 11 }: { n?: number }) {
  return (
    <div className="bulbs">
      {Array.from({ length: n }).map((_, i) => <span key={i} className="bulb" />)}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getGuestNickname()) {
      router.replace('/lobby')
    }
  }, [router])

  async function submit() {
    const name = nickname.trim()
    if (!name) { setError('닉네임을 입력해 주세요'); return }
    if (name.length > 12) { setError('12자 이내로 입력해 주세요'); return }
    setLoading(true)
    setError('')
    try {
      await loginGuest(name)
      router.push('/lobby')
    } catch {
      setError('입장 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }


  return (
    <div className="cabinet">
      <div className="crt" />

      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingTop: 28 }}>
        {/* Marquee */}
        <div className="arc-pop" style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
          <Bulbs n={11} />
          <div style={{ margin: '20px 0 6px' }}>
            <div
              className="arc-float"
              style={{
                width: 128, height: 128,
                borderRadius: 22,
                background: 'radial-gradient(circle at 50% 35%, #fdfcea 0%, #f3edcf 100%)',
                border: '3px solid rgba(255,255,255,.85)',
                boxShadow: '0 0 0 4px rgba(0,0,0,.4), 0 14px 34px -8px rgba(0,0,0,.7), 0 0 40px -6px rgba(255,183,43,.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', margin: '0 auto',
              }}
            >
              <img src="/icon.png" alt="놀아조라" style={{ width: '92%', height: '92%', objectFit: 'contain' }} />
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--f-title)', fontSize: 54, margin: '14px 0 0', color: 'var(--text)', lineHeight: 1, letterSpacing: 1, textShadow: '0 3px 0 rgba(0,0,0,.5)' }}>
            놀아조라
          </h1>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 19, letterSpacing: 2, marginTop: 8 }} className="neon-gold">
            ARCADE
          </div>
          <p className="pix" style={{ fontSize: 9, color: 'var(--dim)', marginTop: 14, letterSpacing: 1.5 }}>
            BOARD GAME ARCADE · 5 GAMES
          </p>
          <div style={{ marginTop: 10 }}>
            <Bulbs n={11} />
          </div>
        </div>

        {/* Login panel */}
        <form
          onSubmit={e => { e.preventDefault(); submit() }}
          className="arc-panel ticks arc-rise"
          style={{ width: '100%', maxWidth: 380, padding: '26px 22px 24px', marginTop: 30, animationDelay: '.15s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span className="pix" style={{ fontSize: 9, color: 'var(--gold)' }}>1P</span>
            <span className="arc-lbl">ENTER YOUR NAME</span>
          </div>
          <input
            className="arc-field"
            style={{ textAlign: 'center', fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 22, letterSpacing: 1 }}
            value={nickname}
            maxLength={12}
            autoFocus
            placeholder="닉네임 입력"
            onChange={e => { setNickname(e.target.value); setError('') }}
          />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10, marginBottom: 0 }}>{error}</p>}

          <button type="submit" className="arc-btn" disabled={loading} style={{ marginTop: 18, fontSize: 20 }}>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 11, marginRight: 2 }}>▶</span>
            {loading ? 'LOADING...' : 'INSERT COIN'}
          </button>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--coin)', marginTop: 16, letterSpacing: 1 }}>
            PRESS START TO PLAY
          </p>
        </form>
      </div>
    </div>
  )
}
