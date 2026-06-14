'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ARTISTS, AUCTION_TYPE_ICONS, AUCTION_TYPE_LABELS, AUCTION_TYPE_COLORS,
  getArtistById,
} from '@/lib/modern-art/game-data';
import {
  createGame, selectCard, selectDoubleSecond,
  openBid, openPass, openStand,
  fixedSetPrice, fixedAccept, fixedDecline,
  secretSubmitBid, secretResolve,
  onceAroundBid, onceAroundPass,
  acknowledgeResult, acknowledgeScoring,
  calcFinalScores, getCurrentPlayer, getPlayerById,
} from '@/lib/modern-art/game-logic';
import {
  GameState, Card, OpenAuction, FixedAuction, SecretAuction, OnceAroundAuction,
} from '@/lib/modern-art/types';

// ─── 작품 이미지 ──────────────────────────────────────────────
function ArtworkImage({ artistId, avatar, artworkIndex, className }: {
  artistId: string; avatar: string; artworkIndex: number; className?: string;
}) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 48 }}>{avatar}</span>
      </div>
    );
  }
  return (
    <img
      src={`/modern-art/${artistId}/${artworkIndex}.png`}
      alt={`${artistId}-${artworkIndex}`}
      className={className}
      style={{ objectFit: 'cover' }}
      onError={() => setErr(true)}
    />
  );
}

// ─── 카드 컴포넌트 ────────────────────────────────────────────
function ArtCard({ card, selected, onClick, dimmed }: {
  card: Card; selected?: boolean; onClick?: () => void; dimmed?: boolean;
}) {
  const artist = getArtistById(card.artistId);
  const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
  return (
    <button
      onClick={onClick}
      disabled={dimmed}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        borderRadius: 16, border: `2px solid ${selected ? artist.color : artist.color + '50'}`,
        overflow: 'hidden', width: '100%', aspectRatio: '3/4',
        cursor: dimmed ? 'not-allowed' : 'pointer', appearance: 'none', padding: 0,
        background: 'transparent',
        boxShadow: selected ? `0 0 24px ${artist.color}50` : undefined,
        transform: selected ? 'scale(1.05)' : undefined,
        opacity: dimmed ? 0.3 : 1,
        transition: 'transform .2s, box-shadow .2s, opacity .2s',
      }}
    >
      <div style={{ flex: 1, width: '100%', position: 'relative', background: `linear-gradient(145deg, ${artist.color}28, ${artist.color}08)` }}>
        <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
        <span style={{
          position: 'absolute', top: 6, right: 6, fontSize: 11, padding: '2px 6px',
          borderRadius: 99, fontWeight: 700,
          background: auctionColor + '99', color: 'white', border: `1px solid ${auctionColor}`,
        }}>
          {AUCTION_TYPE_ICONS[card.auctionType]}
        </span>
      </div>
      <div style={{ padding: '6px 8px', flexShrink: 0, textAlign: 'left', background: `${artist.color}20` }}>
        <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 900, color: artist.color, lineHeight: 1.2 }}>
          {artist.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--faint)' }}>{AUCTION_TYPE_LABELS[card.auctionType]}</div>
      </div>
    </button>
  );
}

// ─── 시장 현황 ────────────────────────────────────────────────
function MarketBoard({ roundMarket, artistValues, compact = false }: {
  roundMarket: Record<string, number>;
  artistValues: Record<string, number>;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ARTISTS.map(a => {
          const count = roundMarket[a.id] ?? 0;
          const value = artistValues[a.id] ?? 0;
          const pct = (count / 5) * 100;
          const isClose = count >= 4;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, width: 24, textAlign: 'center', flexShrink: 0 }}>{a.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: isClose ? 'var(--red)' : a.color, width: `${pct}%`, transition: 'width .5s' }} />
                </div>
              </div>
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: isClose ? 'var(--red)' : 'var(--faint)', width: 26, textAlign: 'right', flexShrink: 0 }}>
                {count}/5
              </span>
              {value > 0
                ? <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, fontWeight: 700, color: a.color, width: 28, textAlign: 'right', flexShrink: 0 }}>{value}M</span>
                : <span style={{ width: 28, flexShrink: 0 }} />
              }
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {ARTISTS.map(a => {
        const count = roundMarket[a.id] ?? 0;
        const value = artistValues[a.id] ?? 0;
        const pct = (count / 5) * 100;
        const isClose = count >= 4;
        return (
          <div key={a.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: 8, borderRadius: 12, background: a.color + '15',
          }}>
            <span style={{ fontSize: 22 }}>{a.avatar}</span>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: isClose ? 'var(--red)' : a.color, width: `${pct}%` }} />
            </div>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: isClose ? 'var(--red)' : 'var(--text-2)' }}>{count}/5</span>
            {value > 0 && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, fontWeight: 900, color: a.color }}>{value}M</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── 게임 레이아웃 ────────────────────────────────────────────
