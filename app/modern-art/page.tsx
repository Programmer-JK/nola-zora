'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ARTISTS, AUCTION_TYPE_ICONS, AUCTION_TYPE_COLORS, STARTING_CASH } from '@/lib/modern-art/game-data';
import { AuctionType } from '@/lib/modern-art/types';
import { loginGuest, getGuestNickname } from '@/lib/auth';
import { createRoom, joinRoom } from '@/lib/modern-art/firebase-game';


const MAX_PLAYERS = 5;
const MIN_PLAYERS = 2;
const AUCTION_TYPES: AuctionType[] = ['open', 'fixed', 'secret', 'once-around', 'double'];

const AUCTION_RULES: Record<AuctionType, { desc: string; detail: string }> = {
  open: { desc: '공개 경매', detail: '시계 방향으로 돌아가며 입찰. 더 높은 금액을 부르거나 패스. 마지막 남은 사람이 낙찰.' },
  fixed: { desc: '지정가 경매', detail: '판매자가 가격을 먼저 정함. 다른 플레이어가 순서대로 수락/거절. 모두 거절하면 판매자가 해당 가격에 직접 구매.' },
  secret: { desc: '비밀 경매', detail: '모든 플레이어가 동시에 비밀 입찰. 공개 후 최고가 낙찰. 동점이면 판매자에 가까운 순.' },
  'once-around': { desc: '한 바퀴 경매', detail: '판매자 다음 플레이어부터 딱 한 번씩만 입찰 기회. 판매자는 마지막에 모든 입찰을 이기거나 공짜로 가져갈 수 있음.' },
  double: { desc: '더블 경매', detail: '같은 작가 카드 2장을 동시에 경매에 올림. 경매 방식은 2번째 카드의 타입을 따름. 낙찰자는 2장 모두 획득.' },
};

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(12,10,18,0.88)', backdropFilter: 'blur(10px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="arc-panel ticks arc-rise"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto',
          borderRadius: '22px 22px 0 0', padding: '20px 18px 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line-2)' }} />
        </div>

        <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', margin: '0 0 4px' }}>모던 아트 — 게임 설명</h2>
        <p style={{ color: 'var(--dim)', fontSize: 12, margin: '0 0 20px' }}>Reiner Knizia 원작 경매 보드게임</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section>
            <span className="arc-lbl" style={{ color: 'var(--cyan)', display: 'block', marginBottom: 8 }}>목표</span>
            <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              4라운드 동안 경매로 작품을 사고팔아 <strong style={{ color: 'var(--text)' }}>현금 + 보유 작품 가치</strong>의 합이 가장 높은 플레이어가 승리합니다.
            </p>
          </section>

          <section>
            <span className="arc-lbl" style={{ color: 'var(--cyan)', display: 'block', marginBottom: 10 }}>게임 흐름</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                '자기 차례에 손패에서 카드 1장(더블은 2장)을 골라 경매에 올립니다.',
                '경매 방식에 따라 입찰을 진행하고 낙찰자가 판매자에게 낙찰가를 지불합니다.',
                '한 작가의 카드가 이번 라운드에 5장 이상 나오면 라운드가 즉시 종료됩니다.',
                '라운드 종료 시 가장 많이 팔린 작가 TOP 3의 작품 가치가 올라갑니다.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span className="arc-badge" style={{ background: 'var(--cyan)', color: '#06231f', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <p style={{ color: 'var(--dim)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="arc-lbl" style={{ color: 'var(--cyan)', display: 'block', marginBottom: 10 }}>라운드 종료 — 작품 가치 상승</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['1위', '+30M', 'var(--gold)'], ['2위', '+20M', 'var(--dim)'], ['3위', '+10M', '#92400E']].map(([rank, val, color]) => (
                <div key={rank} className="arc-panel-inset" style={{ flex: 1, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color }}>{rank}</div>
                  <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)', marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--faint)', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
              작품 가치는 매 라운드 누적됩니다. 4라운드 종료 시 보유 작품의 가치가 모두 현금으로 환산됩니다.
            </p>
          </section>

          <section>
            <span className="arc-lbl" style={{ color: 'var(--cyan)', display: 'block', marginBottom: 10 }}>경매 종류</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AUCTION_TYPES.map(type => (
                <div key={type} className="arc-panel-inset" style={{ padding: '12px 14px', borderColor: AUCTION_TYPE_COLORS[type] + '50' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15 }}>{AUCTION_TYPE_ICONS[type]}</span>
                    <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{AUCTION_RULES[type].desc}</span>
                  </div>
                  <p style={{ color: 'var(--dim)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{AUCTION_RULES[type].detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <span className="arc-lbl" style={{ color: 'var(--cyan)', display: 'block', marginBottom: 10 }}>등장 작가 (카드 수)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ARTISTS.map((a, i) => {
                const counts = [12, 11, 10, 9, 8];
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, width: 28 }}>{a.avatar}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: a.color }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--faint)' }}>{counts[i]}장</span>
                    <div style={{ width: 56, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: a.color, width: `${(counts[i] / 12) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <button onClick={onClose} className="arc-btn arc-btn--cyan">확인</button>
        </div>
      </div>
    </div>
  );
}

type Mode = 'local' | 'online';

function LocalSetup({ rounds }: { rounds: number }) {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4', '플레이어 5']);

  const handleStart = () => {
    const playerNames = names.slice(0, playerCount);
    const params = new URLSearchParams({ players: playerNames.join(','), rounds: String(rounds) });
    router.push(`/modern-art/game/local?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>플레이어 수</span>
        <div className="arc-seg">
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
            <button key={n} onClick={() => setPlayerCount(n)} className={playerCount === n ? 'on' : ''}>{n}명</button>
          ))}
        </div>
      </section>

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>플레이어 이름</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="arc-badge" style={{ background: 'var(--surface-3)', color: 'var(--dim)', flexShrink: 0 }}>{i + 1}</span>
              <input
                type="text"
                value={names[i]}
                onChange={e => { const next = [...names]; next[i] = e.target.value; setNames(next); }}
                maxLength={10}
                className="arc-field"
                style={{ flex: 1, fontFamily: 'var(--f-body)', fontWeight: 600 }}
                placeholder={`플레이어 ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--faint)' }}>
        <span>💰 시작 자금: {STARTING_CASH}만원</span>
        <span>🏆 작가 순위: 30/20/10만원</span>
      </div>

      <button onClick={handleStart} className="arc-btn arc-btn--cyan" style={{ fontSize: 18 }}>
        <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 2 }}>▶</span>
        게임 시작
      </button>
    </div>
  );
}

function OnlineSetup({ rounds }: { rounds: number }) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getGuestNickname();
    if (saved) setNickname(saved);
  }, []);

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    setError(''); setLoading('create');
    const uid = await loginGuest(nickname.trim());
    const code = await createRoom(uid, nickname.trim(), rounds);
    router.push(`/modern-art/room/${code}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력하세요.'); return; }
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('방 코드를 입력하세요.'); return; }
    setError(''); setLoading('join');
    const uid = await loginGuest(nickname.trim());
    const err = await joinRoom(code, uid, nickname.trim());
    if (err) { setError(err); setLoading(null); return; }
    router.push(`/modern-art/room/${code}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>내 닉네임</span>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={10}
          placeholder="닉네임 입력..."
          className="arc-field"
          style={{ fontFamily: 'var(--f-body)', fontWeight: 600 }}
        />
      </section>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, margin: 0, background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)', borderRadius: 12, padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 만들기</span>
        <button onClick={handleCreate} disabled={loading !== null} className="arc-btn arc-btn--cyan">
          {loading === 'create' ? 'LOADING...' : '새 방 만들기'}
        </button>
        <p style={{ color: 'var(--faint)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>방을 만들고 친구에게 코드를 공유하세요</p>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ color: 'var(--faint)', fontSize: 12 }}>또는</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <section>
        <span className="arc-lbl" style={{ display: 'block', marginBottom: 8 }}>방 참가</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="방 코드 6자리"
            className="arc-field"
            style={{ flex: 1, letterSpacing: 4, fontFamily: 'var(--f-pix)', fontSize: 12 }}
          />
          <button onClick={handleJoin} disabled={loading !== null} className="arc-btn-ghost" style={{ flexShrink: 0 }}>
            {loading === 'join' ? '...' : '참가'}
          </button>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--faint)' }}>
        <span>💰 시작 자금: {STARTING_CASH}만원</span>
        <span>👥 2~5명</span>
      </div>
    </div>
  );
}

export default function ModernArtSetup() {
  const [mode, setMode] = useState<Mode>('local');
  const [rounds, setRounds] = useState(4);
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="cabinet">
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      <div className="crt" />

      <div className="arc-screen" style={{ '--c': 'var(--cyan)' } as React.CSSProperties}>
        {/* 상단 바 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/lobby" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
            ← 로비
          </Link>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/modern-art/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>
              📖 규칙
            </Link>
            <button onClick={() => setShowRules(true)} className="arc-btn-ghost" style={{ width: 40, height: 40, padding: 0, borderRadius: 11, fontSize: 16 }}>
              ?
            </button>
          </div>
        </div>

        {/* 게임 히어로 */}
        <div className="arc-pop" style={{ textAlign: 'center', margin: '12px 0 22px' }}>
          <div className="arc-float" style={{ fontSize: 56, lineHeight: 1 }}>🎨</div>
          <h1 className="neon-cyan" style={{ fontFamily: 'var(--f-disp)', fontSize: 40, letterSpacing: 1, margin: '6px 0 2px' }}>
            MODERN ART
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text)' }}>모던 아트</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <Link href="/modern-art/rules">
              <span className="arc-chip" style={{ cursor: 'pointer', display: 'inline-flex' }}>📖 게임 방법</span>
            </Link>
            <span className="arc-chip" style={{ cursor: 'pointer', display: 'inline-flex' }} onClick={() => setShowRules(true)}>💡 게임 설명</span>
          </div>
        </div>

        {/* 모드 탭 */}
        <div className="arc-seg" style={{ marginBottom: 18 }}>
          {(['local', 'online'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={mode === m ? 'on' : ''}>
              {m === 'local' ? '🖥️ 로컬 플레이' : '🌐 온라인'}
            </button>
          ))}
        </div>

        {/* 라운드 설정 */}
        <div className="arc-panel arc-rise" style={{ padding: '16px', marginBottom: 12 }}>
          <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>라운드 수</span>
          <div className="arc-seg">
            {[3, 4, 5].map(r => (
              <button key={r} onClick={() => setRounds(r)} className={rounds === r ? 'on' : ''}>{r}라운드</button>
            ))}
          </div>
        </div>

        {/* 모드별 UI */}
        <div className="arc-panel ticks arc-rise" style={{ padding: '20px 18px', animationDelay: '.08s' }}>
          {mode === 'local'
            ? <LocalSetup rounds={rounds} />
            : <OnlineSetup rounds={rounds} />
          }
        </div>

        {/* 하단 info */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <span className="arc-chip" style={{ fontSize: 11 }}>🎨 작가 5명</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>🏷️ 경매 5종</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>👥 2~5명</span>
          <span className="arc-chip" style={{ fontSize: 11 }}>💰 {STARTING_CASH}만원</span>
        </div>
      </div>
    </div>
  );
}
