'use client'

import { useEffect, useRef } from 'react'
import { DrawnCard } from '@/lib/card-game/game-logic'
import GameIcon from './GameIcon'

const ACCENT_VARS = [
  'var(--accent1)', 'var(--accent2)', 'var(--accent3)',
  'var(--accent4)', 'var(--accent5)', 'var(--accent6)',
]
const ACCENT_HEX = ['#e8c97a', '#c96a8f', '#6a9fc9', '#8fc96a', '#c9906a', '#a06ac9']

interface Props {
  card: DrawnCard
  index: number
  rotation?: number
  autoFlip?: boolean
}

export default function CardItem({ card, index, rotation, autoFlip = true }: Props) {
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoFlip) return
    const delay = rotation !== undefined ? 50 : 150 + index * 100
    const t = setTimeout(() => innerRef.current?.classList.add('flipped'), delay)
    return () => clearTimeout(t)
  }, [autoFlip, index, rotation])

  const color = ACCENT_VARS[card.colorIdx % ACCENT_VARS.length]
  const colorHex = ACCENT_HEX[card.colorIdx % ACCENT_HEX.length]
  const wrapStyle: React.CSSProperties = rotation !== undefined
    ? ({ '--card-rot': `${rotation}deg`, '--card-color': colorHex } as React.CSSProperties)
    : ({ '--card-color': colorHex } as React.CSSProperties)

  return (
    <div
      className={`card-wrap${rotation !== undefined ? ' genre-card entering' : ''}`}
      style={wrapStyle as React.CSSProperties}
    >
      <div className="card-inner" ref={innerRef}>
        <div className="card-face card-back"><span>?</span></div>
        <div className="card-face card-front" style={{ color }}>
          <div className="cat-bar" style={{ background: color }} />
          <div className="card-body">
            <div className="card-cat-name">{card.catName}</div>
            <GameIcon name={card.itemIcon} size={32} color={color} />
            <div className="card-name">{card.itemName}</div>
            <div className="card-desc">{card.itemDesc}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
