'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PlayerColor, PLAYER_COLORS } from '@/lib/las-vegas/types';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  getRoom,
  RoomPlayer,
} from '@/lib/las-vegas/roomService';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

interface PlayerSetup {
  name: string;
  color: PlayerColor;
}

const DEFAULT_NAMES = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4', '플레이어 5', '플레이어 6'];

const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#facc15', purple: '#a855f7', orange: '#f97316',
};

// ── Inline pip dice for player count selector ──────────────────────────────
const PIP_MAP: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
function DicePip({ value, selected, accentHex }: { value: number; selected: boolean; accentHex?: string }) {
  const pips = PIP_MAP[value] || [];
  const size = 44;
  const activeHex = accentHex ?? '#ffb72b';
  const bg = selected
    ? `linear-gradient(150deg, ${activeHex}cc 0%, ${activeHex} 100%)`
    : 'rgba(0,0,0,.3)';
  const shadow = selected
    ? `inset 0 2px 3px rgba(255,255,255,.5), inset 0 -3px 5px rgba(0,0,0,.25), 0 0 18px -2px ${activeHex}99`
    : 'inset 0 1px 2px rgba(255,255,255,.05)';
  return (
    <div style={{
      width: size, height: size,
      background: bg,
      borderRadius: Math.round(size * 0.22),
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gridTemplateRows: 'repeat(3,1fr)',
      padding: size * 0.13,
      gap: size * 0.04,
      boxShadow: shadow,
      transition: 'background .2s, box-shadow .2s',
    }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{
          borderRadius: '50%',
          background: pips.includes(i) ? (selected ? '#1a1206' : 'var(--dim)') : 'transparent',
        }} />
      ))}
    </div>
  );
}

// ─── Local Play ───────────────────────────────────────────────────────────────

