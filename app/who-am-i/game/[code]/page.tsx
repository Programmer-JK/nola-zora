'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGuestUid, getGuestNickname } from '@/lib/auth'
import {
  subscribeRoom, assignWord, submitAnswer, sendMessage, finishGame, closeRoom, resetRoom,
  toPlayerList, toMessageList, getPenaltySeconds,
} from '@/lib/who-am-i/firebase-game'
import type { WhoAmIRoom, WhoAmIPlayer, PlayerColor, ChatMessage } from '@/lib/who-am-i/types'
import { COLOR_HEX } from '@/lib/who-am-i/types'
import { CheckCircle2, Clock, Target, Timer } from 'lucide-react'

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
  const [shakeAnswer, setShakeAnswer] = useState(false)
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

  // 전원 정답 시 자동 결과 화면 전환
  useEffect(() => {
    if (room?.status !== 'playing') return
    if (players.length > 0 && players.every(p => p.solved)) {
      finishGame(code)
    }
  }, [players, room?.status, code])

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
  const isHost = room.hostClientId === uid
  const myPlayer = players.find(p => p.clientId === uid)

  // ── 단어 선정 페이즈 계산 ────────────────────────────────────
  // 순번 기반: players[assignedCount]이 타겟, players[(assignedCount+1)%n]이 단어 입력 담당
  const assignedCount = players.filter(p => p.assignedWord).length
  const allAssigned = n > 0 && assignedCount >= n
  const assignTarget = !allAssigned ? players[assignedCount] ?? null : null
  const assigner = assignTarget ? players[(assignedCount + 1) % n] ?? null : null
  const isMyTarget = assignTarget?.clientId === uid
  const isAssigner = assigner?.clientId === uid

  // ── 플레이 페이즈 계산 ─────────────────────────────────────────
  const isSolved = myPlayer?.solved ?? false
  const allSolved = n > 0 && players.every(p => p.solved)

  // ── 이벤트 핸들러 ────────────────────────────────────────────
  const handleAssignWord = async () => {
    if (!wordInput.trim() || wordSubmitting || !assignTarget || !isAssigner) return
    setWordSubmitting(true)
    await assignWord(code, assignTarget.clientId, wordInput.trim())
    await sendMessage(code, {
      clientId: 'system', name: 'SYSTEM', color: 'yellow' as PlayerColor,
      text: `${assignTarget.name}님의 단어가 선정되었습니다.`,
      timestamp: Date.now(), type: 'system',
    })
    setWordInput('')
    setWordSubmitting(false)
  }

  const triggerShake = () => {
    setShakeAnswer(true)
    setTimeout(() => setShakeAnswer(false), 580)
  }

  const handleSubmitAnswer = async () => {
    if (cooldown > 0) { triggerShake(); return }
    if (!answerInput.trim() || answerSubmitting || isSolved || !myPlayer) return
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
  }

  const handleReset = async () => {
    await resetRoom(code, room.players)
    // subscription이 status==='waiting'을 감지해 모든 클라이언트가 room 페이지로 이동
  }

  // ════════════════════════════════════════════════════════════
  // 페이즈 1: 단어 선정
  // ════════════════════════════════════════════════════════════
  if (!allAssigned) {
    // 현재 라운드 메시지만 표시 — 마지막 시스템 메시지 이후 채팅만
    const lastSystemIdx = messages.reduce((acc, m, i) => m.type === 'system' ? i : acc, -1)
    const currentRoundMessages = lastSystemIdx >= 0 ? messages.slice(lastSystemIdx + 1) : messages
    return (
      <div className="cabinet" style={{ height: '100dvh', overflow: 'hidden' }}>
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

          {/* 플레이어 목록 — 현재 단어 대상 강조 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {players.map((p, idx) => {
                const stepDone = idx < assignedCount
                const stepCurrent = idx === assignedCount
                const isNextAssigner = !stepDone && !stepCurrent && idx === (assignedCount + 1) % n
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
                    {stepCurrent && (
                      <span style={{ fontSize: 10, color: ACCENT, marginLeft: 4 }}>← 단어 선정 중</span>
                    )}
                    {isNextAssigner && (
                      <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 4 }}>← 단어 입력 담당</span>
                    )}
                    <span style={{ marginLeft: 'auto' }}>
                      {stepDone
                        ? <CheckCircle2 size={16} color="var(--green)" />
                        : stepCurrent
                          ? <Target size={16} color={ACCENT} />
                          : <Clock size={16} color="var(--faint)" />
                      }
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 중앙 영역 */}
          {isMyTarget ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 32 }}>🙈</span>
              <p style={{ fontSize: 13, color: 'var(--dim)', textAlign: 'center' }}>
                내 단어를 정하는 중...
              </p>
              <p className="pix blink" style={{ fontSize: 8, color: 'var(--faint)' }}>
                잠시만 기다려 주세요
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {currentRoundMessages.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 20 }}>
                  {isAssigner ? '채팅으로 상의 후 단어를 입력하세요' : '채팅으로 단어를 상의하세요'}
                </p>
              )}
              {currentRoundMessages.map(msg => {
                if (msg.type !== 'chat') {
                  return (
                    <div
                      key={msg.id}
                      style={{ textAlign: 'center', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontStyle: 'italic', background: 'var(--surface)', color: 'var(--faint)' }}
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
          )}

          {/* 하단 바 — 타겟 제외 전원 */}
          {!isMyTarget && (
            <div style={{ borderTop: '1px solid var(--line)', padding: '8px 16px 12px', background: 'var(--bg)', flexShrink: 0 }}>
              {isAssigner && assignTarget && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={wordInput}
                    onChange={e => setWordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAssignWord()}
                    maxLength={20}
                    placeholder={`${assignTarget.name}의 단어...`}
                    className="arc-field"
                    disabled={wordSubmitting}
                    style={{ flex: 1, borderColor: ACCENT, fontSize: 13 }}
                  />
                  <button
                    onClick={handleAssignWord}
                    disabled={!wordInput.trim() || wordSubmitting}
                    className="arc-btn"
                    style={{ background: ACCENT, flexShrink: 0, width: 64, fontSize: 13 }}
                  >
                    {wordSubmitting ? '...' : '선정'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendChat()}
                  placeholder="단어 상의..."
                  className="arc-field"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button onClick={handleSendChat} disabled={!chatInput.trim()} className="arc-btn-ghost" style={{ flexShrink: 0, width: 64 }}>
                  전송
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // 페이즈 2: 플레이
  // ════════════════════════════════════════════════════════════
  return (
    <div className="cabinet" style={{ height: '100dvh', overflow: 'hidden' }}>
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

        {/* 전원 정답 배너 — 자동으로 결과 화면 전환됨 */}
        {allSolved && (
          <div style={{
            background: 'rgba(126,217,87,0.12)', borderBottom: '1px solid rgba(126,217,87,0.3)',
            padding: '10px 16px', textAlign: 'center', flexShrink: 0,
          }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>🎉 모두 정답!</span>
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
                        ? <span style={{ fontFamily: 'var(--f-title)', fontSize: 14, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{p.assignedWord} <CheckCircle2 size={14} /></span>
                        : <span style={{ fontFamily: 'var(--f-pix)', fontSize: 11, color: 'var(--faint)', letterSpacing: 4 }}>???</span>
                      : <span style={{ fontFamily: 'var(--f-title)', fontSize: 14, color: p.solved ? 'var(--green)' : COLOR_HEX[p.color] }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {p.assignedWord}{p.solved ? <CheckCircle2 size={14} color="var(--green)" /> : null}
                          </span>
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
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendChat()}
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
            <div className={shakeAnswer ? 'dice-tray-shake' : ''}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
                    if (cooldown > 0) { triggerShake(); return }
                    handleSubmitAnswer()
                  }}
                  placeholder="정답 입력..."
                  className="arc-field"
                  disabled={answerSubmitting}
                  style={{ flex: 1, borderColor: ACCENT }}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={answerSubmitting || !answerInput.trim()}
                  className="arc-btn"
                  style={{ background: ACCENT, flexShrink: 0, width: 'auto', minWidth: 86, fontSize: 13 }}
                >
                  {answerSubmitting ? '...' : '정답 제출'}
                </button>
              </div>
              {cooldown > 0 && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(232,66,66,0.08)', border: '1px solid rgba(232,66,66,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Timer size={14} color="var(--red)" />
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>재시도까지</span>
                  <span style={{ fontFamily: 'var(--f-disp)', fontSize: 22, color: 'var(--red)', letterSpacing: 1, lineHeight: 1 }}>
                    {cooldown}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>초</span>
                </div>
              )}
              {myPlayer && myPlayer.wrongAttempts > 0 && (
                <div style={{ display: 'flex', marginTop: 6, gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>오답 {myPlayer.wrongAttempts}회</span>
                  <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>
                    다음 오답 시 {getPenaltySeconds(myPlayer.wrongAttempts + 1)}초 페널티
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 결과 모달 ── */}
        {room.status === 'result' && (() => {
          const sorted = [...players].sort((a, b) => {
            if (a.solved !== b.solved) return a.solved ? -1 : 1
            return a.wrongAttempts - b.wrongAttempts
          })
          const MEDALS = ['🥇', '🥈', '🥉']
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(8,6,14,0.82)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}>
              <div className="arc-rise" style={{
                width: '100%', maxWidth: 460,
                background: 'var(--surface)',
                border: '1.5px solid var(--line-2)',
                borderRadius: 20,
                padding: '24px 20px 20px',
                maxHeight: '88dvh',
                overflowY: 'auto',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: 40, marginBottom: 6 }}>🎉</div>
                  <div style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: ACCENT, letterSpacing: 1 }}>게임 종료</div>
                  <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 4 }}>WHO AM I? — RESULT</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {sorted.map((p, idx) => {
                    const isMe = p.clientId === uid
                    const medal = p.solved ? (MEDALS[idx] ?? `${idx + 1}.`) : '—'
                    return (
                      <div
                        key={p.clientId}
                        className="arc-panel-inset"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
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
                          <div style={{ fontSize: 12, marginTop: 2 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: p.solved ? 'var(--green)' : 'var(--faint)' }}>
                              {p.assignedWord}
                              {p.solved
                                ? <CheckCircle2 size={13} color="var(--green)" />
                                : <span> — 미해결</span>
                              }
                            </span>
                          </div>
                        </div>
                        {p.wrongAttempts > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>✗{p.wrongAttempts}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => router.replace('/who-am-i')}
                    className="arc-btn-ghost"
                    style={{ flex: 1 }}
                  >
                    로비로
                  </button>
                  {isHost ? (
                    <button
                      onClick={handleReset}
                      className="arc-btn"
                      style={{ flex: 1, background: ACCENT }}
                    >
                      다시하기
                    </button>
                  ) : (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'var(--faint)',
                    }}>
                      호스트 대기 중...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