function GameLayout({ gs, children }: { gs: GameState; children: ReactNode }) {
  const currentPlayer = getCurrentPlayer(gs);
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <header style={{
        borderBottom: '1.5px solid var(--line)', background: 'rgba(0,0,0,0.3)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 10,
      }}>
        <span style={{ fontFamily: 'var(--f-disp)', fontSize: 13, letterSpacing: 2, color: 'var(--cyan)' }}>MODERN ART</span>
        <span style={{ width: 1, height: 16, background: 'var(--line-2)' }} />
        <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--dim)' }}>R{gs.round}/{gs.maxRounds}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', animation: 'arcBlink 1.1s steps(2,jump-none) infinite', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{currentPlayer.name}</span>
          <span style={{ color: 'var(--dim)', fontSize: 12, flexShrink: 0 }}>의 차례</span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 사이드바 */}
        <aside style={{
          display: 'none', flexDirection: 'column', width: 220, flexShrink: 0,
          borderRight: '1.5px solid var(--line)', background: 'rgba(0,0,0,0.15)', overflowY: 'auto',
        }} className="md-sidebar">
          <div style={{ padding: 14, borderBottom: '1.5px solid var(--line)' }}>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 12 }}>플레이어</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gs.players.map(p => {
                const isCurrent = p.id === currentPlayer.id;
                const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
                return (
                  <div key={p.id} className="arc-panel-inset" style={{
                    padding: '8px 10px',
                    borderColor: isCurrent ? 'rgba(255,183,43,0.35)' : 'var(--line)',
                    background: isCurrent ? 'rgba(255,183,43,0.08)' : undefined,
                  }}>
                    <div style={{ fontFamily: 'var(--f-kr)', fontSize: 12, fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isCurrent && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 7 }}>▶</span>}
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                      <span style={{ color: 'var(--green)', fontWeight: 900, fontSize: 14 }}>{p.cash}M</span>
                      {collVal > 0 && <span style={{ color: 'var(--faint)', fontSize: 10 }}>+{collVal}</span>}
                    </div>
                    <div style={{ color: 'var(--faint)', fontSize: 10, marginTop: 2 }}>패 {p.hand.length}장 · 수집 {p.collection.length}장</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <span className="arc-lbl" style={{ display: 'block', marginBottom: 10 }}>R{gs.round} 시장</span>
            <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} compact />
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}

