'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { logoutGuest } from '@/lib/auth'

const GAMES = [
  {
    id: 'las-vegas',
    kr: '라스베가스',
    latin: 'LAS VEGAS',
    tag: 'THE DICE GAME',
    emoji: '🎲',
    accent: 'var(--gold)',
    accentHex: '#ffb72b',
    players: '2–6인',
    kind: '주사위 전략',
    desc: '카지노에 주사위를 배치해\n가장 많은 돈을 쓸어담아라',
    href: '/las-vegas',
  },
  {
    id: 'card-game',
    kr: '캐릭터 카드',
    latin: 'CHARACTER CARD',
    tag: 'PARTY GAME',
    emoji: '🃏',
    iconSrc: '/charater-association.svg',
    accent: 'var(--magenta)',
    accentHex: '#ff5da2',
    players: '2인+',
    kind: '파티 카드',
    desc: '무작위 카드를 조합해\n나만의 캐릭터를 만들어 설명하라',
    href: '/card-game',
  },
  {
    id: 'modern-art',
    kr: '모던 아트',
    latin: 'MODERN ART',
    tag: 'AUCTION GAME',
    emoji: '🎨',
    accent: 'var(--cyan)',
    accentHex: '#36e0cf',
    players: '2–5인',
    kind: '경매 전략',
    desc: '작가의 작품을 경매로 사고팔아\n최고의 자산가가 되어라',
    href: '/modern-art',
  },
]

function GameCard({ game, onPick }: { game: (typeof GAMES)[number]; onPick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="arc-panel arc-rise"
      style={{
        textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden', width: '100%',
        borderColor: hover ? game.accentHex : 'var(--line)',
        boxShadow: hover ? `0 0 0 1px ${game.accentHex}, 0 14px 30px -10px ${game.accentHex}` : 'none',
        transition: 'box-shadow .2s, border-color .2s, transform .12s',
        transform: hover ? 'translateY(-3px)' : 'none',
      }}
    >
      {/* accent top edge */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${game.accentHex}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 18px' }}>
        {/* emoji token */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34,
          background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${game.accentHex} 28%, var(--surface-2)) 0%, var(--surface) 100%)`,
          border: `1.5px solid color-mix(in srgb, ${game.accentHex} 45%, transparent)`,
          boxShadow: `inset 0 0 18px -6px ${game.accentHex}`,
          transform: hover ? 'scale(1.08) rotate(-4deg)' : 'none',
          transition: 'transform .2s',
        }}>
          {'iconSrc' in game
            ? <img src={game.iconSrc} width={42} height={42} alt="" style={{ display: 'block' }} />
            : game.emoji
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', whiteSpace: 'nowrap' }}>{game.kr}</span>
            <span className="arc-badge" style={{ background: game.accentHex }}>{game.tag}</span>
          </div>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 10, letterSpacing: 1.5, color: game.accentHex, marginTop: 5 }}>{game.latin}</div>
          <p style={{ color: 'var(--dim)', fontSize: 12.5, margin: '8px 0 0', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{game.desc}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <span className="arc-chip" style={{ fontSize: 11, padding: '4px 9px' }}>👥 {game.players}</span>
            <span className="arc-chip" style={{ fontSize: 11, padding: '4px 9px' }}>🎯 {game.kind}</span>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--f-pix)', fontSize: 13, color: game.accentHex,
          transform: hover ? 'translateX(4px)' : 'none', transition: 'transform .2s',
          textShadow: `0 0 12px ${game.accentHex}`,
          flexShrink: 0,
        }}>▶</div>
      </div>
    </button>
  )
}

export default function LobbyPage() {
  const router = useRouter()
  const { nickname } = useAuth()

  function handleLogout() {
    logoutGuest()
    router.push('/')
  }

  return (
    <div className="cabinet">
      <div className="crt" />

      <div className="arc-screen">
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, overflow: 'hidden',
              background: '#f3edcf', border: '2px solid rgba(255,255,255,.6)',
              boxShadow: '0 0 0 2px rgba(0,0,0,.4)', flexShrink: 0,
            }}>
              <img src="/icon.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 23, lineHeight: 1.1 }}>놀아조라</div>
              <div className="pix" style={{ fontSize: 7.5, color: 'var(--gold)', marginTop: 6, letterSpacing: 1 }}>ARCADE</div>
            </div>
          </div>
          <button className="arc-btn-ghost" onClick={handleLogout} style={{ fontSize: 13, padding: '9px 14px' }}>
            로그아웃
          </button>
        </header>

        {/* Welcome chip */}
        <div className="arc-chip" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          <span style={{ fontSize: 15 }}>👋</span>
          <span style={{ color: 'var(--text)' }}>{nickname}</span>
          <span style={{ color: 'var(--dim)' }}>님 어서오세요</span>
        </div>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 14px' }}>
          <span className="arc-lbl" style={{ color: 'var(--gold)' }}>SELECT GAME</span>
          <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg, var(--line-2) 0 8px, transparent 8px 14px)' }} />
          <span className="pix" style={{ fontSize: 8, color: 'var(--faint)' }}>03</span>
        </div>

        {/* Game cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GAMES.map((g, i) => (
            <div key={g.id} style={{ animationDelay: `${i * 0.08}s` }}>
              <GameCard game={g} onPick={() => router.push(g.href)} />
            </div>
          ))}
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 30, lineHeight: 1.8 }}>
          INSERT COIN · CHOOSE YOUR GAME · HAVE FUN
        </p>
      </div>
    </div>
  )
}
