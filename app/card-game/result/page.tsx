'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Star, Award } from 'lucide-react'

const RANK1_MSGS = ['전설의 등장', '누가 막겠어', '압도적 지배', '독보적 1위', '이미 끝났다']
const RANK2_MSGS = ['아슬아슬했는데...', '다음엔 꼭!', '0.1점 차이의 눈물', '2위도 충분히 멋져']
const RANK3_MSGS = ['3위도 영광이야!', '동메달도 금으로 보여', '곧 뒤집는다', '참을 수 없는 3위']
const RANK_MSGS = ['오늘만 이래...', '점수가 뭐야', '참가에 의미를', '다음 생엔 잘할게']

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
const getRankMsg = (rank: number) => {
  if (rank === 0) return pick(RANK1_MSGS)
  if (rank === 1) return pick(RANK2_MSGS)
  if (rank === 2) return pick(RANK3_MSGS)
  return pick(RANK_MSGS)
}

const ACCENT = ['var(--magenta)', 'var(--coin)', 'var(--cyan)', 'var(--violet)']

interface Member { name: string; score: number }

export default function ResultPage() {
  const router = useRouter()
  const [sorted, setSorted] = useState<Member[]>([])
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [msgs] = useState<string[]>([])
  const [allZero, setAllZero] = useState(false)
  const [subtext, setSubtext] = useState('')
  const [actionsVisible, setActionsVisible] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('results')
    if (!saved) { setActionsVisible(true); return }
    const raw: Member[] = JSON.parse(saved)
    if (raw.length === 0) { setActionsVisible(true); return }
    const s = [...raw].sort((a, b) => b.score - a.score)
    setSorted(s)
    const zero = s.every(m => m.score === 0)
    setAllZero(zero)
    const tie = s.length > 1 && s[0].score === s[1].score && !zero
    if (zero) setSubtext('점수가 없어요... 다들 괜찮으신가요?')
    else if (tie) setSubtext('공동 1위! 결판을 내야 해요 🔥')
    else setSubtext(`${s[0].name}의 완벽한 승리!`)

    const PER = 1400
    const n = s.length
    setRevealed(Array(n).fill(false))
    for (let rank = n - 1; rank >= 0; rank--) {
      const order = n - 1 - rank
      setTimeout(() => {
        setRevealed(prev => { const next = [...prev]; next[rank] = true; return next })
        if (rank === 0) {
          if (!zero) setTimeout(() => launchConfetti(), 600)
          setTimeout(() => setActionsVisible(true), 1600)
        }
      }, order * PER)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const launchConfetti = () => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const colors = ['#ff5da2', '#ffb72b', '#36e0cf', '#a274ff', '#ffd84d', '#7ed957']
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * -300,
      w: Math.random() * 9 + 4, h: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.18,
      vx: Math.random() * 2.5 - 1.2, vy: Math.random() * 3 + 2, opacity: 1,
    }))
    let elapsed = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      pieces.forEach(p => {
        p.angle += p.spin; p.y += p.vy; p.x += p.vx
        if (elapsed > 90) p.opacity = Math.max(0, p.opacity - 0.012)
        if (p.y < canvas.height + 20 && p.opacity > 0) alive = true
        ctx.save(); ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y); ctx.rotate(p.angle)
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      elapsed++
      if (alive && elapsed < 220) requestAnimationFrame(draw)
      else { canvas.style.transition = 'opacity 0.8s'; canvas.style.opacity = '0'; setTimeout(() => canvas.remove(), 800) }
    }
    draw()
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <main className="arc-screen">

        {/* 헤더 */}
        <div className="arc-pop" style={{ textAlign: 'center', padding: '32px 0 24px' }}>
          <div style={{ fontSize: 46, lineHeight: 1 }} className="arc-float">🏆</div>
          <h1
            className="neon-magenta"
            style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 1, margin: '10px 0 4px' }}
          >
            RESULT
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>결과 발표</div>
          {subtext && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{subtext}</div>
          )}
        </div>

        {/* 결과 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {sorted.length === 0 && (
            <div style={{ color: 'var(--dim)', textAlign: 'center', marginTop: 40 }}>결과 데이터가 없어요</div>
          )}
          {sorted.map((m, i) => {
            const maxScore = sorted[0]?.score || 1
            const pct = maxScore > 0 ? (m.score / maxScore) * 100 : 0
            const color = ACCENT[Math.min(i, 3)]
            return (
              <ResultItem
                key={i}
                member={m}
                rank={i}
                color={color}
                pct={pct}
                revealed={revealed[i] ?? false}
                msg={msgs[i] ?? getRankMsg(i)}
                allZero={allZero}
              />
            )
          })}
        </div>

        {/* 액션 버튼 */}
        {actionsVisible && (
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button
              onClick={() => { sessionStorage.removeItem('results'); router.push('/card-game') }}
              className="arc-btn-ghost"
              style={{ flex: 1, fontSize: 14 }}
            >
              처음으로
            </button>
            <button
              onClick={() => router.push('/card-game/game/local')}
              className="arc-btn arc-btn--magenta"
              style={{ flex: 1, fontSize: 14 }}
            >
              다시 하기
            </button>
          </div>
        )}

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
          BEST DESCRIPTION WINS · CHARACTER CARD
        </p>
      </main>
    </div>
  )
}

function ResultItem({ member, rank, color, pct, revealed, msg, allZero }: {
  member: Member; rank: number; color: string; pct: number
  revealed: boolean; msg: string; allZero: boolean
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const [showMsg, setShowMsg] = useState(false)

  useEffect(() => {
    if (!revealed) return
    setTimeout(() => {
      if (barRef.current && !allZero) barRef.current.style.width = `${pct}%`
      if (scoreRef.current) spinSettle(scoreRef.current, member.score)
    }, 200)
    setTimeout(() => setShowMsg(true), 1500)
  }, [revealed, pct, member.score, allZero])

  const isFirst = rank === 0

  return (
    <div
      className="arc-panel"
      style={{
        padding: '14px 16px',
        borderColor: revealed && isFirst ? color : 'var(--line)',
        boxShadow: revealed && isFirst ? `0 0 22px -6px ${color}` : 'none',
        transition: 'opacity 0.5s, transform 0.5s, border-color 0.5s, box-shadow 0.5s',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(20px)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
        {rank === 0 ? <Crown size={18} color="var(--magenta)" />
          : rank === 1 ? <Star size={18} color="var(--coin)" />
          : rank === 2 ? <Award size={18} color="var(--cyan)" />
          : <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--f-pix)' }}>{rank + 1}</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</span>
          <span ref={scoreRef} style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--f-disp)' }}>?</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div ref={barRef} className="result-bar" style={{ background: color, width: 0 }} />
        </div>
        {showMsg && (
          <div style={{ fontSize: 11, color: 'var(--dim)', transition: 'opacity 0.4s' }}>{msg}</div>
        )}
      </div>
    </div>
  )
}

function spinSettle(el: HTMLSpanElement, target: number) {
  if (target === 0) { setTimeout(() => { el.textContent = '0점' }, 400); return }
  const spinDur = 700, settleDur = 500
  const start = performance.now()
  function frame(now: number) {
    const t = now - start
    if (t < spinDur) {
      el.textContent = Math.floor(Math.random() * (target * 2 + 3)) + '점'
    } else {
      const p = Math.min((t - spinDur) / settleDur, 1)
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + '점'
      if (p >= 1) { el.textContent = target + '점'; return }
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
