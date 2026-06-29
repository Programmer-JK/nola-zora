'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGuestUid, getGuestNickname } from '@/lib/auth'
import {
  subscribeRoom, assignWord, submitAnswer, sendMessage, finishGame, closeRoom,
  toPlayerList, toMessageList, getPenaltySeconds,
} from '@/lib/who-am-i/firebase-game'
import type { WhoAmIRoom, WhoAmIPlayer, PlayerColor, ChatMessage } from '@/lib/who-am-i/types'
import { COLOR_HEX } from '@/lib/who-am-i/types'

const ACCENT = '#f97316'

export default function WhoAmIGame() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const uid = getGuestUid() ?? ''
  const myName = getGuestNickname() ?? ''

  const [room, setRoom] = useState<WhoAmIRoom | null>(null)
  const [players, setPlayers] = useState<WhoAmIPlayer[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [wordInput, setWordInput] = useState('')
  const [wordSubmitting, setWordSubmitting] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [answerSubmitting, setAnswerSubmitting] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeRoom(code, r => {
      if (!r || r.status === 'finished') { router.replace('/who-am-i'); return }
      if (r.status === 'waiting') { router.replace(`/who-am-i/room/${code}`); return }
      setRoom(r)
      const ps = toPlayerList(r.players)
      setPlayers(ps)
      setMessages(toMessageList(r.messages))
      const me = ps.find(p => p.clientId === uid)
      if (me && me.nextAttemptAt > Date.now()) {
        setCooldown(Math.ceil((me.nextAttemptAt - Date.now()) / 1000))
      } else {
        setCooldown(0)
      }
    })
    return unsub
  }, [code, router, uid])

  // 쿨다운 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // 채팅 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // ── 공통 계산 ──────────────────────────────────────────────────
  const n = players.length
  const assignedCount = players.filter(p => p.assignedWord).length
  const allAssigned = assignedCount >= n && n > 0
  const isHost = room.hostClientId === uid
  const myPlayer = players.find(p => p.clientId === uid)

  // ── 단어 선정 페이즈 계산 ────────────────────────────────────
  // players[i] → players[(i+1) % n] 순서로 단어 선정
  const currentAssigner = !allAssigned ? players[assignedCount] ?? null : null
  const assignTarget = currentAssigner ? players[(assignedCount + 1) % n] ?? null : null
  const isMyAssignTurn = currentAssigner?.clientId === uid

  // ── 플레이 페이즈 계산 ─────────────────────────────────────────
  const isSolved = myPlayer?.solved ?? false
  const allSolved = n > 0 && players.every(p => p.solved)

  // ── 이벤트 핸들러 ────────────────────────────────────────────
  const handleAssignWord = async () => {
    if (!wordInput.trim() || wordSubmitting || !currentAssigner || !assignTarget) return
    setWordSubmitting(true)
    await assignWord(code, assignTarget.clientId, wordInput.trim())
    await sendMessage(code, {
      clientId: 'system', name: 'SYSTEM', color: 'yellow' as PlayerColor,
      text: `${currentAssigner.name}님이 ${assignTarget.name}님의 단어를 선정했습니다.`,
      timestamp: Date.now(), type: 'system',
    })
    setWordInput('')
    setWordSubmitting(false)
  }

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || answerSubmitting || cooldown > 0 || isSolved || !myPlayer) return
    setAnswerSubmitting(true)
    const correct = answerInput.trim().toLowerCase() === myPlayer.assignedWord.toLowerCase()
    await submitAnswer(code, uid, correct, myPlayer.wrongAttempts)
    await sendMessage(code, {
      clientId: 'system', name: 'SYSTEM', color: 'yellow' as PlayerColor,
      text: correct
        ? `🎉 ${myName}님이 정답을 맞혔습니다! (${myPlayer.assignedWord})`
        : `❌ ${myName}님이 오답을 입력했습니다.`,
      timestamp: Date.now(), type: correct ? 'correct' : 'wrong',
    })
    if (!correct) {
      const penalty = getPenaltySeconds(myPlayer.wrongAttempts + 1)
      if (penalty > 0) setCooldown(penalty)
    }
    setAnswerInput('')
    setAnswerSubmitting(false)
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    await sendMessage(code, {
      clientId: uid, name: myName, color: myPlayer?.color ?? 'red',
      text: chatInput.trim(), timestamp: Date.now(), type: 'chat',
    })
    setChatInput('')
  }

  const handleFinish = async () => {
    await finishGame(code)
    // subscription이 status==='result'를 감지해 모든 클라이언트가 결과 화면으로 이동
  }

  const handleCloseRoom = async () => {
    await closeRoom(code)
    // subscription이 status==='finished'를 감지해 모든 클라이언트가 로비로 이동
  }

  // ════════════════════════════════════════════════════════════
  // 페이즈 3: 결과
  // ════════════════════════════════════════════════════════════
  if (room.status === 'result') {
    const sorted = [...players].sort((a, b) => {
      if (a.solved !== b.solved) return a.solved ? -1 : 1
      return a.wrongAttempts - b.wrongAttempts
    })
    const MEDALS = ['🥇', '🥈', '🥉']

    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <div style={{ padding: '18px 0 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 18, color: ACCENT, letterSpacing: 1 }}>결과</div>
            <div className="pix" style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4 }}>WHO AM I? — RESULT</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            {sorted.map((p, idx) => {
              const isMe = p.clientId === uid
              const medal = p.solved ? (MEDALS[idx] ?? `${idx + 1}.`) : '—'
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 6,
                    borderColor: isMe ? `rgba(249,115,22,0.4)` : 'var(--line)',
                    background: isMe ? 'rgba(249,115,22,0.06)' : undefined,
                  }}
                >
                  <span style={{ fontSize: 18, width: 28, flexShrink: 0, textAlign: 'center' }}>{medal}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_HEX[p.color], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: isMe ? ACCENT : 'var(--text-2)' }}>
                      {p.name}{isMe ? ' (나)' : ''}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2, color: p.solved ? 'var(--green)' : 'var(--faint)' }}>
                      {p.assignedWord}{p.solved ? ' ✅' : ' — 미해결'}
                    </div>
                  </div>
                  {p.wrongAttempts > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>✗{p.wrongAttempts}</span>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => router.replace('/who-am-i')}
            className="arc-btn-ghost"
            style={{ width: '100%', marginBottom: isHost ? 10 : 0 }}
          >
            로비로
          </button>
          {isHost && (
            <button
              onClick={handleCloseRoom}
              className="arc-btn"
              style={{ background: 'var(--surface-2)', width: '100%', fontSize: 13, color: 'var(--faint)' }}
            >
              방 닫기 (모두 종료)
            </button>
          )}

          <p className="pix" style={{ fontSize: 7.5, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
            WHO AM I? · ONLINE
          </p>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // 페이즈 1: 단어 선정
  // ════════════════════════════════════════════════════════════
  if (!allAssigned) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div
          className="arc-screen"
          style={{
            '--c': ACCENT, padding: 0,
            display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden',
          } as React.CSSProperties}
        >
          {/* 헤더 */}
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: ACCENT, letterSpacing: 1 }}>WHO AM I?</div>
                <div style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: 'var(--dim)', letterSpacing: 1.5, marginTop: 2 }}>
                  단어 선정 중 — {assignedCount}/{n}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: n }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < assignedCount ? 'var(--green)' : i === assignedCount ? ACCENT : 'var(--line)',
                      transition: 'background .3s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 플레이어 순서 목록 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {players.map((p, i) => {
                const target = players[(i + 1) % n]
                const stepDone = i < assignedCount
                const stepCurrent = i === assignedCount
                return (
                  <div
                    key={p.clientId}
                    className="arc-panel-inset"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderColor: stepCurrent ? ACCENT : 'var(--line)',
                      background: stepCurrent ? `rgba(249,115,22,0.06)` : undefined,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_HEX[p.color], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: stepCurrent ? ACCENT : stepDone ? 'var(--faint)' : 'var(--text-2)' }}>
                      {p.name}{p.clientId === uid ? ' (나)' : ''}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 2 }}>→ {target?.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 14 }}>
                      {stepDone ? '✅' : stepCurrent ? '✏️' : '⏳'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 입력 패널 */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            {isMyAssignTurn && assignTarget ? (
              <div
                className="arc-panel"
                style={{ padding: '14px', borderColor: ACCENT, boxShadow: `0 0 0 1.5px ${ACCENT}, 0 0 18px -6px ${ACCENT}` }}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>✏️ 내 차례!</p>
                <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 10 }}>
                  <span style={{ color: COLOR_HEX[assignTarget.color], fontWeight: 700 }}>{assignTarget.name}</span>
                  님의 이마에 붙일 단어를 입력하세요
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={wordInput}
                    onChange={e => setWordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAssignWord()}
                    maxLength={20}
                    placeholder={`${assignTarget.name}의 단어...`}
                    className="arc-field"
                    disabled={wordSubmitting}
                    style={{ flex: 1, borderColor: ACCENT }}
                    autoFocus
                  />
                  <button
                    onClick={handleAssignWord}
                    disabled={!wordInput.trim() || wordSubmitting}
                    className="arc-btn"
                    style={{ background: ACCENT, flexShrink: 0 }}
                  >
                    {wordSubmitting ? '...' : '선정'}
                  </button>
                </div>
              </div>
            ) : currentAssigner && assignTarget ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  <span style={{ color: COLOR_HEX[currentAssigner.color] }}>{currentAssigner.name}</span>님 차례
                </p>
                <p className="pix blink" style={{ fontSize: 8, color: 'var(--dim)' }}>
                  {assignTarget.name}님의 단어를 입력 중...
                </p>
              </div>
            ) : null}
          </div>

          {/* 채팅 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 16 }}>
                단어를 협의하세요
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
                {msg.type === 'system' ? (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', fontStyle: 'italic', padding: '2px 0' }}>
                    {msg.text}
                  </div>
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

          {/* 채팅 입력 */}
          <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px', background: 'var(--bg)', flexShrink: 0 }}>
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
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // 페이즈 2: 플레이
  // ════════════════════════════════════════════════════════════
  return (
    <div className="cabinet">
      <div className="crt" />
      <div
        className="arc-screen"
        style={{
          '--c': ACCENT, padding: 0,
          display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* 헤더 */}
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 14, color: ACCENT, letterSpacing: 1 }}>WHO AM I?</div>
            {isHost && (
              <button onClick={handleFinish} className="arc-btn-ghost" style={{ fontSize: 12, color: 'var(--faint)' }}>
                게임 종료
              </button>
            )}
          </div>
        </div>

        {/* 전원 정답 배너 */}
        {allSolved && (
          <div style={{
            background: 'rgba(126,217,87,0.12)', borderBottom: '1px solid rgba(126,217,87,0.3)',
            padding: '10px 16px', textAlign: 'center', flexShrink: 0,
          }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>🎉 모두 정답!</span>
            {isHost && (
              <button onClick={handleFinish} className="arc-btn-ghost" style={{ fontSize: 12, marginLeft: 12 }}>
                결과 확인 후 종료
              </button>
            )}
          </div>
        )}

        {/* 이마의 단어 목록 */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 6 }}>이마의 단어</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {players.map(p => {
              const isMe = p.clientId === uid
              return (
                <div
                  key={p.clientId}
                  className="arc-panel-inset"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderColor: isMe ? `rgba(249,115,22,0.4)` : 'var(--line)',
                    background: isMe ? 'rgba(249,115,22,0.06)' : undefined,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_HEX[p.color], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: isMe ? ACCENT : 'var(--text-2)', minWidth: 56 }}>
                    {p.name}{isMe ? ' (나)' : ''}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {isMe
                      ? p.solved
                        ? <span style={{ fontFamily: 'var(--f-title)', fontSize: 14, color: 'var(--green)' }}>{p.assignedWord} ✅</span>
                        : <span style={{ fontFamily: 'var(--f-pix)', fontSize: 11, color: 'var(--faint)', letterSpacing: 4 }}>???</span>
                      : <span style={{ fontFamily: 'var(--f-title)', fontSize: 14, color: p.solved ? 'var(--green)' : COLOR_HEX[p.color] }}>
                          {p.assignedWord}{p.solved ? ' ✅' : ''}
                        </span>
                    }
                  </span>
                  {!isMe && p.wrongAttempts > 0 && !p.solved && (
                    <span style={{ fontSize: 10, color: 'var(--faint)', marginLeft: 4 }}>✗{p.wrongAttempts}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 채팅 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {messages.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
              채팅으로 질문하세요! (예: "저는 동물인가요?")
            </p>
          )}
          {messages.map(msg => {
            const isSpecial = msg.type !== 'chat'
            if (isSpecial) {
              return (
                <div
                  key={msg.id}
                  style={{
                    textAlign: 'center', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontStyle: 'italic',
                    background: msg.type === 'correct' ? 'rgba(126,217,87,0.1)' : msg.type === 'wrong' ? 'rgba(232,66,66,0.08)' : 'var(--surface)',
                    color: msg.type === 'correct' ? 'var(--green)' : msg.type === 'wrong' ? 'var(--red)' : 'var(--faint)',
                  }}
                >
                  {msg.text}
                </div>
              )
            }
            return (
              <div key={msg.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: COLOR_HEX[msg.color] }}>{msg.name}: </span>
                <span style={{ color: 'var(--text-2)' }}>{msg.text}</span>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 하단 입력 영역 */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 16px 14px', background: 'var(--bg)', flexShrink: 0 }}>
          {/* 채팅 입력 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder="질문하기... (예: 저는 동물인가요?)"
              className="arc-field"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button onClick={handleSendChat} disabled={!chatInput.trim()} className="arc-btn-ghost" style={{ flexShrink: 0 }}>
              전송
            </button>
          </div>

          {/* 정답 입력 */}
          {isSolved ? (
            <div style={{ textAlign: 'center', padding: '11px', background: 'rgba(126,217,87,0.1)', borderRadius: 12, border: '1px solid rgba(126,217,87,0.3)' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>🎉 정답! — {myPlayer?.assignedWord}</span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !cooldown && handleSubmitAnswer()}
                  placeholder="정답 입력..."
                  className="arc-field"
                  disabled={cooldown > 0 || answerSubmitting}
                  style={{ flex: 1, borderColor: cooldown > 0 ? 'var(--line)' : ACCENT }}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={cooldown > 0 || answerSubmitting || !answerInput.trim()}
                  className="arc-btn"
                  style={{ background: cooldown > 0 ? 'var(--surface-2)' : ACCENT, flexShrink: 0, minWidth: 86, fontSize: 13 }}
                >
                  {cooldown > 0 ? `${cooldown}초` : answerSubmitting ? '...' : '정답 제출'}
                </button>
              </div>
              {myPlayer && myPlayer.wrongAttempts > 0 && (
                <div style={{ display: 'flex', marginTop: 6, gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>오답 {myPlayer.wrongAttempts}회</span>
                  {cooldown > 0 && <span style={{ fontSize: 11, color: 'var(--red)' }}>· {cooldown}초 후 재시도</span>}
                  <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>
                    다음 오답 시 {getPenaltySeconds(myPlayer.wrongAttempts + 1)}초 페널티
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
