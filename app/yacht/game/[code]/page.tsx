'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { loginGuest, getGuestNickname } from '@/lib/auth';
import {
  Y_CATS, Y_UPPER, Y_LOWER,
  yScore, yUpperSum, yUpperBonus, yLowerSum, yTotal, yFilled,
  rollDie, PLAYER_COLORS, yBestSuggestion,
} from '@/lib/yacht/game-logic';
import type { YachtCatId } from '@/lib/yacht/types';
import { playDiceRattle, playDiceLand, playScoreCommit, playHoldToggle } from '@/lib/yacht/sounds';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import {
  subscribeRoom, startGame, updateGameState, finishGame,
  restartGame, joinRoom,
  YachtRoom, YachtRoomPlayer, YachtOnlineGameState,
} from '@/lib/yacht/roomService';

const ACCENT = 'var(--green)';
const ACCENT_HEX = '#7ed957';

/* ── toArr helper ── */
function toArr<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val == null) return [];
  return Object.keys(val as object)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (val as Record<string, T>)[k]);
}

// Firebase drops empty objects `{}` from arrays, so we reconstruct missing entries as {}
function sanitizeGs(gs: YachtOnlineGameState, n: number): YachtOnlineGameState {
  const rawScores = toArr<Partial<Record<YachtCatId, number>> | null>(gs.playerScores);
  return {
    ...gs,
    dice: toArr<number>(gs.dice),
    held: toArr<boolean>(gs.held),
    playerScores: Array.from({ length: n }, (_, i) => rawScores[i] ?? {}),
  };
}

/* ── Pip map ── */
const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

/* ── 2D die ── */
function YachtDie({
  value, held, rolling, onClick, inactive,
}: {
  value: number; held: boolean; rolling: boolean;
  onClick: () => void; inactive: boolean;
}) {
  const pips = PIP_MAP[value] || [];
  const s = 52;
  const dieBg = held
    ? 'linear-gradient(150deg, #caf7b0 0%, #7ed957 100%)'
    : 'linear-gradient(150deg, #f0e8d8 0%, #d4c9b5 100%)';
  const dieShadow = held
    ? 'inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25), 0 0 18px -2px rgba(126,217,87,.85)'
    : 'inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25)';
  return (
    <button
      onClick={onClick}
      disabled={inactive}
      style={{
        border: 'none', background: 'transparent', padding: 0,
        cursor: inactive ? 'default' : 'pointer',
        transform: held ? 'translateY(-8px)' : 'none',
        transition: 'transform .15s',
        opacity: inactive ? 0.45 : 1,
        position: 'relative',
      }}
    >
      <div
        className={rolling && !held ? 'dice-tumble' : ''}
        style={{
          width: s, height: s,
          background: dieBg,
          borderRadius: Math.round(s * 0.22),
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gridTemplateRows: 'repeat(3,1fr)',
          padding: s * 0.13, gap: s * 0.04,
          boxShadow: dieShadow,
          transition: 'background .2s, box-shadow .2s',
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} style={{
            borderRadius: '50%',
            background: pips.includes(i) ? '#1a1206' : 'transparent',
            boxShadow: pips.includes(i) ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
          }} />
        ))}
      </div>
      {held && (
        <span style={{
          position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--f-pix)', fontSize: 6, color: '#06230a',
          background: ACCENT_HEX, padding: '2px 5px', borderRadius: 5, whiteSpace: 'nowrap',
        }}>HOLD</span>
      )}
    </button>
  );
}

