'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import { ChatMessage, sendChatMessage, subscribeChatAdded } from '@/lib/card-game/firebase-game'

interface Props {
  roomId: string
  uid: string
  myName: string
}

export default function ChatPanel({ roomId, uid, myName }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeChatAdded(roomId, msg => {
      setMessages(prev => [...prev, msg])
      if (!open) setUnread(n => n + 1)
    })
    return unsub
  }, [roomId, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    await sendChatMessage(roomId, uid, myName, t)
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* 채팅 FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 40,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--accent3)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <MessageCircle size={22} color="#fff" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent2)', color: '#fff',
            borderRadius: '50%', width: 18, height: 18, fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* 채팅 패널 */}
      <div
        style={{
          position: 'fixed', bottom: 0, right: 0, zIndex: 50,
          width: 'min(320px, 100vw)',
          height: 420,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRadius: '16px 0 0 0',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>채팅</span>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* 메시지 목록 */}
        <div className="chat-messages flex-1 overflow-y-auto" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>아직 대화가 없어요</div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: msg.uid === uid ? 'row-reverse' : 'row',
                gap: 6, alignItems: 'flex-end',
              }}
            >
              {msg.uid !== uid && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', marginBottom: 2 }}>{msg.name}</div>
              )}
              <div
                style={{
                  maxWidth: '70%', padding: '6px 10px', fontSize: 13,
                  borderRadius: msg.uid === uid ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                  background: msg.uid === uid ? 'var(--accent3)33' : 'rgba(255,255,255,0.06)',
                  wordBreak: 'break-word',
                }}
              >
                {msg.uid !== uid && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>{msg.name}</div>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지 입력..."
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={send}
            style={{
              padding: '8px 10px', borderRadius: 8, border: 'none',
              background: 'var(--accent3)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>
    </>
  )
}
