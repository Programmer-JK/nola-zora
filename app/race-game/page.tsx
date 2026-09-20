'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const START_CHIPS = 700;

const DEFAULT_NAMES = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4', '플레이어 5', '플레이어 6'];

export default function RaceGameLobby() {
  const router = useRouter();
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice());

  function start() {
    const players = Array.from({ length: count }, (_, i) => ({
      name: names[i].trim() || DEFAULT_NAMES[i],
      chips: START_CHIPS,
    }));
    router.push('/race-game/game?setup=' + encodeURIComponent(JSON.stringify(players)));
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--f-title)',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontFamily: 'var(--f-pix)',
          fontSize: 11,
          color: 'var(--gold)',
          letterSpacing: 3,
          marginBottom: 8,
        }}>NOLAZORA</div>
        <h1 style={{
          fontFamily: 'var(--f-title)',
          fontSize: 48,
          color: 'var(--text)',
          margin: 0,
          letterSpacing: 1,
        }}>레이스 베팅</h1>
        <div style={{
          fontFamily: 'var(--f-pix)',
          fontSize: 9,
          color: 'var(--dim)',
          marginTop: 8,
          letterSpacing: 2,
        }}>RACE BETTING GAME · 2-6 PLAYERS</div>
      </div>

      {/* Setup panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-2)',
        borderRadius: 'var(--r)',
        padding: '28px 24px',
        width: '100%',
        maxWidth: 420,
      }}>
        {/* Player count */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--f-pix)',
            fontSize: 9,
            color: 'var(--gold)',
            letterSpacing: 2,
            marginBottom: 12,
          }}>PLAYERS</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: count === n ? 'var(--gold)' : 'var(--surface-2)',
                  color: count === n ? '#000' : 'var(--text-2)',
                  border: '1px solid ' + (count === n ? 'var(--gold)' : 'var(--line-2)'),
                  borderRadius: 8,
                  fontFamily: 'var(--f-pix)',
                  fontSize: 10,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  fontWeight: count === n ? 700 : 400,
                }}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Player names */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--f-pix)',
            fontSize: 9,
            color: 'var(--gold)',
            letterSpacing: 2,
            marginBottom: 12,
          }}>PLAYER NAMES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--f-pix)',
                  fontSize: 9,
                  color: 'var(--gold)',
                  width: 24,
                  textAlign: 'right',
                  flexShrink: 0,
                }}>{i + 1}P</span>
                <input
                  value={names[i]}
                  onChange={e => {
                    const n = [...names];
                    n[i] = e.target.value;
                    setNames(n);
                  }}
                  maxLength={12}
                  placeholder={DEFAULT_NAMES[i]}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--line-2)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontSize: 15,
                    fontFamily: 'var(--f-title)',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info row */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          padding: '12px 14px',
          background: 'var(--surface-2)',
          borderRadius: 8,
        }}>
          {[
            { icon: '💰', label: '시작 칩', value: `${START_CHIPS}` },
            { icon: '🏁', label: '라운드', value: '4' },
            { icon: '🐎', label: '캐릭터', value: '12' },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--dim)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 11, color: 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={start}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, var(--gold) 0%, #e09010 100%)',
            color: '#000',
            border: 'none',
            borderRadius: 10,
            fontFamily: 'var(--f-pix)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 2,
            boxShadow: '0 4px 16px rgba(255,183,43,.3)',
          }}
        >
          ▶ RACE START
        </button>
      </div>

      {/* Back */}
      <button
        onClick={() => router.push('/lobby')}
        style={{
          marginTop: 20,
          background: 'none',
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          color: 'var(--dim)',
          padding: '8px 20px',
          fontFamily: 'var(--f-pix)',
          fontSize: 8,
          cursor: 'pointer',
          letterSpacing: 1,
        }}
      >← BACK</button>
    </div>
  );
}