/* ── 3D die ── */
function Die3D({ index }: { index: number }) {
  const s = 52; const h = s / 2; const r = Math.round(s * 0.22);
  const faces = [
    { v: 1, t: `translateZ(${h}px)` },
    { v: 6, t: `rotateY(180deg) translateZ(${h}px)` },
    { v: 3, t: `rotateY(90deg) translateZ(${h}px)` },
    { v: 4, t: `rotateY(-90deg) translateZ(${h}px)` },
    { v: 2, t: `rotateX(90deg) translateZ(${h}px)` },
    { v: 5, t: `rotateX(-90deg) translateZ(${h}px)` },
  ];
  return (
    <div style={{ width: s, height: s, perspective: 160, perspectiveOrigin: '50% 50%', flexShrink: 0 }}>
      <div className="dice-3d-spin" style={{
        width: s, height: s, position: 'relative', transformStyle: 'preserve-3d',
        animationDelay: `${-index * 0.11}s`,
      }}>
        {faces.map(({ v, t }) => {
          const pips = PIP_MAP[v] || [];
          return (
            <div key={v} style={{
              position: 'absolute', width: s, height: s,
              background: 'linear-gradient(150deg, #f0e8d8 0%, #d4c9b5 100%)',
              borderRadius: r, transform: t, backfaceVisibility: 'hidden',
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gridTemplateRows: 'repeat(3,1fr)', padding: s * 0.13, gap: s * 0.04,
              boxSizing: 'border-box',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,.9), inset 0 -2px 4px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.3)',
            }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{
                  borderRadius: '50%',
                  background: pips.includes(i) ? '#1a1206' : 'transparent',
                  boxShadow: pips.includes(i) ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
                }} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Score cell ── */
function YCell({
  state, value, active, onPick, clickable = true, isTotal,
}: {
  state: 'filled' | 'preview' | 'empty';
  value: number | null;
  active: boolean;
  onPick?: () => void;
  clickable?: boolean;
  isTotal?: boolean;
}) {
  if (isTotal) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-disp)', fontSize: 15,
        color: active ? ACCENT : 'var(--coin)',
        background: active ? 'color-mix(in srgb, var(--green) 16%, transparent)' : 'transparent',
        borderRadius: 8, padding: '4px 0',
      }}>{value}</div>
    );
  }
  if (state === 'filled') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-disp)', fontSize: 15,
        color: value === 0 ? 'var(--faint)' : 'var(--text)',
      }}>{value}</div>
    );
  }
  if (state === 'preview') {
    const zero = value === 0;
    if (!clickable) {
      // 관전자용: 선택지 표시만, 클릭 불가
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', border: '1.5px dashed',
          borderColor: zero ? 'var(--line-2)' : `${ACCENT_HEX}66`,
          background: zero ? 'transparent' : 'color-mix(in srgb, var(--green) 8%, transparent)',
          borderRadius: 9, padding: '5px 0',
          fontFamily: 'var(--f-disp)', fontSize: 15,
          color: zero ? 'var(--faint)' : `${ACCENT_HEX}aa`,
        }}>{value}</div>
      );
    }
    return (
      <button
        onClick={onPick}
        style={{
          width: '100%', height: '100%', cursor: 'pointer', border: '1.5px solid',
          borderColor: zero ? 'var(--line-2)' : ACCENT_HEX,
          background: zero ? 'rgba(255,255,255,.03)' : 'color-mix(in srgb, var(--green) 20%, transparent)',
          borderRadius: 9, padding: '5px 0',
          fontFamily: 'var(--f-disp)', fontSize: 15,
          color: zero ? 'var(--dim)' : ACCENT,
          textShadow: zero ? 'none' : `0 0 10px rgba(126,217,87,.5)`,
          transition: 'transform .1s, box-shadow .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 14px -4px var(--green)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >{value}</button>
    );
  }
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', fontSize: 13 }}>–</div>;
}

const MIN_PLAYERS = 2;

function DicePip({ value, color }: { value: number; color: string }) {
  const pipMap: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8],
    4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  const pips = pipMap[value] || [];
  const s = 28;
  return (
    <div style={{
      width: s, height: s,
      background: `linear-gradient(150deg, ${color}cc 0%, ${color} 100%)`,
      borderRadius: Math.round(s * 0.22),
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)',
      padding: s * 0.13, gap: s * 0.04, flexShrink: 0,
      boxShadow: `inset 0 2px 3px rgba(255,255,255,.5), inset 0 -2px 4px rgba(0,0,0,.3), 0 0 10px -2px ${color}99`,
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{ borderRadius: '50%', background: pips.includes(i) ? '#1a1206' : 'transparent' }} />
      ))}
    </div>
  );
}

