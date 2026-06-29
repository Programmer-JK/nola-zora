'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGuestUid, getGuestNickname } from '@/lib/auth'
import { subscribeRoom, startGame, sendMessage, toPlayerList, toMessageList } from '@/lib/who-am-i/firebase-game'
import type { WhoAmIRoom, WhoAmIPlayer, PlayerColor, ChatMessage } from '@/lib/who-am-i/types'
import { COLOR_HEX } from '@/lib/who-am-i/types'
import { QRCodeSVG } from 'qrcode.react'

const ACCENT = '#f97316'

export default function WhoAmIRoom() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const uid = getGuestUid() ?? ''
  const myName = getGuestNickname() ?? ''

  const [room, setRoom] = useState<WhoAmIRoom | null>(null)
  const [players, setPlayers] = useState<WhoAmIPlayer[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [copied, setCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [starting, setStarting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r || r.status === 'finished') { router.replace('/who-am-i'); return }
      if (r.status === 'playing' || r.status === 'result') { router.replace(`/who-am-i/game/${code}`); return }
      setRoom(r)
      setPlayers(toPlayerList(r.players))
      setMessages(toMessageList(r.messages))
    })
    return unsub
  }, [code, router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const myPlayer = players.find(p => p.clientId === uid)
    await sendMessage(code, {
      clientId: uid,
      name: myName,
      color: myPlayer?.color ?? 'red',
      text: chatInput.trim(),
      timestamp: Date.now(),
      type: 'chat',
    })
    setChatInput('')
  }

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    await startGame(code)
  }

  if (!room) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>CONNECTING...</p>
        </div>
      </div>
    )
  }

  const isHost = room.hostClientId === uid
  const canStart = players.length >= 2

  return (
    <div className="cabinet">
      <div className="crt" />
      <div
        className="arc-screen"
        style={{ '--c': ACCENT, paddingTop: 0, paddingBottom: 24 } as React.CSSProperties}
      >
        {/* 헤더 */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)', borderBottom: '1px solid var(--line)',
          padding: '14px 0 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: ACCENT, letterSpacing: 1 }}>
                WHO AM I?
              </div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 10, color: 'var(--dim)', letterSpacing: 2, marginTop: 2 }}>
                대기실
              </div>
            </div>
            <button onClick={handleCopy} className="arc-btn-ghost" style={{ fontSize: 13, fontFamily: 'var(--f-pix)' }}>
              {copied ? '✓ 복사됨' : code}
            </button>
          </div>
        </div>

        {/* 방 코드 + QR */}
        <div className="arc-panel arc-rise" style={{ padding: '16px', textAlign: 'center', marginTop: 16, marginBottom: 14 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 코드</span>
          <div style={{
            fontFamily: 'var(--f-pix)', fontSize: 22, letterSpacing: 8,
            color: ACCENT, textShadow: `0 0 14px rgba(249,115,22,0.5)`, marginBottom: 12,
          }}>
            {code}
          </div>
          <div style={{
            display: 'inline-block', padding: 8, borderRadius: 10, background: '#fff',
            boxShadow: `0 0 18px rgba(249,115,22,0.2)`, marginBottom: 10,
          }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/who-am-i?code=${code}`}
              size={100}
              bgColor="#ffffff"
              fgColor="#1a0809"
              level="M"
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--faint)' }}>QR 스캔 또는 코드 공유</p>
        </div>

        {/* 참가자 목록 */}
        <div style={{ marginBottom: 14 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>
            참가자 ({players.length}/8)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.map(p => {
              const isMe = p.clientId === uid
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderColor: isMe ? `rgba(249,115,22,0.4)` : 'var(--line)',
                    background: isMe ? 'rgba(249,115,22,0.06)' : undefined,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_HEX[p.color], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: isMe ? ACCENT : 'var(--text-2)' }}>
                    {p.name}
                  </span>
                  {room.hostClientId === p.clientId && (
                    <span className="arc-badge" style={{ background: ACCENT, color: '#fff', fontSize: 10 }}>HOST</span>
                  )}
                  {isMe && <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>나</span>}
                </div>
              )
            })}
            {players.length < 2 && (
              <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 4 }}>
                최소 2명 필요 — 다른 플레이어가 참가하길 기다리는 중...
              </p>
            )}
          </div>
        </div>

        {/* 채팅 */}
        <div className="arc-panel" style={{ padding: '14px', marginBottom: 16 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>채팅</span>
          <div style={{
            height: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5,
            background: 'var(--surface)', borderRadius: 10, padding: '10px', marginBottom: 10,
          }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', margin: 'auto' }}>
                채팅으로 소통하세요
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
                {msg.type === 'system' ? (
                  <span style={{ color: 'var(--faint)', fontStyle: 'italic', fontSize: 12 }}>{msg.text}</span>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, color: COLOR_HEX[msg.color] }}>{msg.name}: </span>
                    <span style={{ color: 'var(--text-2)' }}>{msg.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder="채팅 입력..."
              className="arc-field"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button onClick={handleSendChat} disabled={!chatInput.trim()} className="arc-btn-ghost" style={{ flexShrink: 0 }}>
              전송
            </button>
          </div>
        </div>

        {/* 게임 시작 */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="arc-btn"
            style={{ background: canStart ? ACCENT : 'var(--surface-2)', fontSize: 17 }}
          >
            {starting ? 'LOADING...' : canStart ? '🎮 게임 시작!' : `최소 2명 필요 (현재 ${players.length}명)`}
          </button>
        ) : (
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)', textAlign: 'center' }}>
            호스트가 게임을 시작하길 기다리는 중...
          </p>
        )}

        <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
          WHO AM I? · ONLINE
        </p>
      </div>
    </div>
  )
}
