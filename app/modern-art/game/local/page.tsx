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

// ─── 작품명 추출 ──────────────────────────────────────────────
function getArtworkTitle(artistId: string, artworkIndex: number): string {
  const artist = getArtistById(artistId);
  const src = artist.images[artworkIndex % artist.images.length];
  if (!src) return '';
  const filename = (src.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  const prefixes = ['yugi', 'digimon', 'digmon', 'pokemon', 'indi', 'nintendo'];
  const parts = filename.split('-');
  const startIdx = prefixes.includes(parts[0]) ? 1 : 0;
  return parts.slice(startIdx).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// ─── 작품 이미지 ──────────────────────────────────────────────
function ArtworkImage({ artistId, avatar, artworkIndex, className }: {
  artistId: string; avatar: string; artworkIndex: number; className?: string;
}) {
  const [err, setErr] = useState(false);
  const artist = getArtistById(artistId);
  const src = artist.images[artworkIndex % artist.images.length];
  if (err || !src) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 48 }}>{avatar}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
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
        overflow: 'hidden', width: '100%', aspectRatio: '3/5',
        cursor: dimmed ? 'not-allowed' : 'pointer', appearance: 'none', padding: 0,
        background: 'transparent',
        boxShadow: selected ? `0 0 24px ${artist.color}50` : undefined,
        transform: selected ? 'scale(1.05)' : undefined,
        opacity: dimmed ? 0.3 : 1,
        transition: 'transform .2s, box-shadow .2s, opacity .2s',
      }}
    >
      {/* 작가 헤더 바 */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        padding: '5px 8px', flexShrink: 0,
        background: artist.color, color: '#000',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12 }}>{artist.avatar}</span>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>{artist.name}</span>
        </div>
        <div style={{ fontFamily: 'var(--f-kr)', fontSize: 8, fontWeight: 700, lineHeight: 1.2, marginTop: 2, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getArtworkTitle(card.artistId, card.artworkIndex)}
        </div>
      </div>
      {/* 이미지 */}
      <div style={{ flex: 1, width: '100%', overflow: 'hidden', background: artist.color + '12' }}>
        <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
      </div>
      {/* 경매 타입 푸터 바 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '4px 8px', flexShrink: 0,
        background: auctionColor + 'cc', color: 'white',
      }}>
        <span style={{ fontSize: 11 }}>{AUCTION_TYPE_ICONS[card.auctionType]}</span>
        <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, fontWeight: 700 }}>{AUCTION_TYPE_LABELS[card.auctionType]}</span>
      </div>
    </button>
  );
}

// ─── 핸드 카드 행 (카드 선택용 컴팩트 가로형) ────────────────
function HandCardRow({ card, onClick, dimmed, selected }: {
  card: Card; onClick?: () => void; dimmed?: boolean; selected?: boolean;
}) {
  const artist = getArtistById(card.artistId);
  const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
  const title = getArtworkTitle(card.artistId, card.artworkIndex);
  return (
    <button
      onClick={onClick}
      disabled={dimmed}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        borderRadius: 10,
        border: `2px solid ${selected ? artist.color : artist.color + '40'}`,
        overflow: 'hidden', width: '100%', height: 62,
        cursor: dimmed ? 'not-allowed' : 'pointer',
        appearance: 'none', padding: 0,
        background: selected ? artist.color + '18' : artist.color + '08',
        opacity: dimmed ? 0.3 : 1,
        boxShadow: selected ? `0 0 14px ${artist.color}40` : undefined,
        flexShrink: 0,
        transition: 'all .15s',
      }}
    >
      {/* 작가 컬러 밴드 */}
      <div style={{
        width: 46, flexShrink: 0, background: artist.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 20 }}>{artist.avatar}</span>
      </div>
      {/* 작품명 + 작가명 + 경매타입 */}
      <div style={{ flex: 1, padding: '8px 10px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || artist.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: artist.color, fontWeight: 700 }}>{artist.name}</span>
          <span style={{ width: 1, height: 10, background: 'var(--line-2)', flexShrink: 0 }} />
          <span style={{
            fontSize: 9, background: auctionColor + 'dd', color: '#fff',
            padding: '2px 6px', borderRadius: 4,
            fontFamily: 'var(--f-kr)', fontWeight: 700, flexShrink: 0,
          }}>
            {AUCTION_TYPE_ICONS[card.auctionType]} {AUCTION_TYPE_LABELS[card.auctionType]}
          </span>
        </div>
      </div>
      {/* 썸네일 */}
      <div style={{ width: 46, flexShrink: 0, overflow: 'hidden' }}>
        <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
      </div>
    </button>
  );
}

// ─── 부채꼴 카드 핸드 ─────────────────────────────────────────
function FanHand({ cards, onSelect }: { cards: Card[]; onSelect: (id: string) => void }) {
  const [raisedId, setRaisedId] = useState<string | null>(null);
  const n = cards.length;
  const CARD_W = 96;
  const CARD_H = 140;
  const maxAngle = Math.min(20, n * 3.2);
  const spreadPerCard = n <= 1 ? 0 : Math.min(38, 280 / (n - 1));
  const totalSpread = spreadPerCard * (n - 1);
  const containerW = totalSpread + CARD_W;
  const containerH = CARD_H + 64; // 64 = raised headroom

  const raisedCard = raisedId ? cards.find(c => c.id === raisedId) : null;
  const raisedArtist = raisedCard ? getArtistById(raisedCard.artistId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 선택된 카드 정보 패널 */}
      <div style={{
        minHeight: 64,
        borderRadius: 12, marginBottom: 8,
        padding: '10px 14px',
        background: raisedArtist ? raisedArtist.color + '14' : 'var(--surface-2)',
        border: `1.5px solid ${raisedArtist ? raisedArtist.color + '50' : 'var(--line)'}`,
        transition: 'all .25s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {raisedCard && raisedArtist ? (
          <>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `2px solid ${raisedArtist.color}60` }}>
              <ArtworkImage artistId={raisedArtist.id} avatar={raisedArtist.avatar} artworkIndex={raisedCard.artworkIndex} className="w-full h-full" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 900, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getArtworkTitle(raisedCard.artistId, raisedCard.artworkIndex) || raisedArtist.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: raisedArtist.color, fontWeight: 700 }}>{raisedArtist.avatar} {raisedArtist.name}</span>
                <span style={{ width: 1, height: 10, background: 'var(--line-2)', flexShrink: 0 }} />
                <span style={{ fontSize: 9, background: AUCTION_TYPE_COLORS[raisedCard.auctionType] + 'dd', color: '#fff', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--f-kr)', fontWeight: 700, flexShrink: 0 }}>
                  {AUCTION_TYPE_ICONS[raisedCard.auctionType]} {AUCTION_TYPE_LABELS[raisedCard.auctionType]}
                </span>
              </div>
            </div>
            <button
              onClick={() => onSelect(raisedCard.id)}
              className="arc-btn"
              style={{ padding: '10px 14px', fontSize: 13, flexShrink: 0 }}
            >
              경매 올리기
            </button>
          </>
        ) : (
          <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--faint)' }}>
            카드를 눌러 선택하세요
          </div>
        )}
      </div>

      {/* 부채꼴 카드 영역 */}
      <div style={{ position: 'relative', width: containerW, height: containerH, margin: '0 auto', flexShrink: 0 }}>
        {cards.map((card, i) => {
          const artist = getArtistById(card.artistId);
          const normI = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 ~ 1
          const angle = normI * maxAngle;
          const xPos = i * spreadPerCard;
          const isRaised = card.id === raisedId;
          return (
            <button
              key={card.id}
              onClick={() => setRaisedId(isRaised ? null : card.id)}
              style={{
                position: 'absolute',
                bottom: 0,
                left: xPos,
                width: CARD_W,
                height: CARD_H,
                padding: 0,
                appearance: 'none',
                cursor: 'pointer',
                border: `2px solid ${isRaised ? artist.color : artist.color + '70'}`,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'transparent',
                transform: `rotate(${angle}deg) translateY(${isRaised ? -54 : 0}px)`,
                transformOrigin: '50% 145%',
                transition: 'transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .2s, border-color .2s',
                zIndex: isRaised ? 100 : i,
                boxShadow: isRaised ? `0 8px 24px ${artist.color}60, 0 0 0 2px ${artist.color}` : `0 2px 8px rgba(0,0,0,0.4)`,
              }}
            >
              {/* 헤더 */}
              <div style={{
                background: artist.color,
                padding: '5px 7px',
                display: 'flex', flexDirection: 'column', gap: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 11 }}>{artist.avatar}</span>
                  <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, fontWeight: 900, lineHeight: 1, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
                </div>
                <div style={{ fontFamily: 'var(--f-kr)', fontSize: 8, color: '#000', opacity: 0.7, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getArtworkTitle(card.artistId, card.artworkIndex)}
                </div>
              </div>
              {/* 이미지 */}
              <div style={{ flex: 1, width: '100%', height: CARD_H - 42, overflow: 'hidden', background: artist.color + '18' }}>
                <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
              </div>
              {/* 경매 타입 푸터 */}
              <div style={{
                background: AUCTION_TYPE_COLORS[card.auctionType] + 'cc',
                padding: '3px 5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 10 }}>{AUCTION_TYPE_ICONS[card.auctionType]}</span>
                <span style={{ fontFamily: 'var(--f-kr)', fontSize: 9, color: '#fff', fontWeight: 700 }}>{AUCTION_TYPE_LABELS[card.auctionType]}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ARTISTS.map(a => {
          const count = roundMarket[a.id] ?? 0;
          const value = artistValues[a.id] ?? 0;
          const pct = (count / 5) * 100;
          const isClose = count >= 4;
          const isDone = count >= 5;
          const barColor = isDone ? 'var(--red)' : isClose ? '#ff8800' : a.color;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{a.avatar}</span>
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 9, color: a.color, fontWeight: 700, width: 46, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <div style={{ flex: 1 }}>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width .5s' }} />
                </div>
              </div>
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: isDone ? 'var(--red)' : isClose ? '#ff8800' : 'var(--faint)', width: 22, textAlign: 'right', flexShrink: 0 }}>
                {isDone ? '⚠️' : `${count}/5`}
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
        const isDone = count >= 5;
        const barColor = isDone ? 'var(--red)' : isClose ? '#ff8800' : a.color;
        return (
          <div key={a.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 6px', borderRadius: 12,
            background: isDone ? 'rgba(255,60,60,0.1)' : a.color + '15',
            border: `1px solid ${isDone ? 'rgba(255,60,60,0.3)' : isClose ? a.color + '50' : a.color + '20'}`,
          }}>
            <span style={{ fontSize: 20 }}>{a.avatar}</span>
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 9, color: isDone ? 'var(--red)' : a.color, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{a.name}</span>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: barColor, width: `${pct}%`, transition: 'width .4s' }} />
            </div>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: isDone ? 'var(--red)' : isClose ? '#ff8800' : 'var(--text-2)' }}>
              {isDone ? '⚠️ 종료' : `${count}/5`}
            </span>
            {value > 0 && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 9, fontWeight: 900, color: a.color }}>{value}M</span>}
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
        padding: '8px 16px 10px', flexShrink: 0, zIndex: 10,
      }}>
        {/* Row 1: 타이틀 + 라운드 + 플레이어 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--f-disp)', fontSize: 12, letterSpacing: 2, color: 'var(--cyan)' }}>MODERN ART</span>
          <span style={{ width: 1, height: 14, background: 'var(--line-2)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--dim)' }}>R{gs.round}/{gs.maxRounds}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', animation: 'arcBlink 1.1s steps(2,jump-none) infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, color: 'var(--gold)', fontSize: 12 }}>{currentPlayer.name}</span>
            <span style={{ fontFamily: 'var(--f-title)', fontSize: 13, color: 'var(--green)', fontWeight: 900 }}>{currentPlayer.cash}M</span>
          </div>
        </div>
        {/* Row 2: 미니 시장 현황 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
          {ARTISTS.map(a => {
            const count = gs.roundMarket[a.id] ?? 0;
            const isClose = count >= 4;
            const isDone = count >= 5;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, flexShrink: 0 }}>{a.avatar}</span>
                <div style={{ flex: 1, height: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / 5) * 100}%`, background: isDone ? 'var(--red)' : isClose ? '#ff8800' : a.color, borderRadius: 2, transition: 'width .4s' }} />
                </div>
                <span style={{ fontFamily: 'var(--f-pix)', fontSize: 7, color: isDone ? 'var(--red)' : isClose ? '#ff8800' : 'var(--faint)', flexShrink: 0, minWidth: 10, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
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

// ─── 플레이어 상태 행 (경매용) ───────────────────────────────
function PlayerRow({ name, cash, status, accentColor, sub }: {
  name: string; cash: number;
  status: 'current' | 'winner' | 'passed' | 'waiting' | 'seller';
  accentColor?: string; sub?: string;
}) {
  const icon = status === 'current' ? '▶' : status === 'winner' ? '👑' : status === 'seller' ? '🎨' : status === 'passed' ? '—' : '○';
  const borderColor = status === 'current' ? (accentColor ? accentColor + '70' : 'rgba(255,183,43,0.5)')
    : status === 'winner' ? 'rgba(100,220,100,0.35)' : 'var(--line)';
  const bg = status === 'current' ? (accentColor ? accentColor + '14' : 'rgba(255,183,43,0.10)')
    : status === 'winner' ? 'rgba(100,220,100,0.07)' : 'var(--surface-2)';
  const nameColor = status === 'current' ? (accentColor ?? 'var(--gold)') : status === 'passed' ? 'var(--faint)' : 'var(--text)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
      border: `1.5px solid ${borderColor}`, background: bg,
      opacity: status === 'passed' ? 0.4 : 1, transition: 'all .2s',
    }}>
      <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 13, color: nameColor }}>{name}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ color: 'var(--green)', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{cash}M</span>
    </div>
  );
}

// ─── 메인 게임 ───────────────────────────────────────────────
function ModernArtGame() {
  const searchParams = useSearchParams();
  const [gs, setGs] = useState<GameState | null>(null);
  const [secretCoverFor, setSecretCoverFor] = useState<string | null>(null);

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

  // ─── 비밀 경매 기기 전달 화면 ──────────────────────────────
  if (secretCoverFor) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}>
        <div className="crt" />
        <div className="arc-panel ticks" style={{ padding: '32px 28px', textAlign: 'center', maxWidth: 340, width: '100%' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>기기를 전달하세요</div>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 34, color: 'var(--cyan)', marginBottom: 6 }}>{secretCoverFor}</div>
          <div style={{ fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--text-2)' }}>님이 준비되면 버튼을 누르세요</div>
        </div>
        <button onClick={() => setSecretCoverFor(null)} className="arc-btn" style={{ maxWidth: 340, width: '100%', fontSize: 18 }}>
          준비됐어요 →
        </button>
      </div>
    );
  }

  // ─── 턴 커버 ───────────────────────────────────────────────
  if (phase === 'turn-cover') {
    const sortedPlayers = [...gs.players]
      .map(p => {
        const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
        return { ...p, collVal, total: p.cash + collVal };
      })
      .sort((a, b) => b.total - a.total);

    // 현재 플레이어 패 작가별 분포
    const handDist = ARTISTS
      .map(a => ({ artist: a, count: currentPlayer.hand.filter(c => c.artistId === a.id).length }))
      .filter(g => g.count > 0);

    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '20px 18px 32px', gap: 16, overflowY: 'auto' }}>
        <div className="crt" />

        {/* 라운드 표시 */}
        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', letterSpacing: 2, textAlign: 'center', margin: 0 }}>
          ROUND {gs.round} / {gs.maxRounds}
        </p>

        {/* 플레이어 이름 + 보유 정보 */}
        <div className="arc-panel ticks arc-pop" style={{ padding: '22px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--dim)', fontSize: 12, margin: '0 0 4px' }}>다음 차례</p>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 40, color: 'var(--gold)', lineHeight: 1 }}>{currentPlayer.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--green)' }}>{currentPlayer.cash}M</div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 7, color: 'var(--faint)' }}>현금</div>
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--line-2)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text-2)' }}>{currentPlayer.hand.length}장</div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 7, color: 'var(--faint)' }}>패</div>
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--line-2)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text-2)' }}>{currentPlayer.collection.length}장</div>
              <div style={{ fontFamily: 'var(--f-pix)', fontSize: 7, color: 'var(--faint)' }}>수집</div>
            </div>
          </div>
          {/* 패 작가 분포 힌트 */}
          {handDist.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {handDist.map(({ artist, count }) => (
                <span key={artist.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 8px', borderRadius: 6,
                  background: artist.color + '20', border: `1px solid ${artist.color}40`,
                  fontFamily: 'var(--f-kr)', fontSize: 11, color: artist.color, fontWeight: 700,
                }}>
                  {artist.avatar} ×{count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 플레이어 순위 */}
        <div>
          <p className="arc-lbl" style={{ marginBottom: 8 }}>현재 자산 순위</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sortedPlayers.map((p, i) => {
              const isCurrent = p.id === currentPlayer.id;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                  background: isCurrent ? 'rgba(255,183,43,0.08)' : 'var(--surface-2)',
                  border: `1.5px solid ${isCurrent ? 'rgba(255,183,43,0.3)' : 'var(--line)'}`,
                }}>
                  <span style={{ fontFamily: 'var(--f-title)', fontSize: 13, color: i === 0 ? 'var(--gold)' : 'var(--faint)', width: 20, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--text-2)' }}>
                    {isCurrent && <span style={{ fontFamily: 'var(--f-pix)', fontSize: 7, marginRight: 4 }}>▶</span>}
                    {p.name}
                  </span>
                  <span style={{ color: 'var(--green)', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{p.cash}M</span>
                  {p.collVal > 0 && <span style={{ color: 'var(--faint)', fontSize: 11, flexShrink: 0 }}>+{p.collVal}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 내 카드 보기 버튼 */}
        <button onClick={() => update(s => ({ ...s, phase: 'select-card' }))} className="arc-btn" style={{ fontSize: 18 }}>
          <span style={{ fontFamily: 'var(--f-pix)', fontSize: 10, marginRight: 4 }}>▶</span>
          내 카드 보기
        </button>

        {/* 시장 현황 */}
        <div>
          <p className="arc-lbl" style={{ marginBottom: 10 }}>이번 라운드 시장</p>
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
        <div style={{ padding: '14px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0, fontFamily: 'var(--f-kr)' }}>경매에 올릴 카드를 선택하세요</p>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: 'var(--faint)' }}>{hand.length}장</span>
          </div>
          <FanHand cards={hand} onSelect={id => update(s => selectCard(s, id))} />
          <div>
            <p className="arc-lbl" style={{ marginBottom: 8 }}>이번 라운드 시장</p>
            <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} compact />
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 더블 경매: 두 번째 카드 선택 ─────────────────────────
  if (phase === 'double-select-second') {
    const firstCardId = gs.pendingDoubleCardId!;
    const firstCard = currentPlayer.hand.find(c => c.id === firstCardId)!;
    const sameArtist = currentPlayer.hand.filter(c => c.id !== firstCardId && c.artistId === firstCard.artistId && c.auctionType !== 'double');
    return (
      <GameLayout gs={gs}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--red)', marginBottom: 2 }}>🎴 더블 경매</div>
            <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>같은 작가의 카드를 하나 더 선택하세요</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--faint)', margin: '0 0 6px', paddingLeft: 2 }}>선택된 첫 번째 카드</p>
            <HandCardRow card={firstCard} selected dimmed />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--dim)', margin: '0 0 6px', paddingLeft: 2 }}>
              두 번째 카드 선택 ({sameArtist.length}장)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sameArtist.map(card => (
                <HandCardRow key={card.id} card={card} onClick={() => update(s => selectDoubleSecond(s, card.id))} />
              ))}
            </div>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 경매 ──────────────────────────────────────────────────
  if (phase === 'auction' && currentAuction) {
    const seller = getPlayerById(gs, currentAuction.sellerId)!;
    const auctionColor = AUCTION_TYPE_COLORS[currentAuction.type];
    const auctionIcon = AUCTION_TYPE_ICONS[currentAuction.type];
    const aCards = (currentAuction as OpenAuction | FixedAuction | SecretAuction | OnceAroundAuction).cards;
    const isDoubleAuction = aCards.length === 2;
    const auctionLabel = isDoubleAuction
      ? `🎴 더블 + ${AUCTION_TYPE_LABELS[currentAuction.type]}`
      : AUCTION_TYPE_LABELS[currentAuction.type];

    // 공통: 경매 타입 헤더 + 카드 (컴팩트)
    const auctionTopBar = (
      <>
        <div className="crt" />
        <div style={{
          background: auctionColor + '14', borderBottom: `2px solid ${auctionColor}30`,
          padding: '10px 14px', flexShrink: 0,
        }}>
          {/* 경매 타입 + 판매자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{auctionIcon}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 15, color: auctionColor }}>{auctionLabel}</span>
              <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>· {seller.name} 판매</span>
            </div>
            <span style={{ fontFamily: 'var(--f-pix)', fontSize: 8, color: 'var(--faint)', flexShrink: 0 }}>R{gs.round}/{gs.maxRounds}</span>
          </div>
          {/* 카드 목록 (컴팩트 썸네일 행) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {aCards.map((card, idx) => {
              const a = getArtistById(card.artistId);
              const title = getArtworkTitle(card.artistId, card.artworkIndex);
              const isDoubleFirst = aCards.length === 2 && idx === 0;
              return (
                <div key={card.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 8,
                  background: isDoubleFirst ? a.color + '0a' : a.color + '16',
                  border: `1.5px solid ${a.color}${isDoubleFirst ? '28' : '55'}`,
                  opacity: isDoubleFirst ? 0.6 : 1,
                  animationName: 'arcRise', animationDuration: '.45s', animationTimingFunction: 'cubic-bezier(.34,1.56,.64,1)', animationFillMode: 'both',
                  animationDelay: `${idx * 0.08}s`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: a.color + '20' }}>
                    <ArtworkImage artistId={a.id} avatar={a.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 900, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title || a.name}
                    </div>
                    <div style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: a.color, fontWeight: 700, marginTop: 1 }}>{a.avatar} {a.name}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isDoubleFirst ? (
                      <span style={{ fontFamily: 'var(--f-kr)', fontSize: 9, color: 'var(--faint)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>더블 카드</span>
                    ) : (
                      <span style={{ fontSize: 9, background: AUCTION_TYPE_COLORS[card.auctionType] + 'cc', color: '#fff', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--f-kr)', fontWeight: 700 }}>
                        {AUCTION_TYPE_ICONS[card.auctionType]} {AUCTION_TYPE_LABELS[card.auctionType]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );

    // ── 공개 / 더블 ─────────────────────────────────────────
    if (currentAuction.type === 'open') {
      const a = currentAuction as OpenAuction;
      const currentBidderId = a.activeBidderIds[a.currentBidderIndex];
      const currentBidder = getPlayerById(gs, currentBidderId)!;
      const isCurrentWinner = a.currentWinnerId === currentBidderId;

      return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          {auctionTopBar}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 최고 입찰 */}
            <div className="arc-panel-inset" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="arc-lbl" style={{ marginBottom: 4 }}>최고 입찰</div>
              <div className={a.currentBid > 0 ? 'pulse-glow' : ''} style={{ fontFamily: 'var(--f-title)', fontSize: 38, color: 'var(--gold)', lineHeight: 1 }}>{a.currentBid}M</div>
              <div style={{ color: 'var(--dim)', fontSize: 12, marginTop: 4 }}>
                {a.currentWinnerId ? `👑 ${getPlayerById(gs, a.currentWinnerId)?.name}` : '아직 입찰 없음'}
              </div>
            </div>
            {/* 입찰 현황 */}
            <div className="arc-lbl">입찰 현황</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gs.players.map(p => {
                const isSeller = p.id === a.sellerId;
                const isActive = a.activeBidderIds.includes(p.id);
                const isCurrent = p.id === currentBidderId;
                const isWinner = p.id === a.currentWinnerId;
                const passed = !isSeller && !isActive;
                const status = isCurrent ? 'current' : isSeller ? 'seller' : passed ? 'passed' : isWinner ? 'winner' : 'waiting';
                const sub = isCurrent ? '입찰 중' : isSeller ? '판매자' : passed ? '패스' : isWinner ? '현재 낙찰자' : '대기';
                return <PlayerRow key={p.id} name={p.name} cash={p.cash} status={status} sub={sub} accentColor={auctionColor} />;
              })}
            </div>
            {/* 액션 */}
            <BidInput minBid={a.currentBid + 1} maxBid={currentBidder.cash} onSubmit={v => update(s => openBid(s, v))} />
            {isCurrentWinner ? (
              <button onClick={() => update(s => openStand(s))} className="arc-btn" style={{
                background: 'linear-gradient(180deg, var(--green) 0%, #5aaa3a 100%)',
                boxShadow: '0 6px 0 0 #3a7a20', color: '#0a1f04', fontSize: 18,
              }}>✅ 낙찰 확정 ({a.currentBid}M)</button>
            ) : (
              <button onClick={() => update(s => openPass(s))} className="arc-btn-ghost">패스</button>
            )}
          </div>
        </div>
      );
    }

    // ── 지정가 ──────────────────────────────────────────────
    if (currentAuction.type === 'fixed') {
      const a = currentAuction as FixedAuction;
      const nonSellers = gs.players.filter(p => p.id !== a.sellerId);

      if (a.subPhase === 'setting') {
        return (
          <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            {auctionTopBar}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: auctionColor + '10', border: `1.5px solid ${auctionColor}35`,
                borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 24 }}>🎨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-kr)', fontWeight: 900, fontSize: 15, color: auctionColor }}>{seller.name}</div>
                  <div style={{ color: 'var(--dim)', fontSize: 12 }}>판매 가격을 설정하세요</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--green)', fontWeight: 900 }}>{seller.cash}M</div>
                  <div style={{ color: 'var(--faint)', fontSize: 10 }}>보유</div>
                </div>
              </div>
              <div className="arc-lbl">제안 순서</div>
              {nonSellers.map((p, idx) => (
                <PlayerRow key={p.id} name={p.name} cash={p.cash} status="waiting" sub={`${idx + 1}번째 제안`} />
              ))}
              <BidInput minBid={1} maxBid={999} onSubmit={v => update(s => fixedSetPrice(s, v))} label="가격 설정" />
            </div>
          </div>
        );
      }

      const offerTo = nonSellers[a.currentOfferIndex];
      return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          {auctionTopBar}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 지정 가격 */}
            <div className="arc-panel-inset" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="arc-lbl" style={{ marginBottom: 4 }}>지정 가격</div>
              <div className="pulse-glow" style={{ fontFamily: 'var(--f-title)', fontSize: 48, color: auctionColor, lineHeight: 1 }}>{a.fixedPrice}M</div>
            </div>
            {/* 제안 현황 */}
            <div className="arc-lbl">제안 현황</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nonSellers.map((p, idx) => {
                const isCurrent = idx === a.currentOfferIndex;
                const done = idx < a.currentOfferIndex;
                const status = isCurrent ? 'current' : done ? 'passed' : 'waiting';
                const sub = isCurrent ? '결정 중' : done ? '거절' : '대기';
                return <PlayerRow key={p.id} name={p.name} cash={p.cash} status={status} sub={sub} accentColor={auctionColor} />;
              })}
              <PlayerRow name={seller.name} cash={seller.cash} status="seller" sub="판매자 (모두 거절 시 가져감)" />
            </div>
            {/* 액션 */}
            <button
              onClick={() => update(s => fixedAccept(s))}
              disabled={offerTo.cash < a.fixedPrice}
              className="arc-btn"
              style={{ background: 'linear-gradient(180deg, var(--green) 0%, #5aaa3a 100%)', boxShadow: '0 6px 0 0 #3a7a20', color: '#0a1f04', fontSize: 18 }}
            >💰 구매 ({a.fixedPrice}M)</button>
            <button onClick={() => update(s => fixedDecline(s))} className="arc-btn-ghost">거절</button>
          </div>
        </div>
      );
    }

    // ── 비밀 경매 ───────────────────────────────────────────
    if (currentAuction.type === 'secret') {
      const a = currentAuction as SecretAuction;
      const secretColor = AUCTION_TYPE_COLORS['secret'];

      if (a.subPhase === 'collecting') {
        const bidderId = a.bidOrder[a.currentBidderIndex];
        const bidder = getPlayerById(gs, bidderId)!;
        return (
          <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            {auctionTopBar}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 입찰 진행 현황 */}
              <div className="arc-lbl">비밀 입찰 현황</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {a.bidOrder.map((id, idx) => {
                  const p = getPlayerById(gs, id)!;
                  const done = idx < a.currentBidderIndex;
                  const isCurrent = idx === a.currentBidderIndex;
                  const status = isCurrent ? 'current' : done ? 'passed' : 'waiting';
                  const sub = done ? '🔒 입찰 완료' : isCurrent ? '입찰 중' : '대기';
                  return <PlayerRow key={id} name={p.name} cash={p.cash} status={status} sub={sub} accentColor={secretColor} />;
                })}
                <PlayerRow name={seller.name} cash={seller.cash} status="seller" sub="판매자 (입찰 불가)" />
              </div>
              {/* 안내 */}
              <div style={{
                background: secretColor + '10', border: `1.5px solid ${secretColor}30`,
                borderRadius: 'var(--r)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🤫</span>
                <div style={{ color: 'var(--dim)', fontSize: 12, lineHeight: 1.6 }}>
                  <b style={{ color: 'var(--text)' }}>{bidder.name}</b>님,<br />
                  다른 플레이어가 보지 않도록 비밀로 입찰하세요.
                </div>
              </div>
              <BidInput
                minBid={0}
                maxBid={bidder.cash}
                label="비밀 입찰"
                onSubmit={v => {
                  const nextIdx = a.currentBidderIndex + 1;
                  if (nextIdx < a.bidOrder.length) {
                    const nextP = getPlayerById(gs, a.bidOrder[nextIdx]);
                    if (nextP) setSecretCoverFor(nextP.name);
                  }
                  update(s => secretSubmitBid(s, v));
                }}
              />
            </div>
          </div>
        );
      }

      // 공개 단계
      const entries = Object.entries(a.bids)
        .map(([id, bid]) => ({ player: getPlayerById(gs, id), bid }))
        .filter((e): e is { player: NonNullable<typeof e.player>; bid: number } => e.player != null)
        .sort((x, y) => y.bid - x.bid);
      return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          {auctionTopBar}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="arc-lbl">비밀 입찰 공개</div>
            {entries.map((e, i) => (
              <div key={e.player.id} className="arc-panel-inset" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
                borderColor: i === 0 ? 'rgba(255,183,43,0.4)' : 'var(--line)',
                background: i === 0 ? 'rgba(255,183,43,0.08)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{i === 0 ? '🏆' : '  '}</span>
                  <span style={{ fontFamily: 'var(--f-kr)', fontWeight: 700, fontSize: 14, color: i === 0 ? 'var(--gold)' : 'var(--dim)' }}>
                    {e.player.name}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: i === 0 ? 'var(--gold)' : 'var(--faint)' }}>{e.bid}M</span>
              </div>
            ))}
            <button onClick={() => update(s => secretResolve(s))} className="arc-btn" style={{ fontSize: 16, marginTop: 4 }}>
              낙찰 확정
            </button>
          </div>
        </div>
      );
    }

    // ── 한 바퀴 경매 ────────────────────────────────────────
    if (currentAuction.type === 'once-around') {
      const a = currentAuction as OnceAroundAuction;
      const currentOfferId = a.bidOrder[a.currentOfferIndex];
      const currentOfferPlayer = getPlayerById(gs, currentOfferId)!;
      const isSeller = currentOfferId === a.sellerId;
      const onceColor = AUCTION_TYPE_COLORS['once-around'];
      const winnerName = a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined;

      return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          {auctionTopBar}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 최고 입찰 */}
            <div className="arc-panel-inset" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="arc-lbl" style={{ marginBottom: 4 }}>최고 입찰</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 38, color: onceColor, lineHeight: 1 }}>{a.currentBid}M</div>
              <div style={{ color: 'var(--dim)', fontSize: 12, marginTop: 4 }}>
                {winnerName ? `👑 ${winnerName}` : '아직 입찰 없음'}
              </div>
            </div>
            {/* 입찰 순서 */}
            <div className="arc-lbl">입찰 순서</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {a.bidOrder.map((id, idx) => {
                const p = getPlayerById(gs, id)!;
                const done = idx < a.currentOfferIndex;
                const isCurrent = idx === a.currentOfferIndex;
                const isSellerRow = id === a.sellerId;
                const isWinnerRow = id === a.currentWinnerId;
                const status = isCurrent ? 'current' : isWinnerRow && done ? 'winner' : done ? 'passed' : 'waiting';
                const sub = isCurrent
                  ? (isSellerRow ? '결정 중 (판매자)' : '입찰 중')
                  : done ? (isWinnerRow ? `${a.currentBid}M 최고` : '패스')
                  : (isSellerRow ? '판매자 — 마지막 결정' : '대기');
                return <PlayerRow key={id} name={p.name} cash={p.cash} status={status} sub={sub} accentColor={onceColor} />;
              })}
            </div>
            {/* 판매자 결정 안내 */}
            {isSeller && (
              <div style={{
                background: onceColor + '10', border: `1.5px solid ${onceColor}30`,
                borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--dim)', lineHeight: 1.6,
              }}>
                {!a.currentWinnerId
                  ? '아무도 입찰하지 않았습니다. 이 작품을 무료로 가져갈 수 있습니다.'
                  : `최고 입찰자: ${winnerName} (${a.currentBid}M)\n더 높게 입찰하거나 패스해서 낙찰시키세요.`}
              </div>
            )}
            {/* 액션 */}
            {isSeller && !a.currentWinnerId ? (
              <button onClick={() => update(s => onceAroundPass(s))} className="arc-btn" style={{ fontSize: 18 }}>
                🆓 무료로 가져가기
              </button>
            ) : (
              <>
                <BidInput minBid={a.currentBid + 1} maxBid={currentOfferPlayer.cash} onSubmit={v => update(s => onceAroundBid(s, v))} />
                <button onClick={() => update(s => onceAroundPass(s))} className="arc-btn-ghost">
                  {isSeller ? `패스 → ${winnerName ?? '—'}에게 낙찰` : '패스'}
                </button>
              </>
            )}
          </div>
        </div>
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
          {isNoContest || winner.id === seller.id ? (
            <>
              <p style={{ color: 'var(--dim)', fontSize: 13, margin: '0 0 8px' }}>
                {isNoContest ? '낙찰자 없음' : '판매자가 직접 가져갑니다'}
              </p>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 32, color: 'var(--gold)' }}>{seller.name}</div>
              <p style={{ color: 'var(--text-2)', margin: '4px 0 0' }}>이 가져갑니다</p>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--dim)', fontSize: 13, margin: '0 0 8px' }}>낙찰!</p>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 36, color: 'var(--gold)' }}>{winner.name}</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text-2)', marginTop: 6 }}>{lastAuctionResult.price}M</div>
              <div style={{ color: 'var(--faint)', fontSize: 12, marginTop: 4 }}>판매자 {seller.name} +{lastAuctionResult.price}M</div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', maxWidth: 340 }}>
          {lastAuctionResult.cards.map(card => {
            const a = getArtistById(card.artistId);
            const title = getArtworkTitle(card.artistId, card.artworkIndex);
            return (
              <div key={card.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                border: `2px solid ${a.color}70`,
                background: a.color + '12',
                boxShadow: `0 0 20px ${a.color}20`,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: `0 0 12px ${a.color}40` }}>
                  <ArtworkImage artistId={a.id} avatar={a.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 900, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title || a.name}
                  </div>
                  <div style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: a.color, fontWeight: 700, marginTop: 2 }}>{a.avatar} {a.name}</div>
                </div>
                <span style={{ fontSize: 10, background: AUCTION_TYPE_COLORS[card.auctionType] + 'cc', color: '#fff', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--f-kr)', fontWeight: 700, flexShrink: 0 }}>
                  {AUCTION_TYPE_ICONS[card.auctionType]}
                </span>
              </div>
            );
          })}
        </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ARTISTS.map(a => {
                const val = gs.artistValues[a.id] ?? 0;
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10, background: a.color + '10', border: `1px solid ${a.color}30`,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{a.avatar}</span>
                    <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 700, color: a.color, flex: 1 }}>{a.name}</span>
                    <span style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: val > 0 ? a.color : 'var(--faint)' }}>{val}M</span>
                  </div>
                );
              })}
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
