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
    <div style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>카테고리를 선택해 카드를 뽑으세요</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {CATEGORIES.map((cat, idx) => {
          const count = catCounts.get(idx) || 0
          const maxed = totalCards >= maxCards
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              disabled={maxed}
              style={{
                padding: '6px 12px', borderRadius: 20,
                border: `1.5px solid ${ACCENT_VARS[cat.colorIdx]}`,
                color: ACCENT_VARS[cat.colorIdx],
                background: count > 0 ? `${ACCENT_VARS[cat.colorIdx]}15` : 'transparent',
                cursor: maxed ? 'not-allowed' : 'pointer',
                opacity: maxed ? 0.4 : 1,
                fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {cat.name}
              {count > 0 && (
                <span style={{
                  background: ACCENT_VARS[cat.colorIdx], color: '#000',
                  borderRadius: '50%', width: 16, height: 16, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{totalCards} / {maxCards}장 뽑음</span>
        <div className="flex gap-2">
          <button
            onClick={onToggleInfinite}
            title="무한 모드"
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12,
              border: `1px solid ${infiniteActive ? 'var(--accent3)' : 'var(--border)'}`,
              background: infiniteActive ? 'var(--accent3)22' : 'transparent',
              color: infiniteActive ? 'var(--accent3)' : 'var(--text-dim)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <InfinityIcon size={12} /> 무한
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <RotateCcw size={12} /> 다시
          </button>
        </div>
      </div>
    </div>
  )
}