function LocalPlayTab({ myNickname }: { myNickname: string }) {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerSetup[]>(
    [myNickname, ...DEFAULT_NAMES.slice(1, 2)].map((name, i) => ({
      name,
      color: PLAYER_COLORS[i].color,
    }))
  );

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setPlayers((prev) => {
      const updated = [...prev];
      while (updated.length < count) {
        const usedColors = updated.map((p) => p.color);
        const nextColor = PLAYER_COLORS.find((c) => !usedColors.includes(c.color))!;
        updated.push({ name: DEFAULT_NAMES[updated.length], color: nextColor.color });
      }
      return updated.slice(0, count);
    });
  };

  const handleColorChange = (index: number, color: PlayerColor) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, color } : p)));
  };

  const handleNameChange = (index: number, name: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)));
  };

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('setup', JSON.stringify(players.slice(0, playerCount)));
    router.push(`/las-vegas/game?${params.toString()}`);
  };

  const usedColors = players.map((p) => p.color);

  return (
    <div className="arc-panel ticks" style={{ padding: 22 }}>
      {/* Player count */}
      <span className="arc-lbl" style={{ color: 'var(--gold)' }}>PLAYERS</span>
      <div style={{ display: 'flex', gap: 9, marginTop: 12, marginBottom: 22, justifyContent: 'space-between' }}>
        {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
          <button
            key={n}
            onClick={() => handlePlayerCountChange(n)}
            style={{
              flex: 1, aspectRatio: '1', borderRadius: 13, cursor: 'pointer',
              border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform .12s',
              transform: playerCount === n ? 'scale(1.08)' : 'none',
              padding: playerCount === n ? 0 : 6,
            }}
          >
            <DicePip value={n} selected={playerCount === n} />
          </button>
        ))}
      </div>

      {/* Player setup */}
      <span className="arc-lbl" style={{ color: 'var(--gold)' }}>PLAYER SETUP</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {players.slice(0, playerCount).map((player, index) => {
          const hex = COLOR_HEX[player.color] ?? '#888';
          return (
            <div key={index} className="arc-panel-inset arc-rise" style={{ padding: 12, animationDelay: `${index * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <DicePip value={index + 1} selected accentHex={hex} />
                <input
                  type="text"
                  className="arc-field"
                  style={{ padding: '8px 12px', fontSize: 15, background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--line-2)', borderRadius: 0 }}
                  value={player.name}
                  maxLength={12}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 11, paddingLeft: 2 }}>
                {PLAYER_COLORS.map((c) => {
                  const isUsedByOther = usedColors.includes(c.color) && c.color !== player.color;
                  const cHex = COLOR_HEX[c.color] ?? '#888';
                  return (
                    <button
                      key={c.color}
                      disabled={isUsedByOther}
                      onClick={() => !isUsedByOther && handleColorChange(index, c.color)}
                      title={c.label}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', border: 'none',
                        cursor: isUsedByOther ? 'not-allowed' : 'pointer',
                        background: cHex,
                        opacity: isUsedByOther ? 0.18 : player.color === c.color ? 1 : 0.55,
                        transform: player.color === c.color ? 'scale(1.25)' : 'none',
                        boxShadow: player.color === c.color ? `0 0 0 2px var(--bg), 0 0 0 4px ${cHex}, 0 0 14px ${cHex}` : 'none',
                        transition: 'all .15s',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button className="arc-btn" style={{ marginTop: 20, fontSize: 20 }} onClick={handleStart}>
        게임 시작 🎲
      </button>
    </div>
  );
}

// ─── Online Play ──────────────────────────────────────────────────────────────

function OnlinePlayTab({ myNickname, myUid }: { myNickname: string; myUid: string }) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<'create' | 'join'>('create');
  const [color, setColor] = useState<PlayerColor>('red');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [roomStatus, setRoomStatus] = useState<'idle' | 'checking' | 'found' | 'notfound'>('idle');

  const handleJoinCodeChange = async (val: string) => {
    const code = val.toUpperCase().slice(0, 6);
    setJoinCode(code);
    setError('');
    if (code.length < 6) { setRoomPlayers([]); setRoomStatus('idle'); return; }
    setRoomStatus('checking');
    try {
      const room = await getRoom(code);
      if (!room || room.status !== 'waiting') {
        setRoomPlayers([]); setRoomStatus('notfound');
        setError(room?.status === 'playing' ? '이미 게임이 시작된 방입니다.' : '방을 찾을 수 없습니다.');
      } else {
        setRoomPlayers(room.players); setRoomStatus('found');
        const takenColors = room.players.map((p) => p.color);
        if (takenColors.includes(color)) {
          const available = PLAYER_COLORS.find((c) => !takenColors.includes(c.color));
          if (available) setColor(available.color);
        }
      }
    } catch { setRoomStatus('idle'); }
  };

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const code = generateRoomCode();
      await createRoom(code, myUid, { clientId: myUid, name: myNickname, color });
      router.push(`/las-vegas/room/${code}`);
    } catch { setError('방 생성에 실패했습니다. 다시 시도해주세요.'); setLoading(false); }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 6) { setError('방 코드 6자리를 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const result = await joinRoom(joinCode.trim().toUpperCase(), { clientId: myUid, name: myNickname, color });
      if (!result.success) { setError(result.error ?? '참가에 실패했습니다.'); setLoading(false); return; }
      router.push(`/las-vegas/room/${joinCode.trim().toUpperCase()}`);
    } catch { setError('참가에 실패했습니다. 다시 시도해주세요.'); setLoading(false); }
  };

  return (
    <div className="arc-panel ticks" style={{ padding: 22 }}>
      <div className="arc-seg" style={{ marginBottom: 20 }}>
        <button className={subTab === 'create' ? 'on' : ''} onClick={() => { setSubTab('create'); setError(''); }}>방 만들기</button>
        <button className={subTab === 'join' ? 'on' : ''} onClick={() => { setSubTab('join'); setError(''); }}>방 참가하기</button>
      </div>

      {subTab === 'join' && (
        <div style={{ marginBottom: 18 }}>
          <span className="arc-lbl" style={{ color: 'var(--gold)' }}>ROOM CODE</span>
          <input
            type="text"
            className="arc-field"
            style={{ textAlign: 'center', fontFamily: 'var(--f-disp)', fontSize: 26, letterSpacing: 8, marginTop: 10,
              borderColor: roomStatus === 'found' ? 'var(--green)' : roomStatus === 'notfound' ? 'var(--red)' : undefined }}
            value={joinCode}
            onChange={(e) => handleJoinCodeChange(e.target.value)}
            placeholder="XXXXXX"
            maxLength={6}
          />
          {roomStatus === 'checking' && <p style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', marginTop: 6 }}>방 확인 중...</p>}
          {roomStatus === 'found' && roomPlayers.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ 방 발견</span>
              {roomPlayers.map((p) => {
                const hex = COLOR_HEX[p.color as PlayerColor] ?? '#888';
                return (
                  <span key={p.clientId} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--dim)', fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hex, display: 'inline-block' }} />
                    {p.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      <span className="arc-lbl" style={{ color: 'var(--gold)', marginBottom: 8, display: 'block' }}>MY NAME</span>
      <div className="arc-panel-inset" style={{ padding: '12px 16px', marginBottom: 18, fontFamily: 'var(--f-body)', fontWeight: 600, fontSize: 16 }}>
        {myNickname}
      </div>

      <span className="arc-lbl" style={{ color: 'var(--gold)' }}>DICE COLOR</span>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
        {PLAYER_COLORS.map((c) => {
          const takenColors = subTab === 'join' ? roomPlayers.map((p) => p.color) : [];
          const isTaken = takenColors.includes(c.color);
          const hex = COLOR_HEX[c.color] ?? '#888';
          return (
            <button key={c.color} onClick={() => !isTaken && setColor(c.color)} disabled={isTaken} title={c.label}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                cursor: isTaken ? 'not-allowed' : 'pointer',
                background: hex,
                opacity: isTaken ? 0.18 : color === c.color ? 1 : 0.5,
                transform: color === c.color ? 'scale(1.2)' : 'none',
                boxShadow: color === c.color ? `0 0 0 3px var(--bg), 0 0 18px ${hex}` : 'none',
                transition: 'all .15s',
              }} />
          );
        })}
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 14 }}>{error}</p>}

      <button className="arc-btn" disabled={loading} onClick={subTab === 'create' ? handleCreate : handleJoin} style={{ fontSize: 19 }}>
        {loading ? '처리 중...' : subTab === 'create' ? '방 만들기 🎲' : '참가하기 🎲'}
      </button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function LasVegasSetupPage() {
  const { nickname, uid } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'local' | 'online'>('local');
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/opening.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    audio.play().catch(() => setMusicOn(false));
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) audio.pause();
    else audio.play().catch(() => {});
    setMusicOn((prev) => !prev);
  };

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ '--c': 'var(--gold)' } as React.CSSProperties}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <button className="arc-btn-ghost" onClick={() => router.push('/lobby')} style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </button>
          <button className="arc-btn-ghost" onClick={toggleMusic} style={{ width: 40, height: 40, padding: 0, borderRadius: 11, fontSize: 16 }}>
            {musicOn ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Game logo */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🎰</div>
          <h1 className="neon-gold" style={{ fontFamily: 'var(--f-disp)', fontSize: 40, letterSpacing: 1, margin: '6px 0 2px' }}>
            LAS VEGAS
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>라스베가스</div>
          <Link href="/las-vegas/rules">
            <span className="arc-chip" style={{ marginTop: 12, cursor: 'pointer', display: 'inline-flex' }}>📖 게임 방법</span>
          </Link>
        </div>

        {/* Local / Online tab */}
        <div className="arc-seg" style={{ marginBottom: 18 }}>
          <button className={tab === 'local' ? 'on' : ''} onClick={() => setTab('local')}>🖥️ 로컬 플레이</button>
          <button className={tab === 'online' ? 'on' : ''} onClick={() => setTab('online')}>🌐 온라인</button>
        </div>

        {tab === 'local'
          ? <LocalPlayTab myNickname={nickname} />
          : <OnlinePlayTab myNickname={nickname} myUid={uid} />
        }

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <span className="arc-chip" style={{ fontSize: 11 }}>🏨 카지노 6</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🎲 주사위 4–8</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>💰 4 라운드</span>
        </div>
      </div>
    </div>
  );
}
