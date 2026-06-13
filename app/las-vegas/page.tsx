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
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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
    <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
      <div className="mb-8">
        <h2 className="text-amber-300 text-xs font-bold tracking-widest uppercase mb-4">인원 선택</h2>
        <div className="flex gap-3 justify-center">
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
            <button
              key={n}
              onClick={() => handlePlayerCountChange(n)}
              className={`w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200 ${playerCount === n
                ? 'bg-amber-400 text-black scale-110 shadow-lg shadow-amber-400/40'
                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-amber-300 text-xs font-bold tracking-widest uppercase">플레이어 설정</h2>
        {players.slice(0, playerCount).map((player, index) => {
          const colorInfo = PLAYER_COLORS.find((c) => c.color === player.color)!;
          return (
            <div key={index} className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${colorInfo.text}`}>{DICE_FACES[index]}</span>
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-white text-sm font-medium outline-none border-b border-white/20 pb-1 focus:border-amber-400 transition-colors"
                  maxLength={12}
                />
              </div>
              <div className="flex gap-2.5 flex-wrap pl-1">
                {PLAYER_COLORS.map((c) => {
                  const isUsedByOther = usedColors.includes(c.color) && c.color !== player.color;
                  return (
                    <button
                      key={c.color}
                      onClick={() => !isUsedByOther && handleColorChange(index, c.color)}
                      disabled={isUsedByOther}
                      title={c.label}
                      className={`w-6 h-6 rounded-full transition-all duration-150 ${c.bg} ${player.color === c.color
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-125'
                        : isUsedByOther
                          ? 'opacity-20 cursor-not-allowed'
                          : 'opacity-60 hover:opacity-100 hover:scale-110'
                        }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleStart}
        className="mt-8 w-full py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
      >
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
    if (code.length < 6) {
      setRoomPlayers([]);
      setRoomStatus('idle');
      return;
    }
    setRoomStatus('checking');
    try {
      const room = await getRoom(code);
      if (!room || room.status !== 'waiting') {
        setRoomPlayers([]);
        setRoomStatus('notfound');
        setError(room?.status === 'playing' ? '이미 게임이 시작된 방입니다.' : '방을 찾을 수 없습니다.');
      } else {
        setRoomPlayers(room.players);
        setRoomStatus('found');
        const takenColors = room.players.map((p) => p.color);
        if (takenColors.includes(color)) {
          const available = PLAYER_COLORS.find((c) => !takenColors.includes(c.color));
          if (available) setColor(available.color);
        }
      }
    } catch {
      setRoomStatus('idle');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const code = generateRoomCode();
      await createRoom(code, myUid, { clientId: myUid, name: myNickname, color });
      router.push(`/las-vegas/room/${code}`);
    } catch {
      setError('방 생성에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 6) { setError('방 코드 6자리를 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await joinRoom(joinCode.trim().toUpperCase(), {
        clientId: myUid,
        name: myNickname,
        color,
      });
      if (!result.success) {
        setError(result.error ?? '참가에 실패했습니다.');
        setLoading(false);
        return;
      }
      router.push(`/las-vegas/room/${joinCode.trim().toUpperCase()}`);
    } catch {
      setError('참가에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl">
      <div className="flex rounded-2xl bg-white/5 p-1 mb-8">
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${subTab === t
              ? 'bg-amber-400 text-black shadow'
              : 'text-white/50 hover:text-white'
              }`}
          >
            {t === 'create' ? '방 만들기' : '방 참가하기'}
          </button>
        ))}
      </div>

      {subTab === 'join' && (
        <div className="mb-6">
          <label className="text-amber-300 text-xs font-bold tracking-widest uppercase block mb-2">방 코드</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => handleJoinCodeChange(e.target.value)}
            placeholder="XXXXXX"
            className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white text-lg font-black tracking-[0.3em] text-center outline-none transition-colors placeholder:text-white/20 ${roomStatus === 'found' ? 'border-green-500' :
              roomStatus === 'notfound' ? 'border-red-500' :
                'border-white/20 focus:border-amber-400'
              }`}
            maxLength={6}
          />
          {roomStatus === 'checking' && <p className="text-white/40 text-xs text-center mt-2">방 확인 중...</p>}
          {roomStatus === 'found' && roomPlayers.length > 0 && (
            <div className="mt-2 flex items-center gap-2 justify-center">
              <span className="text-green-400 text-xs">✓ 방 발견</span>
              <span className="text-white/30 text-xs">|</span>
              <div className="flex gap-1.5 items-center">
                {roomPlayers.map((p) => {
                  const cc = PLAYER_COLORS.find((c) => c.color === p.color);
                  return (
                    <span key={p.clientId} className="flex items-center gap-1 text-white/50 text-xs">
                      <span className={`w-2 h-2 rounded-full inline-block ${cc?.bg}`} />
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <label className="text-amber-300 text-xs font-bold tracking-widest uppercase block mb-2">내 닉네임</label>
        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/60 text-sm">
          {myNickname}
        </div>
      </div>

      <div className="mb-8">
        <label className="text-amber-300 text-xs font-bold tracking-widest uppercase block mb-3">
          주사위 색상
          {subTab === 'join' && roomStatus === 'found' && (
            <span className="text-white/30 font-normal normal-case tracking-normal ml-2">(어두운 색상은 이미 선택됨)</span>
          )}
        </label>
        <div className="flex gap-3 justify-center flex-wrap">
          {PLAYER_COLORS.map((c) => {
            const takenColors = subTab === 'join' ? roomPlayers.map((p) => p.color) : [];
            const isTaken = takenColors.includes(c.color);
            return (
              <button
                key={c.color}
                onClick={() => !isTaken && setColor(c.color)}
                disabled={isTaken}
                title={isTaken ? '이미 선택됨' : c.label}
                className={`w-10 h-10 rounded-full transition-all duration-150 ${c.bg} ${isTaken ? 'opacity-20 cursor-not-allowed'
                  : color === c.color ? 'ring-2 ring-white scale-125 shadow-lg'
                    : 'opacity-50 hover:opacity-80 hover:scale-110'
                  }`}
              />
            );
          })}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

      <button
        onClick={subTab === 'create' ? handleCreate : handleJoin}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? '처리 중...' : subTab === 'create' ? '방 만들기' : '참가하기'}
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1e1a0f] via-[#17130c] to-[#100e09] px-4 py-10">
      <button
        onClick={toggleMusic}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg hover:bg-white/20 transition-all"
        title={musicOn ? '음악 끄기' : '음악 켜기'}
      >
        {musicOn ? '🎵' : '🔇'}
      </button>

      <button
        onClick={() => router.push('/lobby')}
        className="fixed top-4 left-4 z-50 text-sm text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
      >
        ← 로비
      </button>

      <div className="text-center mb-8">
        <div className="text-7xl mb-3">🎲</div>
        <h1 className="text-5xl font-black tracking-widest text-amber-400 mb-2">LAS VEGAS</h1>
        <p className="text-amber-300/60 text-sm tracking-widest uppercase mb-3">The Dice Game</p>
        <Link
          href="/las-vegas/rules"
          className="text-white/40 hover:text-amber-300 text-xs border border-white/15 hover:border-amber-400/40 px-3 py-1 rounded-lg transition-all"
        >
          게임 방법 ?
        </Link>
      </div>

      <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1 mb-6 w-full max-w-lg">
        <button
          onClick={() => setTab('local')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${tab === 'local' ? 'bg-white/15 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
        >
          🖥️ 로컬 플레이
        </button>
        <button
          onClick={() => setTab('online')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${tab === 'online' ? 'bg-white/15 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
        >
          🌐 온라인 플레이
        </button>
      </div>

      {tab === 'local'
        ? <LocalPlayTab myNickname={nickname} />
        : <OnlinePlayTab myNickname={nickname} myUid={uid} />
      }

      <div className="mt-8 max-w-lg text-center text-white/30 text-xs leading-relaxed">
        <p>🏨 6개의 카지노 | 🎲 인원수별 주사위 4–8개 | 💰 4라운드</p>
        <p className="mt-1">같은 숫자 주사위를 골라 카지노에 배치하고 가장 많은 돈을 모아 우승하세요!</p>
      </div>

    </main>
  );
}
