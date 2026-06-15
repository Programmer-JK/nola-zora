'use client'

import { Crown, Copy, Check, Infinity as InfinityIcon, Link, Image } from 'lucide-react'
import CharacterIcon from '@/components/card-game/CharacterIcon'
import { useState } from 'react'
import { RoomMeta, RoomMember } from '@/lib/card-game/firebase-game'

interface Props {
  roomId: string
  meta: RoomMeta
  members: Record<string, RoomMember>
  myUid: string
  onStart: () => void
  onModeChange: (mode: 'basic' | 'genre') => void
  onInfiniteChange: (v: boolean) => void
  onTimerChange: (seconds: number) => void
  onImageSearchChange: (v: boolean) => void
}

const TIMER_OPTIONS = [
  { label: '없음', value: 0 },
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '90초', value: 90 },
]

const magSeg: React.CSSProperties = {
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--magenta) 92%, #fff), var(--magenta))',
  color: '#fff',
  boxShadow: '0 3px 0 0 var(--magenta-lo)',
}

export default function LobbyWaiting({ roomId, meta, members, myUid, onStart, onModeChange, onInfiniteChange, onTimerChange, onImageSearchChange }: Props) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const isHost = meta.host === myUid
  const memberList = Object.entries(members)

  const copyCode = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/card-game/game/${roomId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <main className="arc-screen">

        {/* Title */}
        <div className="arc-pop" style={{ textAlign: 'center', padding: '28px 0 20px' }}>
          <div className="arc-float" style={{ lineHeight: 1 }}><CharacterIcon size={120} /></div>
          <h1
            className="neon-magenta"
            style={{ fontFamily: 'var(--f-disp)', fontSize: 22, letterSpacing: 1, margin: '8px 0 2px' }}
          >
            WAITING ROOM
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)' }}>대기실</div>
        </div>

        {/* 방 코드 */}
        <div className="arc-panel ticks" style={{ padding: '18px 20px', textAlign: 'center', marginBottom: 14 }}>
          <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 10, display: 'block' }}>ROOM CODE</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--f-disp)', fontSize: 36, letterSpacing: '0.2em', color: 'var(--text)' }}>
              {roomId}
            </span>
            <button onClick={copyCode} className="arc-btn-ghost" style={{ padding: '8px 12px' }} title="코드 복사">
              {copied ? <Check size={15} color="var(--green)" /> : <Copy size={15} />}
            </button>
          </div>
          <button
            onClick={copyLink}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: linkCopied ? 'var(--magenta)' : 'var(--dim)',
              transition: 'color .15s',
            }}
          >
            <Link size={11} />
            {linkCopied ? '링크 복사됨!' : '입장 링크 복사'}
          </button>
        </div>

        {/* 참가자 목록 */}
        <div className="arc-panel" style={{ padding: '16px 18px', marginBottom: 14 }}>
          <span className="arc-lbl" style={{ color: 'var(--magenta)', marginBottom: 12, display: 'block' }}>
            PLAYERS ({memberList.length}명)
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {memberList.map(([uid, m]) => (
              <div
                key={uid}
                className="arc-panel-inset"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderColor: uid === myUid ? 'var(--magenta)' : 'var(--line)',
                }}
              >
                {uid === meta.host
                  ? <Crown size={13} color="var(--magenta)" style={{ flexShrink: 0 }} />
                  : <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--surface-3)', border: '1.5px solid var(--line-2)', flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: uid === myUid ? 'var(--magenta)' : 'var(--text)' }}>
                  {m.name}
                </span>
                {uid === myUid && (
                  <span className="arc-badge" style={{ background: 'var(--magenta)', color: '#fff' }}>나</span>
                )}
                {uid === meta.host && uid !== myUid && (
                  <span className="arc-badge">HOST</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 호스트 게임 설정 */}
        {isHost && (
          <div className="arc-panel" style={{ padding: '18px 20px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span className="arc-lbl" style={{ color: 'var(--magenta)' }}>GAME SETTINGS</span>

            <div>
              <span className="arc-lbl" style={{ marginBottom: 8, display: 'block' }}>카드 모드</span>
              <div className="arc-seg" style={{ '--c': 'var(--magenta)', '--seg-text': '#fff' } as React.CSSProperties}>
                {(['basic', 'genre'] as const).map(gm => (
                  <button
                    key={gm}
                    onClick={() => onModeChange(gm)}
                    className={meta.mode === gm ? 'on' : ''}
                    style={meta.mode === gm ? magSeg : {}}
                  >
                    {gm === 'basic' ? '기본 (6장 자동)' : '카테고리 선택'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="arc-lbl" style={{ marginBottom: 8, display: 'block' }}>카드 중복</span>
              <button
                onClick={() => onInfiniteChange(!meta.infiniteMode)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${meta.infiniteMode ? 'var(--magenta)' : 'var(--line-2)'}`,
                  color: meta.infiniteMode ? 'var(--magenta)' : 'var(--dim)',
                  background: meta.infiniteMode ? 'color-mix(in srgb, var(--magenta) 14%, transparent)' : 'transparent',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <InfinityIcon size={12} /> 무한 모드 {meta.infiniteMode ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <span className="arc-lbl" style={{ marginBottom: 8, display: 'block' }}>설명 타이머</span>
              <div style={{ display: 'flex', gap: 7 }}>
                {TIMER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onTimerChange(opt.value)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${meta.timerSeconds === opt.value ? 'var(--magenta)' : 'var(--line-2)'}`,
                      background: meta.timerSeconds === opt.value
                        ? 'color-mix(in srgb, var(--magenta) 18%, transparent)'
                        : 'transparent',
                      color: meta.timerSeconds === opt.value ? 'var(--magenta)' : 'var(--dim)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="arc-lbl" style={{ marginBottom: 8, display: 'block' }}>버즈인 이미지 검색</span>
              <button
                onClick={() => onImageSearchChange(!meta.imageSearch)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${meta.imageSearch ? 'var(--violet)' : 'var(--line-2)'}`,
                  color: meta.imageSearch ? 'var(--violet)' : 'var(--dim)',
                  background: meta.imageSearch ? 'color-mix(in srgb, var(--violet) 14%, transparent)' : 'transparent',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <Image size={12} /> 이미지 검색 {meta.imageSearch ? 'ON' : 'OFF'}
              </button>
              {meta.imageSearch && (
                <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, lineHeight: 1.5 }}>
                  버즈인 시 캐릭터 이름을 입력하면 모든 참가자에게 구글 이미지 링크가 표시돼요
                </p>
              )}
            </div>
          </div>
        )}

        {/* 비호스트 설정 표시 */}
        {!isHost && (
          <div className="arc-panel-inset" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {meta.mode === 'basic' ? '기본 (6장 자동)' : '카테고리 선택'}
            </span>
            {meta.infiniteMode && <span className="arc-chip" style={{ fontSize: 11 }}>∞ 무한</span>}
            {meta.timerSeconds > 0 && <span className="arc-chip" style={{ fontSize: 11 }}>⏱ {meta.timerSeconds}초</span>}
            {meta.imageSearch && <span className="arc-chip" style={{ fontSize: 11 }}>🔍 이미지 검색</span>}
          </div>
        )}

        {/* 시작 버튼 */}
        {isHost ? (
          <button onClick={onStart} className="arc-btn arc-btn--magenta" style={{ fontSize: 18 }}>
            게임 시작
          </button>
        ) : (
          <div className="arc-panel-inset" style={{ padding: '18px', textAlign: 'center' }}>
            <p className="pix blink" style={{ fontSize: 9, color: 'var(--magenta)', letterSpacing: 1, margin: 0 }}>
              WAITING FOR HOST...
            </p>
            <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 8 }}>호스트가 게임을 시작할 때까지 기다려요</p>
          </div>
        )}

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 20, lineHeight: 1.8 }}>
          CHARACTER CARD · ONLINE ROOM
        </p>
      </main>
    </div>
  )
}