/* ── Lobby ── */
function LobbyWaiting({
  room, code, myUid, onStart, starting, onLeave,
}: {
  room: YachtRoom; code: string; myUid: string; onStart: () => void; starting: boolean; onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const players = toArr<YachtRoomPlayer>(room.players);
  const isHost = room.hostClientId === myUid;
  const canStart = isHost && players.length >= MIN_PLAYERS;
  const isPlayer = players.some(p => p.clientId === myUid);
  const takenColors = players.map(p => p.color);
  const firstAvailable = PLAYER_COLORS.find(c => !takenColors.includes(c.hex))?.hex ?? PLAYER_COLORS[0].hex;
  const [joinNickname, setJoinNickname] = useState(() => getGuestNickname() ?? '');
  const [joinColor, setJoinColor] = useState(firstAvailable);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleJoin = async () => {
    if (!joinNickname.trim()) { setJoinError('닉네임을 입력하세요.'); return; }
    if (takenColors.includes(joinColor)) { setJoinError('이미 선택된 색상입니다.'); return; }
    setJoining(true); setJoinError('');
    const uid = await loginGuest(joinNickname.trim());
    const result = await joinRoom(code, { clientId: uid, name: joinNickname.trim(), color: joinColor });
    if (!result.success) { setJoinError(result.error ?? '참가 실패'); setJoining(false); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/yacht/game/${code}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!isPlayer) {
    return (
      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 28 }}>
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 20, width: '100%', maxWidth: 400 }}>
          <div className="arc-float" style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>⛵</div>
          <h1 style={{ fontFamily: 'var(--f-title)', fontSize: 28, margin: '0 0 4px' }}>YACHT DICE</h1>
          <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2 }}>JOIN ROOM · {code}</div>
        </div>

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>닉네임</span>
            <input
              className="arc-field"
              value={joinNickname}
              onChange={e => setJoinNickname(e.target.value)}
              maxLength={12}
              placeholder="닉네임 입력..."
              style={{ fontWeight: 700 }}
            />
          </div>

          <div>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>색상 선택</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLAYER_COLORS.map(c => {
                const taken = takenColors.includes(c.hex);
                const selected = joinColor === c.hex;
                return (
                  <button
                    key={c.id}
                    disabled={taken}
                    onClick={() => setJoinColor(c.hex)}
                    style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: taken ? 'var(--surface-2)' : c.hex + '33',
                      border: `2px solid ${selected ? c.hex : taken ? 'var(--line)' : c.hex + '55'}`,
                      boxShadow: selected ? `0 0 0 2px ${c.hex}, 0 0 12px -4px ${c.hex}` : 'none',
                      cursor: taken ? 'not-allowed' : 'pointer',
                      opacity: taken ? 0.35 : 1,
                      transition: 'all .15s',
                    }}
                    title={taken ? `사용 중` : c.id}
                  />
                );
              })}
            </div>
          </div>

          {joinError && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{joinError}</p>}

          <button className="arc-btn" onClick={handleJoin} disabled={joining} style={{ fontSize: 18, '--c': ACCENT } as React.CSSProperties}>
            {joining ? '참가 중...' : '⛵ 방 참가하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 8 }}>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
        <button className="arc-btn-ghost" onClick={onLeave} style={{ fontSize: 13, padding: '9px 14px' }}>
          ← 나가기
        </button>
      </div>

      {/* Header */}
      <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 24, width: '100%', maxWidth: 400 }}>
        <div className="arc-float" style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>⛵</div>
        <h1 style={{ fontFamily: 'var(--f-title)', fontSize: 32, margin: '0 0 4px', color: 'var(--text)' }}>대기실</h1>
        <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2 }}>WAITING ROOM</div>
      </div>

      {/* Room code — tap to copy */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
        <span className="arc-lbl" style={{ color: ACCENT_HEX, marginBottom: 8, display: 'block', textAlign: 'center' }}>
          ROOM CODE — 친구에게 공유하세요
        </span>
        <button
          onClick={handleCopyCode}
          className="arc-panel ticks"
          style={{
            width: '100%', padding: '18px 22px', textAlign: 'center', cursor: 'pointer',
            border: `1.5px solid ${copied ? 'var(--green)' : 'var(--line-2)'}`,
            boxShadow: copied ? '0 0 0 1px var(--green), 0 0 18px -4px var(--green)' : `0 0 0 1px ${ACCENT_HEX}55, 0 0 22px -8px ${ACCENT_HEX}55`,
            transition: 'all .2s',
          }}
        >
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 34, letterSpacing: '0.35em', color: copied ? 'var(--green)' : 'var(--text)' }}>
            {code}
          </div>
          <div className="pix" style={{ fontSize: 8, color: copied ? 'var(--green)' : 'var(--dim)', marginTop: 8, letterSpacing: 1 }}>
            {copied ? '✓ COPIED!' : 'TAP TO COPY'}
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <div style={{ display: 'inline-block', padding: 8, borderRadius: 10, background: '#fff', boxShadow: '0 0 12px rgba(0,0,0,0.3)' }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/yacht/game/${code}`}
              size={80}
              bgColor="#ffffff"
              fgColor="#061a0c"
              level="M"
            />
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: linkCopied ? 'var(--green)' : 'var(--dim)',
              transition: 'color .15s',
            }}
          >
            {linkCopied ? <Check size={11} /> : <Copy size={11} />}
            {linkCopied ? '링크 복사됨!' : '입장 링크 복사'}
          </button>
        </div>
      </div>

      {/* Player list */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="arc-lbl" style={{ color: ACCENT_HEX }}>PLAYERS</span>
          <span className="arc-badge">{players.length}/6</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p, i) => {
            const isMe = p.clientId === myUid;
            const isRoomHost = p.clientId === room.hostClientId;
            return (
              <div
                key={p.clientId}
                className="arc-rise"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 16,
                  background: isMe ? `color-mix(in srgb, ${p.color} 10%, var(--surface))` : 'var(--surface)',
                  border: `1.5px solid ${isMe ? p.color : 'var(--line)'}`,
                  boxShadow: isMe ? `0 0 0 1px ${p.color}33, 0 0 14px -4px ${p.color}66` : 'none',
                  transition: 'all .2s',
                  animationDelay: `${i * 0.06}s`,
                }}
              >
                <DicePip value={Math.min(i + 1, 6)} color={p.color} />
                <span style={{
                  fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15,
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isMe ? p.color : 'var(--text)',
                }}>
                  {p.name}
                  {isMe && <span style={{ fontWeight: 400, color: 'var(--dim)', fontSize: 12, marginLeft: 6 }}>(나)</span>}
                </span>
                {isRoomHost && (
                  <span className="arc-badge" style={{ background: ACCENT_HEX, color: '#06230a' }}>HOST</span>
                )}
              </div>
            );
          })}

          {/* 빈 슬롯 */}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - players.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 16,
              border: '1.5px dashed var(--line)',
              color: 'var(--faint)', fontSize: 14,
            }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px dashed var(--line-2)', flexShrink: 0 }} />
              <span style={{ fontStyle: 'italic' }}>대기 중...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        {isHost ? (
          <button
            className="arc-btn"
            onClick={onStart}
            disabled={!canStart || starting}
            style={{ fontSize: 18, background: canStart ? 'var(--green)' : undefined, color: canStart ? '#06230a' : undefined, borderColor: canStart ? 'var(--green)' : undefined }}
          >
            {starting ? '시작 중…' : canStart ? '게임 시작 ⛵' : `최소 ${MIN_PLAYERS}명 필요`}
          </button>
        ) : (
          <div className="arc-panel" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div className="pix blink" style={{ fontSize: 9, color: ACCENT_HEX, letterSpacing: 1 }}>WAITING FOR HOST</div>
            <div style={{ color: 'var(--dim)', fontSize: 13, marginTop: 8 }}>
              호스트가 게임을 시작할 때까지 대기 중...
            </div>
          </div>
        )}
      </div>

      <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.8 }}>
        ROLL THE DICE · BEAT YOUR FRIENDS · YACHT!
      </p>
    </div>
  );
}

/* ── Online game ── */
export default function YachtOnlineGame() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { uid } = useAuth();

  const { soundEnabled, toggleSound } = useSoundEnabled();

  const [room, setRoom] = useState<YachtRoom | null>(null);
  const [gs, setGs] = useState<YachtOnlineGameState | null>(null);

  // local rolling state (animation only)
  const [rolling, setRolling] = useState(false);
  const [localDice, setLocalDice] = useState<number[]>([1, 2, 3, 4, 5]);
  const [flash, setFlash] = useState<YachtCatId | null>(null);
  const [starting, setStarting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [rematching, setRematching] = useState(false);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // refs for stale-closure-safe access inside setInterval & subscribeRoom
  const gsRef = useRef<YachtOnlineGameState | null>(null);
  const rollingRef = useRef(false);
  const committingRef = useRef(false);

  useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

  useEffect(() => {
    const unsub = subscribeRoom(code, (r) => {
      if (!r) { router.replace('/yacht'); return; }
      setRoom(r);
      if (r.gameState) {
        const nPlayers = toArr<YachtRoomPlayer>(r.players).length;
        const clean = sanitizeGs(r.gameState, nPlayers);
        // Don't overwrite gsRef while the local roll animation is playing
        if (!rollingRef.current) gsRef.current = clean;
        setGs(clean);
        if (!rollingRef.current) setLocalDice(clean.dice);
        // Reset commit guard when new turn starts
        if (!clean.rolled) committingRef.current = false;
      }
    });
    return unsub;
  }, [code, router]);

  if (!room) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <p style={{ textAlign: 'center', color: 'var(--dim)', paddingTop: 80 }}>연결 중…</p>
        </div>
      </div>
    );
  }

  /* ── Lobby ── */
  if (room.status === 'waiting') {
    const handleStart = async () => {
      setStarting(true);
      const players = toArr<YachtRoomPlayer>(room.players);
      const initGs: YachtOnlineGameState = {
        turnIdx: 0,
        playerScores: players.map(() => ({})),
        dice: [1, 2, 3, 4, 5],
        held: [false, false, false, false, false],
        rollsLeft: 3,
        rolled: false,
      };
      await startGame(code, initGs);
      setStarting(false);
    };
    return (
      <div className="cabinet">
        <div className="crt" />
        {showLeaveConfirm && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="arc-panel" style={{ maxWidth: 300, width: '90%', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
              <div style={{ fontSize: 16, fontFamily: 'var(--f-title)', color: 'var(--text)', marginBottom: 8 }}>
                대기실을 나가시겠습니까?
              </div>
              <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 22, lineHeight: 1.55 }}>
                호스트가 나가면 게임을 시작할 수 없습니다.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="arc-btn-ghost" onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, fontSize: 14 }}>취소</button>
                <button className="arc-btn" onClick={() => router.push('/yacht')} style={{ flex: 1, fontSize: 14, background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>나가기</button>
              </div>
            </div>
          </div>
        )}
        <LobbyWaiting room={room} code={code} myUid={uid} onStart={handleStart} starting={starting} onLeave={() => setShowLeaveConfirm(true)} />
      </div>
    );
  }

  if (!gs) {
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <p style={{ textAlign: 'center', color: 'var(--dim)', paddingTop: 80 }}>게임 로딩 중…</p>
        </div>
      </div>
    );
  }

  const players = toArr<YachtRoomPlayer>(room.players);
  const n = players.length;
  const me = players[gs.turnIdx];
  const isMyTurn = me?.clientId === uid;
  // Other player is rolling — show animation on observer screens
  const opponentRolling = !isMyTurn && !!gs.isRolling;
  const showRolling = rolling || opponentRolling;
  const canScore = gs.rolled && !rolling && isMyTurn;
  const turnNo = gs.playerScores[gs.turnIdx]
    ? Object.keys(gs.playerScores[gs.turnIdx]).length + 1
    : 1;

  /* ── Roll ── */
  const roll = () => {
    const curGs = gsRef.current ?? gs;
    if (!isMyTurn || curGs.rollsLeft <= 0 || rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    setFlash(null);
    // snapshot held at roll-start to avoid stale closure inside interval
    const heldSnap = [...curGs.held];
    // Use curGs.dice (Firebase-confirmed) for held dice, not localDice (may be stale/animated)
    const finalDice = curGs.dice.map((d, i) => heldSnap[i] ? d : rollDie());
    let ticks = 0;
    if (ivRef.current) clearInterval(ivRef.current);
    // Signal rolling to other players via Firebase
    const rollingGs: YachtOnlineGameState = { ...curGs, isRolling: true };
    gsRef.current = rollingGs;
    updateGameState(code, rollingGs);
    ivRef.current = setInterval(() => {
      ticks++;
      if (soundEnabled) playDiceRattle();
      setLocalDice(prev => prev.map((d, i) => heldSnap[i] ? d : rollDie()));
      if (ticks >= 9) {
        if (ivRef.current) clearInterval(ivRef.current);
        setLocalDice(finalDice);
        rollingRef.current = false;
        setRolling(false);
        if (soundEnabled) playDiceLand();
        const next: YachtOnlineGameState = {
          ...curGs,
          dice: finalDice,
          rollsLeft: curGs.rollsLeft - 1,
          rolled: true,
          isRolling: false,
        };
        gsRef.current = next;
        updateGameState(code, next);
      }
    }, 65);
  };

  /* ── Hold ── */
  const toggleHold = (i: number) => {
    if (!isMyTurn || !(gsRef.current ?? gs).rolled || rolling) return;
    if (soundEnabled) playHoldToggle();
    const curGs = gsRef.current ?? gs;
    const newHeld = curGs.held.map((h, idx) => idx === i ? !h : h);
    const next = { ...curGs, held: newHeld };
    gsRef.current = next;
    updateGameState(code, next);
  };

  /* ── Sort ── */
  const sortDice = () => {
    if (!isMyTurn || !(gsRef.current ?? gs).rolled) return;
    const curGs = gsRef.current ?? gs;
    const pairs = curGs.dice.map((d, i) => ({ d, h: curGs.held[i] }));
    pairs.sort((a, b) => a.d - b.d);
    const next = { ...curGs, dice: pairs.map(p => p.d), held: pairs.map(p => p.h) };
    gsRef.current = next;
    updateGameState(code, next);
  };

  /* ── Commit ── */
  const commit = async (catId: YachtCatId) => {
    if (!canScore || committingRef.current) return;
    committingRef.current = true;
    const curGs = gsRef.current ?? gs;
    const scores = curGs.playerScores[curGs.turnIdx] ?? {};
    if (scores[catId] !== undefined) { committingRef.current = false; return; }
    const pts = yScore(catId, curGs.dice);
    if (soundEnabled) playScoreCommit();
    const newScores = Array.from({ length: n }, (_, i) => {
      const s = curGs.playerScores[i] ?? {};
      return i === curGs.turnIdx ? { ...s, [catId]: pts } : s;
    });
    setFlash(catId);

    const allDone = newScores.length === n &&
      newScores.every(s => Y_CATS.filter(c => s[c.id] !== undefined).length === Y_CATS.length);

    if (allDone) {
      const doneGs: YachtOnlineGameState = { ...curGs, playerScores: newScores };
      await updateGameState(code, doneGs);
      await finishGame(code);
      return;
    }

    const nextIdx = (curGs.turnIdx + 1) % n;
    const nextGs: YachtOnlineGameState = {
      turnIdx: nextIdx,
      playerScores: newScores,
      dice: [1, 2, 3, 4, 5],
      held: [false, false, false, false, false],
      rollsLeft: 3,
      rolled: false,
      isRolling: false,
    };
    setTimeout(() => updateGameState(code, nextGs), 900);
  };

  /* ── Rematch ── */
  const handleRematch = async () => {
    if (rematching) return;
    setRematching(true);
    await restartGame(code);
    setRematching(false);
  };

  /* ── Result screen ── */
  if (room.status === 'finished' && gs) {
    const ranked = players
      .map((p, i) => ({ ...p, total: yTotal(gs.playerScores[i] ?? {}), upper: yUpperSum(gs.playerScores[i] ?? {}), lower: yLowerSum(gs.playerScores[i] ?? {}) }))
      .sort((a, b) => b.total - a.total);
    const winner = ranked[0];
    return (
      <div className="cabinet">
        <div className="crt" />
        <div className="arc-screen" style={{ '--c': ACCENT } as React.CSSProperties}>
          <div className="arc-pop" style={{ textAlign: 'center', margin: '20px 0 20px' }}>
            <div className="arc-float" style={{ fontSize: 52, lineHeight: 1, margin: '14px 0 0' }}>⛵</div>
            <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 28, color: ACCENT, margin: '12px 0 2px' }}>WINNER</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: winner.color, boxShadow: `0 0 10px ${winner.color}` }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)' }}>{winner.name}</span>
              <span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: 'var(--coin)' }}>{winner.total}점</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
            {ranked.map((p, rank) => (
              <div key={p.clientId} className="arc-panel" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderColor: rank === 0 ? ACCENT_HEX : 'var(--line)',
                boxShadow: rank === 0 ? '0 0 18px -6px var(--green)' : 'none',
              }}>
                <span style={{ fontSize: 17, width: 24, textAlign: 'center' }}>
                  {['🥇', '🥈', '🥉'][rank] ?? '🎲'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontFamily: 'var(--f-body)', fontWeight: 700, fontSize: 15, color: rank === 0 ? ACCENT : 'var(--text)' }}>
                      {p.name}
                    </span>
                  </div>
                  <div className="pix" style={{ fontSize: 6.5, color: 'var(--faint)', marginTop: 5, paddingLeft: 16 }}>
                    상단 {p.upper} / 하단 {p.lower}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--f-disp)', fontSize: 19, color: 'var(--coin)' }}>{p.total}점</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="arc-btn-ghost"
              onClick={() => router.push('/yacht')}
              style={{ flex: 1, fontSize: 15, '--c': ACCENT } as React.CSSProperties}
            >
              🚪 로비로
            </button>
            {uid === room.hostClientId && (
              <button
                className="arc-btn"
                onClick={handleRematch}
                disabled={rematching}
                style={{ flex: 1.4, fontSize: 18, background: 'var(--green)', color: '#06230a', borderColor: 'var(--green)' }}
              >
                {rematching ? '준비 중…' : '🔄 다시 하기'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── 점수표 ── */
  const colTmpl = `minmax(106px, 1.3fr) repeat(${n}, minmax(52px, 1fr))`;

  const headerCell = (p: YachtRoomPlayer, i: number) => {
    const active = i === gs.turnIdx;
    return (
      <div key={p.clientId} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '7px 2px 8px',
        borderBottom: active ? `2px solid ${ACCENT_HEX}` : '2px solid transparent',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.color, boxShadow: active ? `0 0 8px ${p.color}` : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? ACCENT : 'var(--text-2)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </span>
        {active && <span className="pix" style={{ fontSize: 5, color: ACCENT }}>NOW</span>}
      </div>
    );
  };

  const bonusRow = () => (
    <div style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '5px 10px',
        borderRight: '1px solid var(--line)', borderTop: '1px solid var(--line-2)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', fontFamily: 'var(--f-body)' }}>보너스</span>
        <span style={{ fontSize: 8, color: 'var(--faint)', fontFamily: 'var(--f-pix)', marginTop: 2 }}>≥63 → +35</span>
      </div>
      {players.map((p, i) => {
        const upper = yUpperSum(gs.playerScores[i] ?? {});
        const got = upper >= 63;
        return (
          <div key={p.clientId} style={{
            background: 'var(--bg)',
            borderTop: '1px solid var(--line-2)',
            borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
          }}>
            {got
              ? <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, color: 'var(--green)' }}>+35</span>
              : <span style={{ fontSize: 14, color: 'var(--faint)' }}>{upper}/63</span>
            }
          </div>
        );
      })}
    </div>
  );

  const catRow = (cat: typeof Y_CATS[number]) => (
    <div key={cat.id} style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '6px 10px', borderRight: '1px solid var(--line)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15 }}>{cat.kr}</span>
        <span style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2, lineHeight: 1.3 }}>{cat.sub}</span>
      </div>
      {players.map((p, i) => {
        const scores = gs.playerScores[i] ?? {};
        const filled = scores[cat.id] !== undefined;
        const active = i === gs.turnIdx;
        let state: 'filled' | 'preview' | 'empty' = 'empty';
        let value: number | null = null;
        const showPreview = active && gs.rolled && !rolling;
        if (filled) { state = 'filled'; value = scores[cat.id] as number; }
        else if (showPreview) { state = 'preview'; value = yScore(cat.id, gs.dice); }
        const justFlashed = flash === cat.id && active;
        return (
          <div key={p.clientId} className={justFlashed ? 'y-commit' : ''} style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
            padding: 3, borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
            background: active && !filled ? 'rgba(126,217,87,.04)' : 'transparent',
          }}>
            <div style={{ flex: 1 }}>
              <YCell
                state={state} value={value} active={active}
                clickable={canScore}
                onPick={canScore ? () => commit(cat.id) : undefined}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const sectionLabel = (txt: string, border = false) => (
    <div style={{
      gridColumn: `1 / span ${n + 1}`,
      position: 'sticky', left: 0,
      padding: '5px 10px', background: 'var(--bg)',
      fontFamily: 'var(--f-pix)', fontSize: 12, letterSpacing: 1, color: 'var(--dim)',
      borderTop: border ? '1px solid var(--line-2)' : 'none',
    }}>{txt}</div>
  );

  const totalRow = (label: string, fn: (s: Partial<Record<YachtCatId, number>>) => number, strong: boolean) => (
    <div style={{ display: 'contents' }}>
      <div style={{
        position: 'sticky', left: 0, zIndex: 2,
        background: strong ? 'var(--surface)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', padding: '7px 10px',
        borderRight: '1px solid var(--line)', borderTop: '1px solid var(--line-2)',
      }}>
        <span style={{
          fontSize: strong ? 13 : 11, fontWeight: 800,
          color: strong ? 'var(--text)' : 'var(--text-2)',
          fontFamily: strong ? 'var(--f-title)' : 'var(--f-body)',
        }}>{label}</span>
      </div>
      {players.map((p, i) => (
        <div key={p.clientId} style={{
          background: strong ? 'var(--surface)' : 'var(--bg)',
          borderTop: '1px solid var(--line-2)',
          borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
          padding: '2px',
        }}>
          <YCell isTotal state="filled" value={fn(gs.playerScores[i] ?? {})} active={i === gs.turnIdx && strong} />
        </div>
      ))}
    </div>
  );

  /* ── suggestion ── */
  const suggestion = canScore
    ? yBestSuggestion(gs.dice, gs.playerScores[gs.turnIdx] ?? {})
    : null;

  // Always use localDice for display — it's kept in sync with gs.dice when not rolling,
  // and shows the live animation values when rolling.
  const displayDice = localDice;

  /* ── Game UI ── */
  return (
    <div className="cabinet" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="crt" />

      {/* 나가기 확인 모달 */}
      {showLeaveConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="arc-panel" style={{ maxWidth: 300, width: '90%', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--f-title)', color: 'var(--text)', marginBottom: 8 }}>
              게임을 나가시겠습니까?
            </div>
            <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 22, lineHeight: 1.55 }}>
              나가면 상대방은 계속 대기 상태가 됩니다.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="arc-btn-ghost"
                onClick={() => setShowLeaveConfirm(false)}
                style={{ flex: 1, fontSize: 14 }}
              >
                취소
              </button>
              <button
                className="arc-btn"
                onClick={() => router.push('/yacht')}
                style={{ flex: 1, fontSize: 14, background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 640, flex: 1, position: 'relative', zIndex: 1 }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--line)',
        }}>
          <button className="arc-btn-ghost" onClick={() => setShowLeaveConfirm(true)} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 나가기
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, letterSpacing: 1, color: ACCENT }}>
              ⛵ YACHT
            </div>
            <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 2 }}>
              ROUND {turnNo} / {Y_CATS.length} · {n}P · {code}
            </div>
          </div>
          <button
            onClick={toggleSound}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, width: 80, textAlign: 'right', padding: '0 4px' }}
            title={soundEnabled ? '소리 끄기' : '소리 켜기'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, padding: '14px 12px 0' }}>
            {/* 차례 배너 */}
            <div className="arc-pop" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '8px 14px', borderRadius: 13, marginBottom: 8,
              background: `color-mix(in srgb, ${me?.color ?? '#888'} 14%, var(--surface))`,
              border: `1.5px solid ${me?.color ?? '#888'}`,
            }}>
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: me?.color, boxShadow: `0 0 9px ${me?.color}` }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {me?.name}<span style={{ color: 'var(--dim)', fontSize: 13 }}> 님 차례</span>
              </span>
              {isMyTurn && !gs.rolled && (
                <span className="blink" style={{ color: ACCENT, fontSize: 11, fontFamily: 'var(--f-pix)', marginLeft: 4 }}>ROLL!</span>
              )}
              {!isMyTurn && (
                <span className="blink" style={{ color: 'var(--dim)', fontSize: 10, fontFamily: 'var(--f-pix)', marginLeft: 4 }}>대기 중</span>
              )}
            </div>

            {/* 주사위 트레이 */}
            <div className="arc-panel ticks" style={{ padding: '12px 16px 10px', marginBottom: 0 }}>
              {gs.rolled && !rolling && isMyTurn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button
                    className="arc-btn-ghost"
                    onClick={sortDice}
                    style={{ fontSize: 12, padding: '7px 12px', '--c': ACCENT } as React.CSSProperties}
                  >↑↓ 정렬</button>
                </div>
              )}

              <div
                className={showRolling ? 'dice-tray-shake' : ''}
                style={{ display: 'flex', justifyContent: 'center', gap: 10, minHeight: 76, alignItems: 'center' }}
              >
                {displayDice.map((d, i) => (
                  showRolling && !gs.held[i]
                    ? <Die3D key={i} index={i} />
                    : <YachtDie
                      key={i}
                      value={d}
                      held={gs.held[i]}
                      rolling={showRolling}
                      onClick={() => toggleHold(i)}
                      inactive={!gs.rolled || showRolling || !isMyTurn}
                    />
                ))}
              </div>

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)', margin: '8px 0 6px', minHeight: 16 }}>
                {!gs.rolled
                  ? isMyTurn ? '🎲 굴려서 턴을 시작하세요' : '상대방 차례입니다'
                  : opponentRolling
                    ? '🎲 상대방이 굴리는 중…'
                    : gs.rollsLeft > 0
                      ? isMyTurn ? '남기고 싶은 주사위를 탭해 고정(HOLD)' : '상대방이 주사위를 고르는 중…'
                      : isMyTurn ? '굴림 끝! 점수표에서 족보를 선택하세요' : '상대방이 족보를 선택 중…'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="arc-btn"
                  onClick={roll}
                  disabled={!isMyTurn || gs.rollsLeft <= 0 || rolling}
                  style={{
                    flex: 1, fontSize: 18,
                    background: isMyTurn ? 'var(--green)' : 'var(--surface)',
                    color: isMyTurn ? '#06230a' : 'var(--dim)',
                    borderColor: isMyTurn ? 'var(--green)' : 'var(--line)',
                  }}
                >
                  🎲 {gs.rolled ? '다시 굴리기' : '굴리기'}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 48 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0, 1, 2].map(k => (
                      <span key={k} style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: k < gs.rollsLeft ? 'var(--green)' : 'rgba(255,255,255,.12)',
                        boxShadow: k < gs.rollsLeft ? '0 0 7px var(--green)' : 'none',
                        transition: 'all .2s',
                      }} />
                    ))}
                  </div>
                  <span className="pix" style={{ fontSize: 6, color: 'var(--faint)' }}>ROLLS</span>
                </div>
              </div>

              {suggestion && (
                <p className="arc-rise" style={{ textAlign: 'center', fontSize: 11, color: 'var(--dim)', margin: '8px 0 0' }}>
                  {suggestion.sacrifice
                    ? <>💡 희생 추천 <b style={{ color: 'var(--dim)' }}>{suggestion.kr}</b></>
                    : <>💡 추천 <b style={{ color: ACCENT }}>{suggestion.kr} +{suggestion.v}</b></>
                  }
                </p>
              )}
            </div>
          </div>{/* /top section */}

          {/* 점수표 */}
          <div className="arc-panel" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: colTmpl, minWidth: 'min-content' }}>
                {/* 헤더 — sticky top + left */}
                <div style={{
                  position: 'sticky', top: 0, left: 0, zIndex: 4, background: 'var(--surface)',
                  padding: '6px 10px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
                }}>
                  <span className="pix" style={{ fontSize: 7, color: 'var(--faint)' }}>YACHT</span>
                </div>
                {players.map((p, i) => (
                  <div key={p.clientId} style={{
                    position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)',
                    borderBottom: '1px solid var(--line)', borderRight: i === n - 1 ? 'none' : '1px solid var(--line)',
                  }}>
                    {headerCell(p, i)}
                  </div>
                ))}

                {sectionLabel('▸ 상단')}
                {Y_UPPER.map(c => catRow(c))}
                {totalRow('상단 합계', yUpperSum, false)}
                {bonusRow()}

                {sectionLabel('▸ 하단', true)}
                {Y_LOWER.map(c => catRow(c))}

                {totalRow('TOTAL', yTotal, true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
