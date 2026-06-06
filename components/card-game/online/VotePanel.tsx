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
  const eligible = memberCount - 1  // 버즈인 제외
  const canIVote = myUid !== buzzedUid && !myVote

  return (
    <div style={{
      padding: '16px', borderRadius: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
        어떻게 생각하나요?
      </div>

      {/* 투표 현황 */}
      <div className="flex gap-3 mb-3" style={{ justifyContent: 'center' }}>
        <VoteCount icon={<ThumbsUp size={14} color="var(--accent4)" />} count={yesCount} color="var(--accent4)" label="좋아요" />
        <VoteCount icon={<ThumbsDown size={14} color="var(--accent2)" />} count={noCount} color="var(--accent2)" label="별로" />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 12 }}>
        {totalVoted} / {eligible}명 투표 완료
      </div>

      {/* 내 투표 버튼 */}
      {myUid !== buzzedUid && (
        <div className="flex gap-2">
          <VoteBtn
            active={myVote === 'yes'}
            onClick={() => onVote('yes')}
            disabled={!!myVote}
            color="var(--accent4)"
            icon={<ThumbsUp size={16} />}
            label="좋아요!"
          />
          <VoteBtn
            active={myVote === 'no'}
            onClick={() => onVote('no')}
            disabled={!!myVote}
            color="var(--accent2)"
            icon={<ThumbsDown size={16} />}
            label="별로에요"
          />
        </div>
      )}

      {/* 호스트 결과 처리 */}
      {isHost && totalVoted >= eligible && (
        <button
          onClick={onResolve}
          style={{
            marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 8,
            border: '1px solid var(--accent1)', background: 'var(--accent1)20',
            color: 'var(--accent1)', cursor: 'pointer', fontSize: 13,
          }}
        >
          결과 반영 후 다음 라운드
        </button>
      )}
    </div>
  )
}

function VoteCount({ icon, count, color, label }: { icon: React.ReactNode; count: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 20, fontWeight: 700, color }}>{icon} {count}</div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</div>
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
        flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13,
        border: `1px solid ${active ? color : 'var(--border)'}`,
        background: active ? `${color}22` : 'transparent',
        color: active ? color : 'var(--text-dim)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
    >
      {icon}{label}
    </button>
  )
}