// ─── 입찰 입력 ────────────────────────────────────────────────
function BidInput({ minBid, maxBid, onSubmit, label = '입찰' }: {
  minBid: number; maxBid: number; onSubmit: (v: number) => void; label?: string;
}) {
  const [val, setVal] = useState(minBid);
  const adjust = (d: number) => setVal(v => Math.min(maxBid, Math.max(minBid, v + d)));
  const presets = [10, 20, 50, 100].filter(v => v > minBid && v <= maxBid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 금액 표시 */}
      <div className="arc-panel-inset" style={{ padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--f-title)', fontSize: 48, color: 'var(--gold)', lineHeight: 1 }}>{val}</span>
        <span style={{ color: 'var(--dim)', fontSize: 18, marginLeft: 4, verticalAlign: 'text-top', paddingTop: 10, display: 'inline-block' }}>M</span>
      </div>
      {/* ±버튼 */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {([-5, -1, 1, 5] as const).map(d => (
          <button key={d} onClick={() => adjust(d)} className="arc-btn-ghost" style={{ width: 52, padding: '8px 0', fontSize: 14 }}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      {/* 빠른 선택 */}
      {presets.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {presets.map(v => (
            <button key={v} onClick={() => setVal(v)} className="arc-btn-ghost" style={{ flex: 1, fontSize: 12, padding: '7px 0' }}>
              {v}M
            </button>
          ))}
          <button onClick={() => setVal(maxBid)} className="arc-btn-ghost" style={{ flex: 1, fontSize: 12, padding: '7px 0' }}>
            MAX
          </button>
        </div>
      )}
      <button
        onClick={() => onSubmit(val)}
        disabled={val > maxBid || val < minBid}
        className="arc-btn"
        style={{ fontSize: 18 }}
      >
        {label} — {val}M
      </button>
    </div>
  );
}

// ─── 경매 중 카드 표시 ────────────────────────────────────────
function AuctionCardDisplay({ cards }: { cards: Card[] }) {
  const isDouble = cards.length === 2;
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: '8px 0' }}>
      {cards.map((card, idx) => {
        const artist = getArtistById(card.artistId);
        const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
        return (
          <div key={card.id} style={{
            borderRadius: 20, border: `2px solid ${idx === 0 && isDouble ? artist.color + 'aa' : artist.color}`,
            overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column',
            boxShadow: `0 0 60px ${artist.color}35, 0 8px 32px ${artist.color}20`,
            width: isDouble ? 140 : 180,
          }}>
            <div style={{ flex: 1, position: 'relative', aspectRatio: '3/4', background: `linear-gradient(145deg, ${artist.color}28, ${artist.color}08)` }}>
              <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
              <span style={{
                position: 'absolute', top: 8, right: 8, fontSize: 12, padding: '2px 6px',
                borderRadius: 99, fontWeight: 700, background: auctionColor + 'cc', color: 'white',
              }}>
                {AUCTION_TYPE_ICONS[card.auctionType]}
              </span>
            </div>
            <div style={{ padding: '8px 12px', textAlign: 'center', background: `${artist.color}20` }}>
              <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 13, color: artist.color }}>{artist.name}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{AUCTION_TYPE_LABELS[card.auctionType]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 보조 컴포넌트들 ──────────────────────────────────────────
function AuctionHeader({ icon, label, sellerName, color }: { icon: string; label: string; sellerName: string; color?: string }) {
  return (
    <div className="arc-panel-inset" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      borderColor: color ? color + '40' : 'var(--line)',
      background: color ? color + '10' : undefined,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 15, color: 'var(--text)' }}>{label}</div>
        <div style={{ color: 'var(--dim)', fontSize: 12, marginTop: 2 }}>판매자: {sellerName}</div>
      </div>
    </div>
  );
}

function CurrentBidDisplay({ bid, winnerName }: { bid: number; winnerName?: string }) {
  return (
    <div className="arc-panel-inset" style={{ padding: '14px', textAlign: 'center' }}>
      <span className="arc-lbl" style={{ display: 'block', marginBottom: 4 }}>현재 최고 입찰</span>
      <span style={{ fontFamily: 'var(--f-title)', fontSize: 42, color: 'var(--gold)' }}>{bid}M</span>
      {winnerName
        ? <div style={{ color: 'var(--dim)', fontSize: 13, marginTop: 4 }}>by {winnerName}</div>
        : <div style={{ color: 'var(--faint)', fontSize: 13, marginTop: 4 }}>아직 입찰 없음</div>
      }
    </div>
  );
}

function PlayerTurnBanner({ name, cash, badge }: { name: string; cash: number; badge?: string }) {
  return (
    <div style={{
      background: 'rgba(255,183,43,0.08)', border: '1.5px solid rgba(255,183,43,0.28)',
      borderRadius: 'var(--r)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 15, color: 'var(--gold)' }}>{name}{badge ? ` ${badge}` : ''}</div>
        <div style={{ color: 'var(--dim)', fontSize: 12, marginTop: 2 }}>의 차례</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: 'var(--green)', fontWeight: 900, fontSize: 20 }}>{cash}M</div>
        <div style={{ color: 'var(--faint)', fontSize: 10 }}>보유</div>
      </div>
    </div>
  );
}

function ActiveBidders({ playerIds, players, currentId }: {
  playerIds: string[]; players: GameState['players']; currentId: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {playerIds.map(id => {
        const p = players.find(pl => pl.id === id)!;
        const isCurrent = id === currentId;
        return (
          <span key={id} className="arc-chip" style={{
            fontSize: 12,
            color: isCurrent ? 'var(--gold)' : 'var(--dim)',
            borderColor: isCurrent ? 'rgba(255,183,43,0.4)' : 'var(--line)',
            background: isCurrent ? 'rgba(255,183,43,0.1)' : 'var(--surface-2)',
          }}>
            {isCurrent && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8 }}>▶ </span>}{p.name}
          </span>
        );
      })}
    </div>
  );
}

function OnceAroundProgress({ bidOrder, currentIdx, players }: {
  bidOrder: string[]; currentIdx: number; players: GameState['players'];
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {bidOrder.map((id, i) => {
        const p = players.find(pl => pl.id === id)!;
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <span key={id} className="arc-chip" style={{
            fontSize: 12,
            color: current ? 'var(--gold)' : done ? 'var(--faint)' : 'var(--dim)',
            borderColor: current ? 'rgba(255,183,43,0.4)' : 'var(--line)',
            background: current ? 'rgba(255,183,43,0.1)' : 'var(--surface-2)',
            textDecoration: done ? 'line-through' : undefined,
          }}>
            {current && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8 }}>▶ </span>}{p.name}
          </span>
        );
      })}
    </div>
  );
}

