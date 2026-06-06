'use client'

import { X, Sparkle } from 'lucide-react'
import { CATEGORIES } from '@/lib/card-game/game-data'
import GameIcon from './GameIcon'

const ACCENT_VARS = [
  'var(--accent1)', 'var(--accent2)', 'var(--accent3)',
  'var(--accent4)', 'var(--accent5)', 'var(--accent6)',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function GuideOverlay({ open, onClose }: Props) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 overflow-y-auto ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      style={{ background: 'rgba(0,0,0,0.85)', padding: '20px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ maxWidth: 700, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, padding: '24px 20px' }}>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 20 }}>카드 도감</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>
        <div className="flex flex-col gap-8">
          {CATEGORIES.map((cat, cIdx) => (
            <div key={cIdx}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkle size={16} color={ACCENT_VARS[cat.colorIdx]} />
                <span style={{ fontWeight: 600, color: ACCENT_VARS[cat.colorIdx] }}>{cat.name}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>{cat.desc}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                {cat.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      background: 'var(--bg)', borderRadius: 10, padding: '10px 8px',
                      border: `1px solid ${ACCENT_VARS[cat.colorIdx]}33`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <GameIcon name={item.icon} size={18} color={ACCENT_VARS[cat.colorIdx]} />
                    <div style={{ fontSize: 12, fontWeight: 500, textAlign: 'center' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
