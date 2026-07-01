'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { logoutGuest } from '@/lib/auth'

const GAMES = [
  {
    id: 'liar',
    kr: '라이어 게임',
    latin: 'LIAR GAME',
    tag: 'PARTY GAME',
    emoji: '🕵️',
    accent: '#e84242',
    accentHex: '#e84242',
    players: '3–8인',
    kind: '소셜 디덕션',
    desc: '단어를 모르는 라이어를 찾아내라!\n거짓말쟁이를 꿰뚫어보는 눈치게임',
    href: '/liar',
  },
  {
    id: 'yacht',
    kr: '요트',
    latin: 'YACHT',
    tag: 'DICE GAME',
    emoji: '⛵',
    accent: 'var(--green)',
    accentHex: '#7ed957',
    players: '1–6인',
    kind: '주사위 족보',
    desc: '주사위 5개로 12가지 족보를 채워\n최고 합계를 기록하라',
    href: '/yacht',
  },
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
    id: 'who-am-i',
    kr: '나는 누구?',
    latin: 'WHO AM I?',
    tag: 'PARTY GAME',
    emoji: '🤔',
    accent: '#f97316',
    accentHex: '#f97316',
    players: '2–8인',
    kind: '소셜 추리',
    desc: '이마에 붙은 단어를 질문으로 추리하라!\n모두가 답할 수 있는 질문을 던져라',
    href: '/who-am-i',
  },
  {
    id: 'abra',
    kr: '아브라카왓',
    latin: 'ABRACA...WHAT?',
    tag: 'SPELL GAME',
    emoji: '🔮',
    accent: 'var(--violet)',
    accentHex: '#a274ff',
    players: '2–6인',
    kind: '마법 블러핑',
    desc: '숨겨진 타일을 추리하며 주문을 선언하고\n라이벌 마법사를 쓰러뜨려라',
    href: '/abra',
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
  {
    id: 'guryongtu',
    kr: '구룡투',
    latin: 'NINE DRAGONS DUEL',
    tag: '1v1 DUEL',
    emoji: '🐉',
    accent: '#ff3333',
    accentHex: '#ff3333',
    players: '2인',
    kind: '수비 전략',
    desc: '1~9 타일로 맞대결!\n1이 9를 이기는 용의 전략 싸움',
    href: '/guryongtu',
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
      <div style={{ height: 5, background: `linear-gradient(90deg, ${game.accentHex}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 18px' }}>
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
        {/* 상단 바 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              background: '#f3edcf', border: '1.5px solid rgba(255,255,255,.5)',
              boxShadow: '0 0 0 2px rgba(0,0,0,.35)',
            }}>
              <img src="/icon.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, lineHeight: 1.1 }}>놀아조라</div>
              <div className="pix neon-gold" style={{ fontSize: 7, letterSpacing: 1, marginTop: 2 }}>ARCADE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--dim)' }}>{nickname}</span>
            <button className="arc-btn-ghost" onClick={handleLogout} style={{ fontSize: 13, padding: '9px 14px' }}>
              로그아웃
            </button>
          </div>
        </div>

        {/* 히어로 */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '14px 0 24px' }}>
          <div className="arc-float" style={{ lineHeight: 1, marginBottom: 10 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, overflow: 'hidden', margin: '0 auto',
              background: '#f3edcf', border: '2.5px solid rgba(255,255,255,.7)',
              boxShadow: '0 0 0 3px rgba(0,0,0,.4), 0 12px 28px -8px rgba(0,0,0,.7), 0 0 32px -6px rgba(255,183,43,.35)',
            }}>
              <img src="/icon.png" alt="놀아조라" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--f-title)', fontSize: 38, margin: '10px 0 2px', color: 'var(--text)', lineHeight: 1, letterSpacing: 1 }}>
            놀아조라
          </h1>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 14, letterSpacing: 3 }} className="neon-gold">
            ARCADE
          </div>
          <div className="arc-chip" style={{ display: 'inline-flex', marginTop: 12, gap: 6 }}>
            <span style={{ fontSize: 14 }}>👋</span>
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{nickname}</span>
            <span style={{ color: 'var(--dim)' }}>님 어서오세요</span>
          </div>
        </div>

        {/* 게임 목록 레이블 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span className="arc-lbl" style={{ color: 'var(--gold)' }}>SELECT GAME</span>
          <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg, var(--line-2) 0 8px, transparent 8px 14px)' }} />
          <span className="pix" style={{ fontSize: 8, color: 'var(--faint)' }}>08</span>
        </div>

        {/* 게임 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GAMES.map((g, i) => (
            <div key={g.id} className="arc-rise" style={{ animationDelay: `${i * 0.08}s` }}>
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
