'use client'

import { Crown, X } from 'lucide-react'

export interface Member {
  name: string
  score: number
}

interface Props {
  members: Member[]
  open: boolean
  onClose: () => void
  onAdd: (idx: number) => void
  onRemove: (idx: number) => void
  onReset: () => void
  onEnd: () => void
}

export default function ScoreDrawer({ members, open, onClose, onAdd, onRemove, onReset, onEnd }: Props) {
  const maxScore = members.length > 0 ? Math.max(...members.map(m => m.score)) : 0

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-40 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 260, background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '20px 16px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: 'var(--font-jua), sans-serif', fontSize: 16, color: 'var(--accent1)' }}>점수판</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {members.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>플레이어가 없어요</div>
          ) : (
            members.map((m, i) => {
              const isTop = m.score > 0 && m.score === maxScore
              return (
                <div key={i} className="flex items-center gap-2" style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: 14, color: isTop ? 'var(--accent1)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {m.name}
                    {isTop && <Crown size={13} color="var(--accent1)" />}
                  </span>
                  <span style={{ fontSize: 14, minWidth: 24, textAlign: 'center' }}>{m.score}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onRemove(i)} style={btnStyle('#555')}>−</button>
                    <button onClick={() => onAdd(i)} style={btnStyle('var(--accent3)')}>+</button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button onClick={onReset} style={actionBtn('var(--text-dim)')}>점수 초기화</button>
          <button onClick={onEnd} style={actionBtn('var(--accent2)')}>게임 종료</button>
        </div>
      </div>
    </>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  width: 26, height: 26, borderRadius: 6, border: 'none', background: bg,
  color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
})

const actionBtn = (color: string): React.CSSProperties => ({
  padding: '8px 0', borderRadius: 8, border: `1px solid ${color}`, background: 'transparent',
  color, cursor: 'pointer', fontSize: 13, width: '100%',
})
