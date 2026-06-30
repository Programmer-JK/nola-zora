'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginGuest, getGuestNickname } from '@/lib/auth'
import { generateRoomCode, createRoom, joinRoom } from '@/lib/who-am-i/firebase-game'
import { PLAYER_COLORS, COLOR_HEX, type PlayerColor } from '@/lib/who-am-i/types'

const ACCENT = '#f97316'

export default function WhoAmISetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [color, setColor] = useState<PlayerColor>('red')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = getGuestNickname()
    if (saved) setNickname(saved)
    const codeParam = searchParams.get('code')
    if (!codeParam) return
    const upperCode = codeParam.toUpperCase()
    setJoinCode(upperCode)
    if (!saved) return
    // 저장된 닉네임이 있으면 자동 참가
    setLoading('join')
    loginGuest(saved)
      .then(uid => joinRoom(upperCode, { clientId: uid, name: saved, color: 'red' }))
      .then(result => {
        if (result.success) {
          router.push(`/who-am-i/room/${upperCode}`)
        } else {
          setError(result.error ?? '참가 실패')
          setLoading(null)
        }
      })
  }, [searchParams, router])

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return }
    setError(''); setLoading('create')
    const uid = await loginGuest(nickname.trim())
    const code = generateRoomCode()
    await createRoom(code, uid, { clientId: uid, name: nickname.trim(), color })
    router.push(`/who-am-i/room/${code}`)
  }

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return }
    const code = joinCode.trim().toUpperCase()
    if (!code) { setError('방 코드를 입력하세요.'); return }
    setError(''); setLoading('join')
    const uid = await loginGuest(nickname.trim())
    const result = await joinRoom(code, { clientId: uid, name: nickname.trim(), color })
    if (!result.success) { setError(result.error ?? '참가 실패'); setLoading(null); return }
    router.push(`/who-am-i/room/${code}`)
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 로비</Link>
          <Link href="/who-am-i/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>📖 규칙</Link>
        </div>

        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🤔</div>
          <h1 style={{
            fontFamily: 'var(--f-disp)', fontSize: 28, letterSpacing: 1,
            margin: '8px 0 2px', color: ACCENT,
            textShadow: `0 0 18px rgba(249,115,22,0.5)`,
          }}>
            WHO AM I?
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>나는 누구?</div>
        </div>

        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 닉네임 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="arc-lbl">내 닉네임</span>
                <span style={{ fontSize: 12, color: nickname.length >= 10 ? 'var(--red)' : 'var(--faint)' }}>
                  {nickname.length}/10
                </span>
              </div>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={10}
                placeholder="닉네임 입력..."
                className="arc-field"
                style={{ fontWeight: 600 }}
              />
            </div>

            {/* 색상 선택 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>내 색상</span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PLAYER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: COLOR_HEX[c],
                      border: color === c ? '3px solid white' : '2px solid transparent',
                      boxShadow: color === c ? `0 0 0 2px ${COLOR_HEX[c]}` : 'none',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p style={{
                color: 'var(--red)', fontSize: 13, margin: 0,
                background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)',
                borderRadius: 12, padding: '10px 14px',
              }}>
                {error}
              </p>
            )}

            {/* 방 만들기 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
              <button
                onClick={handleCreate}
                disabled={loading !== null}
                className="arc-btn"
                style={{ background: ACCENT }}
              >
                {loading === 'create' ? 'LOADING...' : '새 방 만들기'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ color: 'var(--faint)', fontSize: 12 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            {/* 방 참가 */}
            <div>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 참가</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="방 코드 6자리"
                  className="arc-field"
                  style={{ flex: 1, letterSpacing: 4, fontFamily: 'var(--f-pix)', fontSize: 12 }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading !== null}
                  className="arc-btn-ghost"
                  style={{ flexShrink: 0 }}
                >
                  {loading === 'join' ? '...' : '참가'}
                </button>
              </div>
            </div>

          </div>
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          WHO AM I? · 2인+ · GUESS YOUR WORD
        </p>

      </div>
    </div>
  )
}
