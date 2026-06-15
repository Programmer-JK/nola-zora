'use client'

import { CATEGORIES } from '@/lib/card-game/game-data'
import { RotateCcw, Infinity as InfinityIcon } from 'lucide-react'

const ACCENT_VARS = [
  'var(--accent1)', 'var(--accent2)', 'var(--accent3)',
  'var(--accent4)', 'var(--accent5)', 'var(--accent6)',
]

interface Props {
  catCounts: Map<number, number>
  totalCards: number
  maxCards: number
  infiniteActive: boolean
  onSelect: (catIdx: number) => void
  onReset: () => void
  onToggleInfinite: () => void
}

export default function CategorySelector({
  catCounts, totalCards, maxCards, infiniteActive, onSelect, onReset, onToggleInfinite,
}: Props) {
  return (
    <div className="arc-panel-inset" style={{ padding: '14px 16px' }}>
      <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 12, display: 'block' }}>
        CATEGORY SELECT
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {CATEGORIES.map((cat, idx) => {
          const count = catCounts.get(idx) || 0
          const maxed = totalCards >= maxCards
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              disabled={maxed}
              style={{
                padding: '7px 13px', borderRadius: 20,
                border: `1.5px solid ${count > 0 ? ACCENT_VARS[cat.colorIdx] : 'var(--line-2)'}`,
                color: count > 0 ? ACCENT_VARS[cat.colorIdx] : 'var(--dim)',
                background: count > 0 ? `color-mix(in srgb, ${ACCENT_VARS[cat.colorIdx]} 14%, transparent)` : 'transparent',
                cursor: maxed ? 'not-allowed' : 'pointer',
                opacity: maxed ? 0.4 : 1,
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'all .15s',
              }}
            >
              {cat.name}
              {count > 0 && (
                <span style={{
                  background: ACCENT_VARS[cat.colorIdx], color: '#000',
                  borderRadius: '50%', width: 17, height: 17, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="pix" style={{ fontSize: 8, color: 'var(--faint)' }}>
          {totalCards} / {maxCards}장 뽑음
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggleInfinite}
            style={{
              padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${infiniteActive ? 'var(--magenta)' : 'var(--line-2)'}`,
              background: infiniteActive ? 'color-mix(in srgb, var(--magenta) 14%, transparent)' : 'transparent',
              color: infiniteActive ? 'var(--magenta)' : 'var(--dim)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s',
            }}
          >
            <InfinityIcon size={12} /> 무한
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: '1.5px solid var(--line-2)', background: 'transparent',
              color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all .15s',
            }}
          >
            <RotateCcw size={12} /> 다시
          </button>
        </div>
      </div>
    </div>
  )
}