// ─── 메인 게임 ───────────────────────────────────────────────
function ModernArtGame() {
  const searchParams = useSearchParams();
  const [gs, setGs] = useState<GameState | null>(null);

  useEffect(() => {
    const playerParam = searchParams.get('players') ?? '플레이어 1,플레이어 2';
    const roundParam = Number(searchParams.get('rounds') ?? '4');
    const playerNames = playerParam.split(',').filter(Boolean);
    setGs(createGame(playerNames, roundParam));
  }, []);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setGs(prev => prev ? fn(prev) : prev);
  }, []);

  if (!gs) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' }}>
      <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>LOADING...</p>
    </div>
  );

  const currentPlayer = getCurrentPlayer(gs);
  const { phase, currentAuction, lastAuctionResult, roundEndArtistId } = gs;

  // ─── 턴 커버 ───────────────────────────────────────────────
  if (phase === 'turn-cover') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
        <div className="crt" />
        <div style={{ textAlign: 'center' }}>
          <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', letterSpacing: 2, marginBottom: 20 }}>
            ROUND {gs.round} / {gs.maxRounds}
          </p>
          <div className="arc-panel ticks arc-pop" style={{ padding: '32px 40px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>다음 차례</p>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 42, color: 'var(--gold)' }}>{currentPlayer.name}</div>
            <p style={{ color: 'var(--text-2)', fontSize: 15, margin: 0 }}>의 차례입니다</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--faint)', marginTop: 4 }}>
              <span>패 {currentPlayer.hand.length}장</span>
              <span>·</span>
              <span>💰 {currentPlayer.cash}M</span>
            </div>
          </div>
        </div>
        <button onClick={() => update(s => ({ ...s, phase: 'select-card' }))} className="arc-btn" style={{ maxWidth: 280, width: '100%', fontSize: 18 }}>
          <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 4 }}>▶</span>
          카드 보기
        </button>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p className="arc-lbl" style={{ textAlign: 'center', marginBottom: 10 }}>이번 라운드 시장</p>
          <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} />
        </div>
      </div>
    );
  }

  // ─── 카드 선택 ─────────────────────────────────────────────
  if (phase === 'select-card') {
    const hand = currentPlayer.hand;
    if (hand.length === 0) { update(s => acknowledgeResult(s)); return null; }
    return (
      <GameLayout gs={gs}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>경매에 올릴 카드를 선택하세요</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {hand.map(card => (
              <ArtCard key={card.id} card={card} onClick={() => update(s => selectCard(s, card.id))} />
            ))}
          </div>
          <div style={{ paddingTop: 12, borderTop: '1.5px solid var(--line)' }}>
            <p className="arc-lbl" style={{ marginBottom: 8 }}>이번 라운드 시장</p>
            <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} />
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 더블 경매: 두 번째 카드 선택 ─────────────────────────
  if (phase === 'double-select-second') {
    const firstCardId = gs.pendingDoubleCardId!;
    const firstCard = currentPlayer.hand.find(c => c.id === firstCardId)!;
    const sameArtist = currentPlayer.hand.filter(c => c.id !== firstCardId && c.artistId === firstCard.artistId);
    return (
      <GameLayout gs={gs}>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--red)', marginBottom: 4 }}>🎴 더블 경매</div>
            <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>같은 작가의 카드를 하나 더 선택하세요</p>
          </div>
          <div style={{ width: 96 }}><ArtCard card={firstCard} selected /></div>
          <p style={{ color: 'var(--faint)', fontSize: 12, margin: 0 }}>+ 아래 중 하나 선택</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
            {sameArtist.map(card => (
              <ArtCard key={card.id} card={card} onClick={() => update(s => selectDoubleSecond(s, card.id))} />
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 경매 ──────────────────────────────────────────────────
  if (phase === 'auction' && currentAuction) {
    const seller = getPlayerById(gs, currentAuction.sellerId)!;

    // 공개 / 더블
    if (currentAuction.type === 'open' || currentAuction.type === 'double') {
      const a = currentAuction as OpenAuction;
      const currentBidderId = a.activeBidderIds[a.currentBidderIndex];
      const currentBidder = getPlayerById(gs, currentBidderId)!;
      const isWinner = a.currentWinnerId === currentBidderId;
      const auctionColor = AUCTION_TYPE_COLORS[a.type];
      const label = a.type === 'double' ? '더블 경매' : '공개 경매';
      const icon = a.type === 'double' ? '🎴' : '📣';
      return (
        <GameLayout gs={gs}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AuctionHeader icon={icon} label={label} sellerName={seller.name} color={auctionColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentBidder.name} cash={currentBidder.cash} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <BidInput minBid={a.currentBid + 1} maxBid={currentBidder.cash} onSubmit={v => update(s => openBid(s, v))} />
              {isWinner ? (
                <button onClick={() => update(s => openStand(s))} className="arc-btn" style={{ background: 'linear-gradient(180deg, var(--green) 0%, #5aaa3a 100%)', boxShadow: '0 6px 0 0 #3a7a20', color: '#0a1f04' }}>
                  ✅ 낙찰 확정 ({a.currentBid}M)
                </button>
              ) : (
                <button onClick={() => update(s => openPass(s))} className="arc-btn-ghost">패스</button>
              )}
            </div>
            <ActiveBidders playerIds={a.activeBidderIds} players={gs.players} currentId={currentBidderId} />
          </div>
        </GameLayout>
      );
    }

    // 지정가
    if (currentAuction.type === 'fixed') {
      const a = currentAuction as FixedAuction;
      const fixedColor = AUCTION_TYPE_COLORS['fixed'];
      if (a.subPhase === 'setting') {
        const sellerPlayer = getPlayerById(gs, a.sellerId)!;
        return (
          <GameLayout gs={gs}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AuctionHeader icon="🏷️" label="지정가 경매" sellerName={seller.name} color={fixedColor} />
              <AuctionCardDisplay cards={a.cards} />
              <div className="arc-panel-inset" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderColor: fixedColor + '40' }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, color: 'var(--text)' }}>{sellerPlayer.name}</div>
                  <div style={{ color: 'var(--dim)', fontSize: 12 }}>판매 가격을 설정하세요</div>
                </div>
                <span style={{ color: 'var(--faint)', fontSize: 12 }}>{sellerPlayer.cash}M 보유</span>
              </div>
              <BidInput minBid={1} maxBid={999} onSubmit={v => update(s => fixedSetPrice(s, v))} label="가격 설정" />
            </div>
          </GameLayout>
        );
      }
      const nonSellers = gs.players.filter(p => p.id !== a.sellerId);
      const offerTo = nonSellers[a.currentOfferIndex];
      return (
        <GameLayout gs={gs}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AuctionHeader icon="🏷️" label="지정가 경매" sellerName={seller.name} color={fixedColor} />
            <AuctionCardDisplay cards={a.cards} />
            <div className="arc-panel-inset" style={{ padding: '14px', textAlign: 'center' }}>
              <span className="arc-lbl" style={{ display: 'block', marginBottom: 4 }}>지정 가격</span>
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 42, color: 'var(--gold)' }}>{a.fixedPrice}M</span>
            </div>
            <PlayerTurnBanner name={offerTo.name} cash={offerTo.cash} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => update(s => fixedAccept(s))} className="arc-btn" style={{ background: 'linear-gradient(180deg, var(--green) 0%, #5aaa3a 100%)', boxShadow: '0 6px 0 0 #3a7a20', color: '#0a1f04', fontSize: 18 }}>
                💰 구매 ({a.fixedPrice}M)
              </button>
              <button onClick={() => update(s => fixedDecline(s))} className="arc-btn-ghost">거절</button>
            </div>
            {nonSellers.slice(a.currentOfferIndex + 1).length > 0 && (
              <p style={{ color: 'var(--faint)', fontSize: 12, textAlign: 'center', margin: 0 }}>
                다음 제안: {nonSellers.slice(a.currentOfferIndex + 1).map(p => p.name).join(', ')}
              </p>
            )}
          </div>
        </GameLayout>
      );
    }

    // 비밀
    if (currentAuction.type === 'secret') {
      const a = currentAuction as SecretAuction;
      const secretColor = AUCTION_TYPE_COLORS['secret'];
      if (a.subPhase === 'collecting') {
        const bidderId = a.bidOrder[a.currentBidderIndex];
        const bidder = getPlayerById(gs, bidderId)!;
        return (
          <GameLayout gs={gs}>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AuctionHeader icon="🤫" label="비밀 경매" sellerName={seller.name} color={secretColor} />
              <AuctionCardDisplay cards={a.cards} />
              <PlayerTurnBanner name={bidder.name} cash={bidder.cash} />
              <p className="arc-panel-inset" style={{ padding: '12px 16px', color: 'var(--dim)', fontSize: 13, textAlign: 'center', margin: 0 }}>
                다른 플레이어가 보지 못하게 입찰 금액을 입력하세요
              </p>
              <BidInput minBid={0} maxBid={bidder.cash} onSubmit={v => update(s => secretSubmitBid(s, v))} label="비밀 입찰" />
              {a.currentBidderIndex > 0 && (
                <p style={{ color: 'var(--faint)', fontSize: 12, textAlign: 'center', margin: 0 }}>
                  완료: {a.bidOrder.slice(0, a.currentBidderIndex).map(id => getPlayerById(gs, id)?.name).join(', ')}
                </p>
              )}
            </div>
          </GameLayout>
        );
      }
      const entries = Object.entries(a.bids).map(([id, bid]) => ({ player: getPlayerById(gs, id)!, bid })).sort((x, y) => y.bid - x.bid);
      return (
        <GameLayout gs={gs}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AuctionHeader icon="🤫" label="비밀 경매 — 결과 공개" sellerName={seller.name} color={secretColor} />
            <AuctionCardDisplay cards={a.cards} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map((e, i) => (
                <div key={e.player.id} className="arc-panel-inset" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                  borderColor: i === 0 ? 'rgba(255,183,43,0.4)' : 'var(--line)',
                  background: i === 0 ? 'rgba(255,183,43,0.08)' : undefined,
                }}>
                  <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, color: i === 0 ? 'var(--gold)' : 'var(--dim)' }}>
                    {i === 0 && '🏆 '}{e.player.name}
                  </span>
                  <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: i === 0 ? 'var(--gold)' : 'var(--faint)' }}>{e.bid}M</span>
                </div>
              ))}
            </div>
            <button onClick={() => update(s => secretResolve(s))} className="arc-btn" style={{ fontSize: 16 }}>낙찰 확정</button>
          </div>
        </GameLayout>
      );
    }

    // 한 바퀴
    if (currentAuction.type === 'once-around') {
      const a = currentAuction as OnceAroundAuction;
      const currentOfferId = a.bidOrder[a.currentOfferIndex];
      const currentOfferPlayer = getPlayerById(gs, currentOfferId)!;
      const isSeller = currentOfferId === a.sellerId;
      const onceColor = AUCTION_TYPE_COLORS['once-around'];
      return (
        <GameLayout gs={gs}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AuctionHeader icon="🔄" label="한 바퀴 경매" sellerName={seller.name} color={onceColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentOfferPlayer.name} cash={currentOfferPlayer.cash} badge={isSeller ? '(판매자)' : undefined} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <BidInput minBid={a.currentBid + 1} maxBid={currentOfferPlayer.cash} onSubmit={v => update(s => onceAroundBid(s, v))} />
              <button onClick={() => update(s => onceAroundPass(s))} className="arc-btn-ghost">
                {isSeller && !a.currentWinnerId ? '가져가기 (공짜)' : '패스'}
              </button>
            </div>
            <OnceAroundProgress bidOrder={a.bidOrder} currentIdx={a.currentOfferIndex} players={gs.players} />
          </div>
        </GameLayout>
      );
    }
  }

  // ─── 경매 결과 ─────────────────────────────────────────────
  if (phase === 'auction-result' && lastAuctionResult) {
    const winner = getPlayerById(gs, lastAuctionResult.winnerId)!;
    const seller = getPlayerById(gs, lastAuctionResult.sellerId)!;
    const isNoContest = lastAuctionResult.noContest;
    const triggerArtist = roundEndArtistId ? getArtistById(roundEndArtistId) : null;
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <div className="crt" />
        {triggerArtist && (
          <div style={{ background: 'rgba(255,90,77,0.1)', border: '1.5px solid rgba(255,90,77,0.4)', borderRadius: 'var(--r)', padding: '12px 16px', textAlign: 'center', width: '100%', maxWidth: 340 }}>
            <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 16, color: 'var(--red)' }}>⚠️ 라운드 종료!</div>
            <div style={{ color: 'var(--dim)', fontSize: 13, marginTop: 4 }}>{triggerArtist.avatar} {triggerArtist.name} 5장 달성</div>
          </div>
        )}
        <div className="arc-panel ticks" style={{ padding: '28px 32px', textAlign: 'center', width: '100%', maxWidth: 340 }}>
          {isNoContest ? (
            <>
              <p style={{ color: 'var(--dim)', fontSize: 13, margin: '0 0 8px' }}>낙찰자 없음</p>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 32, color: 'var(--gold)' }}>{seller.name}</div>
              <p style={{ color: 'var(--text-2)', margin: '4px 0 0' }}>이 가져갑니다</p>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--dim)', fontSize: 13, margin: '0 0 8px' }}>낙찰!</p>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 36, color: 'var(--gold)' }}>{winner.name}</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text-2)', marginTop: 6 }}>{lastAuctionResult.price}M</div>
              {winner.id !== seller.id && (
                <div style={{ color: 'var(--faint)', fontSize: 12, marginTop: 4 }}>판매자 {seller.name} +{lastAuctionResult.price}M</div>
              )}
            </>
          )}
        </div>
        <AuctionCardDisplay cards={lastAuctionResult.cards} />
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gs.players.map(p => (
            <div key={p.id} className="arc-panel-inset" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 600, color: 'var(--text-2)', fontSize: 13 }}>{p.name}</span>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>{p.cash}M</span>
            </div>
          ))}
        </div>
        <button onClick={() => update(s => acknowledgeResult(s))} className="arc-btn" style={{ maxWidth: 340, width: '100%', fontSize: 16 }}>
          {triggerArtist ? '라운드 채점 보기' : '다음 턴'}
        </button>
      </div>
    );
  }

  // ─── 라운드 채점 ────────────────────────────────────────────
  if (phase === 'round-scoring') {
    const lastResult = gs.roundResults[gs.roundResults.length - 1];
    const isLastRound = gs.round >= gs.maxRounds;
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '16px 16px 40px' }}>
        <div className="crt" />
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p className="arc-lbl" style={{ marginBottom: 4 }}>라운드 {gs.round} 종료</p>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)' }}>작가 순위 및 가치</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lastResult.rankings.filter(r => r.count > 0).map(r => {
              const artist = getArtistById(r.artistId);
              return (
                <div key={r.artistId} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  borderRadius: 'var(--r)', background: artist.color + '10',
                  borderLeft: `3px solid ${artist.color}`,
                }}>
                  <span style={{ fontSize: 28 }}>{artist.avatar}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 13, color: artist.color }}>{artist.name}</div>
                    <div style={{ color: 'var(--faint)', fontSize: 11, marginTop: 2 }}>{r.count}장 출품</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.rank ? (
                      <>
                        <div style={{ color: 'var(--dim)', fontSize: 11 }}>{r.rank}위 +{r.addedValue}M</div>
                        <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--gold)' }}>= {r.cumulativeValue}M</div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--faint)', fontSize: 12 }}>순위 외</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="arc-lbl" style={{ marginBottom: 12 }}>현재 자산 순위</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gs.players
                .map(p => {
                  const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
                  return { ...p, collVal, total: p.cash + collVal };
                })
                .sort((a, b) => b.total - a.total)
                .map((p, i) => (
                  <div key={p.id} className="arc-panel-inset" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderColor: i === 0 ? 'rgba(255,183,43,0.3)' : 'var(--line)',
                    background: i === 0 ? 'rgba(255,183,43,0.06)' : undefined,
                  }}>
                    <span style={{ fontFamily: 'var(--f-pix)', fontSize: 11, color: i === 0 ? 'var(--gold)' : 'var(--faint)', width: 20, textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontFamily: 'var(--f-kr)', fontWeight: 700, color: i === 0 ? 'var(--text)' : 'var(--text-2)' }}>{p.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--faint)', fontSize: 11 }}>현금 {p.cash}M + 작품 {p.collVal}M</div>
                      <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>{p.total}M</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <button onClick={() => update(s => acknowledgeScoring(s))} className="arc-btn" style={{ fontSize: 18 }}>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 4 }}>▶</span>
            {isLastRound ? '최종 결과 보기' : `라운드 ${gs.round + 1} 시작`}
          </button>
        </div>
      </div>
    );
  }

  // ─── 게임 종료 ─────────────────────────────────────────────
  if (phase === 'game-over') {
    const finalScores = calcFinalScores(gs);
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '16px 16px 40px' }}>
        <div className="crt" />
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
            <div className="arc-float" style={{ fontSize: 60, marginBottom: 12 }}>🏆</div>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 36, color: 'var(--gold)' }}>{finalScores[0].name}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 18, marginTop: 4 }}>승리!</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {finalScores.map((p, i) => (
              <div key={p.id} className="arc-panel ticks" style={{
                padding: '18px 18px',
                borderColor: i === 0 ? 'rgba(255,183,43,0.35)' : 'var(--line)',
                background: i === 0 ? 'rgba(255,183,43,0.06)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: i === 0 ? 'var(--gold)' : 'var(--faint)', width: 36 }}>{i + 1}위</span>
                  <span style={{ flex: 1, fontFamily: 'var(--f-title)', fontSize: 20, color: i === 0 ? 'var(--text)' : 'var(--text-2)' }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>{p.total}M</span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--faint)', marginBottom: 10 }}>
                  <span>💰 현금 {p.cash}M</span>
                  <span>🎨 작품 {p.collectionValue}M</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.cardsByArtist.filter(a => a.count > 0).map(a => {
                    const artist = getArtistById(a.artistId);
                    return (
                      <span key={a.artistId} className="arc-chip" style={{ fontSize: 11, color: artist.color, borderColor: artist.color + '40', background: artist.color + '18' }}>
                        {artist.avatar} ×{a.count} ({a.value > 0 ? `${a.count * a.value}M` : '0M'})
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="arc-lbl" style={{ marginBottom: 12 }}>최종 작가 가치</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {ARTISTS.map(a => (
                <div key={a.id} className="arc-panel-inset" style={{ padding: '10px 6px', textAlign: 'center', borderColor: a.color + '30', background: a.color + '10' }}>
                  <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{a.avatar}</span>
                  <span style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: a.color }}>{gs.artistValues[a.id] ?? 0}M</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/modern-art" className="arc-btn arc-btn--cyan" style={{ display: 'flex', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>
              다시 하기
            </a>
            <a href="/lobby" className="arc-btn-ghost" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              로비로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── 페이지 래퍼 ─────────────────────────────────────────────
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' }}>
        <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>LOADING...</p>
      </div>
    }>
      <ModernArtGame />
    </Suspense>
  );
}
