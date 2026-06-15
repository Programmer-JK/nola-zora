'use client'

import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface Props {
  votingOpen: boolean
  myUid: string
  buzzedUid: string | null
  myVote: 'yes' | 'no' | null
  votes: Record<string, 'yes' | 'no'>
  memberCount: number
  onVote: (v: 'yes' | 'no') => void
  onResolve?: () => void
  isHost: boolean
}

export default function VotePanel({
  votingOpen, myUid, buzzedUid, myVote, votes, memberCount, onVote, onResolve, isHost,
}: Props) {
  if (!votingOpen || !buzzedUid) return null

  const yesCount = Object.values(votes).filter(v => v === 'yes').length
  const noCount = Object.values(votes).filter(v => v === 'no').length
  const totalVoted = yesCount + noCount
  const eligible = memberCount - 1

  return (
    <div className="arc-panel" style={{ padding: '14px 16px', borderColor: 'var(--magenta)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
        어떻게 생각하나요?
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 10 }}>
        <VoteCount icon={<ThumbsUp size={14} color="var(--green)" />} count={yesCount} color="var(--green)" label="좋아요" />
        <VoteCount icon={<ThumbsDown size={14} color="var(--red)" />} count={noCount} color="var(--red)" label="별로" />
      </div>

      <div className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginBottom: 12 }}>
        {totalVoted} / {eligible}명 투표 완료
      </div>

      {myUid !== buzzedUid && (
        <div style={{ display: 'flex', gap: 8 }}>
          <VoteBtn active={myVote === 'yes'} onClick={() => onVote('yes')} disabled={!!myVote} color="var(--green)" icon={<ThumbsUp size={15} />} label="좋아요!" />
          <VoteBtn active={myVote === 'no'} onClick={() => onVote('no')} disabled={!!myVote} color="var(--red)" icon={<ThumbsDown size={15} />} label="별로에요" />
        </div>
      )}

      {isHost && totalVoted >= eligible && (
        <button onClick={onResolve} className="arc-btn arc-btn--magenta" style={{ marginTop: 10, fontSize: 13, padding: '11px 0' }}>
          결과 반영 후 다음 라운드
        </button>
      )}
    </div>
  )
}

function VoteCount({ icon, count, color, label }: { icon: React.ReactNode; count: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 20, fontFamily: 'var(--f-disp)', color }}>{icon} {count}</div>
      <div style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</div>
    </div>
  )
}

function VoteBtn({ active, onClick, disabled, color, icon, label }: {
  active: boolean; onClick: () => void; disabled: boolean;
  color: string; icon: React.ReactNode; label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
        border: `1.5px solid ${active ? color : 'var(--line-2)'}`,
        background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : 'transparent',
        color: active ? color : 'var(--dim)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {icon}{label}
    </button>
  )
}
