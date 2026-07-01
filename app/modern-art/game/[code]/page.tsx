'use client';

import { useEffect, useCallback, useState, useRef, createContext, useContext, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import { subscribeRoom, updateGameState, finishGame, registerPresence, submitSecretBidAtomic, setSecretReveal } from '@/lib/modern-art/firebase-game';
import {
  ARTISTS, AUCTION_TYPES, AUCTION_TYPE_ICONS, AUCTION_TYPE_LABELS, AUCTION_TYPE_COLORS, getArtistById,
} from '@/lib/modern-art/game-data';
import {
  selectCard, selectDoubleSecond, doublePassOffer, doublePassDecline,
  openBid, openPass, openStand,
  fixedSetPrice, fixedAccept, fixedDecline,
  secretResolve,
  onceAroundBid, onceAroundPass,
  acknowledgeResult, acknowledgeScoring,
  calcFinalScores, getPlayerById,
} from '@/lib/modern-art/game-logic';
import {
  GameState, Card, OpenAuction, FixedAuction, SecretAuction, OnceAroundAuction,
} from '@/lib/modern-art/types';

// ─── 작품 제목 추출 ───────────────────────────────────────────
function getArtworkTitle(artistId: string, artworkIndex: number): string {
  const artist = getArtistById(artistId);
  const src = artist.images[artworkIndex % artist.images.length];
  if (!src) return '';
  const filename = (src.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  return artist.titles?.[filename] ?? filename;
}

const AUCTION_TYPE_DESC: Record<string, string> = {
  'open': '순서대로 돌아가며 자유롭게 입찰',
  'fixed': '판매자가 가격을 정하고 순서대로 수락/거절',
  'secret': '모두 동시에 비밀 입찰, 최고가 낙찰',
  'once-around': '한 번씩만 기회, 최고가 낙찰',
  'double': '같은 작가 카드 두 장을 동시 경매',
};

// ─── 줌 컨텍스트 ──────────────────────────────────────────────
const ZoomCardCtx = createContext<((card: Card) => void) | null>(null);

// ─── 공유 UI 컴포넌트 ─────────────────────────────────────────
function ArtworkImage({ artistId, avatar, artworkIndex, className }: {
  artistId: string; avatar: string; artworkIndex: number; className?: string;
}) {
  const [err, setErr] = useState(false);
  const artist = getArtistById(artistId);
  const src = artist.images[artworkIndex % artist.images.length];
  if (err || !src) {
    return (
      <div className={className ?? ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem' }}>{avatar}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${artistId}-${artworkIndex}`}
      className={className ?? ''}
      onError={() => setErr(true)}
    />
  );
}

function ArtCard({ card, selected, onClick, dimmed }: {
  card: Card; selected?: boolean; onClick?: () => void; dimmed?: boolean;
}) {
  const artist = getArtistById(card.artistId);
  const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
  const title = getArtworkTitle(card.artistId, card.artworkIndex);
  return (
    <button
      onClick={onClick}
      disabled={dimmed}
      className={`ma-card ${onClick ? 'tap' : ''} ${selected ? 'sel' : ''} ${dimmed ? 'opacity-30 cursor-not-allowed' : ''}`}
      style={{
        borderColor: selected ? artist.color : artist.color + '50',
        boxShadow: selected ? `0 0 24px ${artist.color}50` : undefined,
      }}
    >
      <div className="ma-card-head" style={{ background: artist.color }}>
        <span className="ma-card-artist">{artist.avatar} {artist.name}</span>
      </div>
      <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="ma-card-art" />
      {title && <div className="ma-card-title">{title}</div>}
      <div className="ma-card-foot" style={{ background: auctionColor + 'cc', color: '#0c0a12' }}>
        <span>{AUCTION_TYPE_ICONS[card.auctionType]}</span>
        <span>{AUCTION_TYPE_LABELS[card.auctionType]}</span>
      </div>
    </button>
  );
}

function MarketBoard({ roundMarket, artistValues }: {
  roundMarket: Record<string, number>; artistValues: Record<string, number>;
}) {
  return (
    <div className="ma-market-row">
      {ARTISTS.map(a => {
        const count = roundMarket[a.id] ?? 0;
        const value = artistValues[a.id] ?? 0;
        const pct = (count / 5) * 100;
        const isClose = count >= 4;
        return (
          <div key={a.id} className="ma-mk" style={{ borderColor: isClose ? '#ef4444' : a.color + '50' }}>
            <div className="ma-mk-top">
              <span className="ma-mk-av">{a.avatar}</span>
              <span className="ma-mk-name" style={{ color: a.color }}>{a.name}</span>
              <span className="ma-mk-val" style={{ color: isClose ? '#ef4444' : value > 0 ? 'var(--gold)' : 'var(--faint)' }}>
                {value > 0 ? `${value}` : '--'}
              </span>
            </div>
            <div className="ma-mk-bar">
              <div className="ma-mk-fill" style={{ width: `${pct}%`, background: isClose ? '#ef4444' : a.color }} />
            </div>
            <div className="ma-mk-count" style={{ color: isClose ? '#ef4444' : 'var(--faint)' }}>{count}/5</div>
          </div>
        );
      })}
    </div>
  );
}

function BidInput({ minBid, maxBid, onSubmit, label = '입찰', accentColor, playerCash }: {
  minBid: number; maxBid: number; onSubmit: (v: number) => void; label?: string; accentColor?: string; playerCash?: number;
}) {
  const [val, setVal] = useState(minBid);
  // minBid가 올라가면 val도 올림 (다른 사람이 입찰한 경우)
  useEffect(() => { setVal(v => Math.max(v, minBid)); }, [minBid]);

  if (minBid > maxBid) {
    return (
      <div className="text-center py-4 rounded-xl border border-red-500/30 bg-red-500/10">
        <div className="text-red-400 font-bold text-sm">잔고 부족 — 입찰 불가</div>
        <div className="text-white/30 text-xs mt-1">현재 잔고: {maxBid}M</div>
      </div>
    );
  }

  const adjust = (d: number) => setVal(v => Math.min(maxBid, Math.max(minBid, v + d)));
  const presets = [10, 20, 50, 100].filter(v => v > minBid && v <= maxBid);
  const color = accentColor ?? 'var(--gold)';
  const remaining = playerCash !== undefined ? playerCash - val : null;
  const isBroke = remaining === 0;
  const isLow = remaining !== null && remaining > 0 && remaining < 10;
  return (
    <div className="space-y-3">
      {/* 금액 표시 */}
      <div className="arc-panel-inset flex items-center justify-center py-3">
        <div className="text-5xl font-black leading-none" style={{ fontFamily: 'var(--f-title)', color }}>{val}</div>
        <div className="text-white/30 text-lg ml-1 mt-2">M</div>
      </div>
      {/* 잔고 경고 */}
      {remaining !== null && (
        <div style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--f-kr)', color: isBroke ? '#ef4444' : isLow ? '#f59e0b' : 'var(--dim)' }}>
          입찰 후 잔고: {remaining}M{isBroke ? ' ⚠️ 잔금 없음' : isLow ? ' ⚠️' : ''}
        </div>
      )}
      {/* 슬라이더 */}
      {maxBid > minBid && (
        <input
          type="range"
          className="ma-range"
          min={minBid}
          max={maxBid}
          value={val}
          onChange={e => setVal(Number(e.target.value))}
          style={{ '--range-c': color } as React.CSSProperties}
        />
      )}
      {/* ±버튼 */}
      <div className="flex gap-1.5 justify-center">
        {([-10, -1, 1, 10] as const).map(d => (
          <button key={d} onClick={() => adjust(d)} className="arc-btn-ghost" style={{ width: 56, padding: '8px 0', fontSize: 14 }}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      {presets.length > 0 && (
        <div className="flex gap-1.5">
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
      <button onClick={() => onSubmit(val)} disabled={val > maxBid || val < minBid} className="arc-btn"
        style={accentColor ? { '--c': accentColor, '--c-lo': accentColor + 'aa', color: '#fff' } as React.CSSProperties : undefined}>
        {label} — {val}M
      </button>
    </div>
  );
}

function AuctionCardDisplay({ cards }: { cards: Card[] }) {
  const zoomCard = useContext(ZoomCardCtx);
  const isDouble = cards.length === 2;
  return (
    <div className="ma-hero">
      {cards.map((card, idx) => {
        const artist = getArtistById(card.artistId);
        const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
        const title = getArtworkTitle(card.artistId, card.artworkIndex);
        return (
          <div key={card.id} className="ma-hero-card"
            onClick={zoomCard ? () => zoomCard(card) : undefined}
            style={{
              borderColor: idx === 0 && isDouble ? artist.color + 'aa' : artist.color,
              boxShadow: `0 0 40px ${artist.color}30, 0 14px 40px -10px rgba(0,0,0,.7)`,
              width: isDouble ? '150px' : '190px',
              cursor: zoomCard ? 'pointer' : 'default',
            }}>
            <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="ma-hero-art" />
            <div className="ma-hero-meta">
              {title && <div className="ma-hero-title">{title}</div>}
              <div className="ma-hero-artist" style={{ color: artist.color }}>
                {artist.avatar} {artist.name}
                <span className="ml-1.5 text-[10px] opacity-60">{AUCTION_TYPE_ICONS[card.auctionType]} {AUCTION_TYPE_LABELS[card.auctionType]}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 플레이어 인덱스별 색상 ──────────────────────────────────
const PLAYER_COLORS = ['#ffb72b', '#36e0cf', '#ff5da2', '#a274ff', '#7ed957'];

// ─── 게임 레이아웃 (온라인용) ─────────────────────────────────
function GameLayout({ gs, myClientId, children }: { gs: GameState; myClientId: string; children: ReactNode }) {
  const [handOpen, setHandOpen] = useState(false);
  const [handView, setHandView] = useState<'hand' | 'collection'>('hand');
  const [histOpen, setHistOpen] = useState(false);
  const [collOpen, setCollOpen] = useState(false);
  const [collViewPlayerId, setCollViewPlayerId] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<Card | null>(null);
  const currentPlayer = gs.players[gs.currentPlayerIndex];
  const myPlayer = gs.players.find(p => p.clientId === myClientId) ?? null;
  const isMyTurnLayout = currentPlayer?.clientId === myClientId;
  const showHandBar = myPlayer && (myPlayer.hand.length > 0 || myPlayer.collection.length > 0) && gs.phase !== 'game-over';

  const collViewPlayer = gs.players.find(p => p.id === collViewPlayerId)
    ?? gs.players.find(p => p.clientId === myClientId)
    ?? gs.players[0];

  const openTab = (view: 'hand' | 'collection') => {
    if (view === 'collection') { setCollOpen(true); return; }
    if (handOpen && handView === view) { setHandOpen(false); }
    else { setHandOpen(true); setHandView(view); }
  };

  return (
    <ZoomCardCtx.Provider value={setZoomedCard}>
    <div className="ma-game">
      {/* HUD */}
      <div className="ma-hud">
        <span className="ma-hud-mark">MODERN ART</span>
        <span className="ma-hud-round">R{gs.round}/{gs.maxRounds}</span>
        <div className="ma-hud-right">
          {gs.roundResults.length > 0 && (
            <button onClick={() => setHistOpen(v => !v)} className="ma-hud-icon-btn" title="라운드 기록">
              📊
            </button>
          )}
          <button onClick={() => setCollOpen(v => !v)} className="ma-hud-icon-btn" title="컬렉션 보기">
            🎨
          </button>
          {myPlayer && (
            <span className="ma-hud-cash">{myPlayer.cash}M</span>
          )}
        </div>
      </div>

      {/* 플레이어 레일 */}
      <div className="ma-rail">
        {gs.players.map((p, idx) => {
          const isCurrent = p.id === currentPlayer.id;
          const isMe = p.clientId === myClientId;
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
          return (
            <div key={p.id} className={`ma-railchip ${isCurrent ? 'turn' : ''} ${isMe ? 'me' : ''}`}
              style={{ borderColor: isCurrent ? color : color + '30', cursor: 'pointer' }}
              onClick={() => { setCollViewPlayerId(p.id); setCollOpen(true); }}>
              <div className="ma-railchip-av" style={{ background: color + '22' }}>
                <span style={{ fontSize: 15 }}>{p.name.charAt(0)}</span>
              </div>
              <div className="ma-railchip-info">
                <span className="ma-railchip-name">{p.name}{isMe ? ' (나)' : ''}</span>
                <span className="ma-railchip-cash">{p.cash}{collVal > 0 ? `+${collVal}` : ''}M</span>
              </div>
              {isCurrent && <span className="ma-railchip-dot" />}
            </div>
          );
        })}
      </div>

      {/* 마켓 */}
      <div className="ma-marketwrap">
        <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} />
      </div>

      {/* 턴 바 */}
      <div className={`ma-turnbar ${isMyTurnLayout ? 'mine' : ''}`}>
        {isMyTurnLayout ? '✨ 내 차례' : `${currentPlayer.name}의 차례`}
      </div>

      {/* 메인 */}
      <div className="ma-main" style={showHandBar ? { paddingBottom: handOpen ? 280 : 58 } : undefined}>
        {children}
      </div>

      {/* 내 패 / 컬렉션 드로어 */}
      {showHandBar && (
        <div className="ma-hand-bar">
          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => openTab('hand')}
              style={{
                flex: 1, padding: '10px 0', fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 700,
                color: handOpen && handView === 'hand' ? 'var(--cyan)' : 'var(--dim)',
                background: 'none', border: 'none',
                borderBottom: handOpen && handView === 'hand' ? '2px solid var(--cyan)' : '2px solid transparent',
                cursor: 'pointer',
              }}>
              내 패 ({myPlayer!.hand.length}장)
            </button>
            <button
              onClick={() => openTab('collection')}
              style={{
                flex: 1, padding: '10px 0', fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 700,
                color: collOpen ? 'var(--gold)' : 'var(--dim)',
                background: 'none', border: 'none',
                borderBottom: collOpen ? '2px solid var(--gold)' : '2px solid transparent',
                cursor: 'pointer',
              }}>
              🎨 컬렉션 ({myPlayer!.collection.length}장)
            </button>
          </div>
          {/* 내 패 */}
          {handOpen && handView === 'hand' && (
            <div className="ma-hand-cards">
              {myPlayer!.hand.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--faint)', fontSize: 11, padding: '20px 0' }}>
                  패가 없습니다
                </div>
              ) : ARTISTS.filter(a => myPlayer!.hand.some(c => c.artistId === a.id)).map(artist => (
                <div key={artist.id} style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{artist.avatar}</span>
                    <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, fontWeight: 700, color: artist.color }}>{artist.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--dim)' }}>({myPlayer!.hand.filter(c => c.artistId === artist.id).length}장)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
                    {myPlayer!.hand.filter(c => c.artistId === artist.id).map(card => (
                      <ArtCard key={card.id} card={card} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 컬렉션 오버레이 */}
      {collOpen && (
        <div className="ma-coll-overlay">
          <div className="ma-hist-head">
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>컬렉션</span>
            <button onClick={() => { setCollOpen(false); setZoomedCard(null); }} className="ma-hist-close">✕</button>
          </div>
          {/* 플레이어 탭 */}
          <div className="ma-coll-tabs">
            {gs.players.map((p, idx) => {
              const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              const isMe = p.clientId === myClientId;
              const isSelected = p.id === collViewPlayer.id;
              const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
              return (
                <button key={p.id} onClick={() => setCollViewPlayerId(p.id)}
                  style={{
                    flex: 1, minWidth: 64, padding: '8px 6px',
                    fontFamily: 'var(--f-kr)', fontSize: 10, fontWeight: 700,
                    color: isSelected ? color : 'var(--dim)',
                    background: 'none', border: 'none',
                    borderBottom: isSelected ? `2px solid ${color}` : '2px solid transparent',
                    cursor: 'pointer', lineHeight: 1.3,
                  }}>
                  <div>{p.name}{isMe ? ' (나)' : ''}</div>
                  <div style={{ fontFamily: 'var(--f-title)', fontSize: 10, fontWeight: 900, color: collVal > 0 ? 'var(--gold)' : 'var(--faint)', marginTop: 2 }}>
                    {collVal > 0 ? `${collVal}M` : '0M'}
                  </div>
                </button>
              );
            })}
          </div>
          {/* 컬렉션 내용 */}
          <div className="ma-coll-body">
            {collViewPlayer.collection.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 11, padding: '40px 0' }}>
                아직 구매한 작품이 없습니다
              </div>
            ) : (
              <>
                {(() => {
                  const totalVal = collViewPlayer.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,183,43,.08)', border: '1px solid rgba(255,183,43,.2)' }}>
                      <span style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'var(--dim)' }}>
                        {collViewPlayer.name} · {collViewPlayer.collection.length}장
                      </span>
                      <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, fontWeight: 900, color: 'var(--gold)' }}>{totalVal}M</span>
                    </div>
                  );
                })()}
                {ARTISTS.filter(a => collViewPlayer.collection.some(c => c.artistId === a.id)).map(artist => {
                  const artistCards = collViewPlayer.collection.filter(c => c.artistId === artist.id);
                  const value = gs.artistValues[artist.id] ?? 0;
                  const total = artistCards.length * value;
                  return (
                    <div key={artist.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>{artist.avatar}</span>
                        <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 700, color: artist.color }}>{artist.name}</span>
                        <span style={{ fontSize: 9, color: 'var(--dim)' }}>({artistCards.length}장)</span>
                        {value > 0 ? (
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--f-title)', fontWeight: 900, color: 'var(--gold)' }}>
                            {value}M × {artistCards.length} = {total}M
                          </span>
                        ) : (
                          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--faint)' }}>미평가</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                        {artistCards.map(card => <ArtCard key={card.id} card={card} onClick={() => setZoomedCard(card)} />)}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* 작품 확대 라이트박스 */}
      {zoomedCard && (() => {
        const artist = getArtistById(zoomedCard.artistId);
        const title = getArtworkTitle(zoomedCard.artistId, zoomedCard.artworkIndex);
        const value = gs.artistValues[zoomedCard.artistId] ?? 0;
        const auctionColor = AUCTION_TYPE_COLORS[zoomedCard.auctionType];
        return (
          <div
            onClick={() => setZoomedCard(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,.88)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px 20px', gap: 16, backdropFilter: 'blur(12px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 320,
                border: `2.5px solid ${artist.color}`,
                borderRadius: 20, overflow: 'hidden',
                background: 'var(--surface)',
                boxShadow: `0 0 60px ${artist.color}40, 0 24px 60px -10px rgba(0,0,0,.8)`,
              }}
            >
              <div style={{ background: artist.color, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{artist.avatar}</span>
                <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 900, color: '#0c0a12' }}>{artist.name}</span>
              </div>
              <ArtworkImage
                artistId={artist.id} avatar={artist.avatar} artworkIndex={zoomedCard.artworkIndex}
                className="ma-hero-art"
              />
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {title && (
                  <div style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: 'var(--text)', fontWeight: 700 }}>{title}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ background: auctionColor + 'cc', color: '#0c0a12', fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    {AUCTION_TYPE_ICONS[zoomedCard.auctionType]} {AUCTION_TYPE_LABELS[zoomedCard.auctionType]}
                  </span>
                  {value > 0 ? (
                    <span style={{ fontFamily: 'var(--f-title)', fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>{value}M</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--faint)' }}>미평가</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--f-kr)', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>탭하여 닫기</div>
          </div>
        );
      })()}

      {/* 라운드 기록 오버레이 */}
      {histOpen && (
        <div className="ma-hist-overlay">
          <div className="ma-hist-head">
            <span style={{ fontFamily: 'var(--f-kr)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>라운드 기록</span>
            <button onClick={() => setHistOpen(false)} className="ma-hist-close">✕</button>
          </div>
          <div className="ma-hist-body">
            {gs.roundResults.map(rr => (
              <div key={rr.round}>
                <div style={{ fontFamily: 'var(--f-pix)', fontSize: 9, color: 'var(--dim)', letterSpacing: '1.5px', marginBottom: 8 }}>
                  ROUND {rr.round}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {rr.rankings.filter(r => r.count > 0).map(r => {
                    const artist = getArtistById(r.artistId);
                    return (
                      <div key={r.artistId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: artist.color + '12', borderLeft: `2px solid ${artist.color}` }}>
                        <span style={{ fontSize: 14 }}>{artist.avatar}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: artist.color, flex: 1, fontFamily: 'var(--f-kr)' }}>{artist.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--dim)' }}>{r.count}장</span>
                        {r.rank ? (
                          <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--f-title)' }}>
                            {r.rank}위 +{r.addedValue} → {r.cumulativeValue}M
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--faint)' }}>순위 외</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ZoomCardCtx.Provider>
  );
}

// ─── 대기 화면 ────────────────────────────────────────────────
function WaitingForPlayer({ name, detail }: { name: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <div className="text-white/60 text-base font-semibold">{name}님이 진행 중...</div>
      {detail && <div className="text-white/30 text-sm">{detail}</div>}
    </div>
  );
}

// ─── 경매 공통 헤더 ───────────────────────────────────────────
function AuctionHeader({ icon, label, sellerName, color }: { icon: string; label: string; sellerName: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
      style={color ? { background: color + '12', borderColor: color + '30' } : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="font-black text-base text-white">{label}</div>
        <div className="text-white/40 text-xs mt-0.5">판매자: {sellerName}</div>
      </div>
    </div>
  );
}

function CurrentBidDisplay({ bid, winnerName }: { bid: number; winnerName?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
      <div className="text-white/40 text-xs uppercase tracking-wider mb-1">현재 최고 입찰</div>
      <div className="text-4xl font-black text-amber-400">{bid}M</div>
      {winnerName
        ? <div className="text-white/50 text-sm mt-1">by {winnerName}</div>
        : <div className="text-white/25 text-sm mt-1">아직 입찰 없음</div>}
    </div>
  );
}

function PlayerTurnBanner({ name, cash, badge, isMe }: { name: string; cash: number; badge?: string; isMe?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 flex items-center justify-between ${isMe ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/25'
      }`}>
      <div>
        <div className={`font-black text-base ${isMe ? 'text-green-400' : 'text-amber-400'}`}>
          {isMe ? '내 차례!' : name}{badge ? ` ${badge}` : ''}
        </div>
        {!isMe && <div className="text-white/40 text-xs">의 차례</div>}
      </div>
      <div className="text-right">
        <div className="text-green-400 font-black text-xl">{cash}M</div>
        <div className="text-white/30 text-[10px]">보유</div>
      </div>
    </div>
  );
}

function BidderProgress({ playerIds, players, currentId }: {
  playerIds: string[]; players: GameState['players']; currentId: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {playerIds.map(id => {
        const p = players.find(pl => pl.id === id)!;
        const isCurrent = id === currentId;
        return (
          <span key={id} className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${isCurrent ? 'bg-amber-500/25 text-amber-300 border-amber-500/40' : 'bg-white/8 text-white/40 border-transparent'
            }`}>
            {isCurrent && '▶ '}{p.name}
          </span>
        );
      })}
    </div>
  );
}

function OnceAroundProgress({ bidOrder, currentIdx, players, sellerId }: {
  bidOrder: string[]; currentIdx: number; players: GameState['players']; sellerId?: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {bidOrder.map((id, i) => {
        const p = players.find(pl => pl.id === id)!;
        const done = i < currentIdx;
        const current = i === currentIdx;
        const isSeller = id === sellerId;
        return (
          <span key={id} className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${current ? 'bg-amber-500/25 text-amber-300 border-amber-500/40' :
              done ? 'bg-white/4 text-white/20 border-transparent line-through' :
                'bg-white/8 text-white/45 border-transparent'
            }`}>
            {current && '▶ '}{p.name}{isSeller && <span className="opacity-50 ml-0.5">(판)</span>}
          </span>
        );
      })}
    </div>
  );
}

// ─── 메인 게임 컴포넌트 ──────────────────────────────────────
export default function OnlineModernArtGame() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [gs, setGs] = useState<GameState | null>(null);
  const [leftPlayerName, setLeftPlayerName] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const allPresentRef = useRef(false);

  const myClientId = typeof window !== 'undefined' ? (getGuestUid() ?? '') : '';

  // Presence 등록: 연결 끊기면 Firebase가 자동 제거
  useEffect(() => {
    if (!myClientId) return;
    let cleanup: (() => void) | undefined;
    registerPresence(code, myClientId).then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [code, myClientId]);

  useEffect(() => {
    const unsub = subscribeRoom(code, room => {
      if (!room) { router.replace('/modern-art'); return; }
      if (room.gameState) setGs(room.gameState);

      // 상대 나가기 감지
      if (room.status === 'playing' && room.presence) {
        const allPresent = room.players.every(p => room.presence![p.clientId]);
        if (allPresent) allPresentRef.current = true;

        if (allPresentRef.current) {
          const missing = room.players.find(p => p.clientId !== myClientId && !room.presence![p.clientId]);
          if (missing) {
            setLeftPlayerName(missing.name);
            finishGame(code, missing.name);
          }
        }
      }

      // 다른 클라이언트가 먼저 감지한 경우
      if (room.status === 'finished' && room.leftPlayerName && room.gameState?.phase !== 'game-over') {
        setLeftPlayerName(room.leftPlayerName);
      }
    });
    return unsub;
  }, [code, router, myClientId]);

  // 낙관적 업데이트 + Firebase 동기화
  const perform = useCallback((fn: (s: GameState) => GameState) => {
    setGs(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      updateGameState(code, next);
      return next;
    });
  }, [code]);

  // 게임 종료 시 방 status 업데이트 (1회)
  useEffect(() => {
    if (gs?.phase === 'game-over' && !finishedRef.current) {
      finishedRef.current = true;
      finishGame(code);
    }
  }, [gs?.phase, code]);

  // 비밀 경매: 모든 입찰 완료 감지 → revealing 전환 (멱등 연산, 어느 클라이언트든 가능)
  useEffect(() => {
    if (!gs || gs.phase !== 'auction') return;
    const a = gs.currentAuction;
    if (!a || a.type !== 'secret' || a.subPhase !== 'collecting') return;
    const allSubmitted = Object.values(a.bids).every(b => (b as number) >= 0);
    if (allSubmitted) setSecretReveal(code);
  }, [gs, code]);

  if (leftPlayerName) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-5xl">🚪</div>
        <div className="text-white text-xl font-bold leading-snug">
          {leftPlayerName}님이<br />게임을 나갔습니다
        </div>
        <p className="text-white/40 text-sm">게임이 종료되었습니다.</p>
        <button
          onClick={() => router.replace('/modern-art')}
          className="mt-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (!gs) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center text-white/50">
        연결 중...
      </div>
    );
  }

  const myPlayerIndex = gs.players.findIndex(p => p.clientId === myClientId);
  const myPlayer = myPlayerIndex >= 0 ? gs.players[myPlayerIndex] : null;
  const isMyTurn = gs.currentPlayerIndex === myPlayerIndex;
  const currentPlayer = gs.players[gs.currentPlayerIndex];

  // player.id → clientId 매핑
  const isMyPlayerId = (playerId: string) =>
    gs.players.find(p => p.id === playerId)?.clientId === myClientId;

  const { phase, currentAuction, lastAuctionResult, roundEndArtistId } = gs;

  // ─── 카드 선택 ─────────────────────────────────────────────
  if (phase === 'select-card') {
    if (!isMyTurn || !myPlayer || myPlayer.hand.length === 0) {
      if (isMyTurn && myPlayer && myPlayer.hand.length === 0) {
        perform(s => acknowledgeResult(s));
        return null;
      }
      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <WaitingForPlayer name={currentPlayer.name} detail="카드를 선택 중..." />
        </GameLayout>
      );
    }
    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="space-y-5">
          <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
            경매에 올릴 작품을 선택하세요
          </div>
          {AUCTION_TYPES.map(type => {
            const cards = myPlayer.hand.filter(c => c.auctionType === type);
            if (cards.length === 0) return null;
            return (
              <div key={type}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{AUCTION_TYPE_ICONS[type]}</span>
                    <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, fontWeight: 700, color: AUCTION_TYPE_COLORS[type] }}>{AUCTION_TYPE_LABELS[type]}</span>
                    <span style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--f-kr)' }}>({cards.length}장)</span>
                  </div>
                  <div style={{ fontFamily: 'var(--f-kr)', fontSize: 10, color: 'var(--faint)', marginTop: 2, paddingLeft: 20 }}>{AUCTION_TYPE_DESC[type]}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {cards.map(card => (
                    <ArtCard key={card.id} card={card} onClick={() => perform(s => selectCard(s, card.id))} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </GameLayout>
    );
  }

  // ─── 더블: 두 번째 카드 선택 ───────────────────────────────
  if (phase === 'double-select-second') {
    if (!isMyTurn || !myPlayer) {
      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <WaitingForPlayer name={currentPlayer.name} detail="더블 경매 두 번째 카드 선택 중..." />
        </GameLayout>
      );
    }
    const firstCardId = gs.pendingDoubleCardId!;
    const firstCard = myPlayer.hand.find(c => c.id === firstCardId)!;
    const sameArtist = myPlayer.hand.filter(c => c.id !== firstCardId && c.artistId === firstCard.artistId);
    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-red-400 font-black text-xl mb-1">🎴 더블 경매</div>
            <div className="text-white/50 text-sm">같은 작가의 카드를 하나 더 선택하세요</div>
          </div>
          <div className="flex justify-center"><div style={{ width: 96 }}><ArtCard card={firstCard} selected /></div></div>
          <div className="text-white/30 text-xs text-center">+ 아래 중 하나 선택</div>
          <div className="grid grid-cols-3 gap-2">
            {sameArtist.map(card => (
              <ArtCard key={card.id} card={card} onClick={() => perform(s => selectDoubleSecond(s, card.id))} />
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 더블: 다른 플레이어에게 두 번째 카드 요청 ────────────────
  if (phase === 'double-pass-second') {
    const askPlayerIdx = gs.pendingDoublePassPlayerIdx!;
    const askPlayer = gs.players[askPlayerIdx];
    const isAskPlayer = askPlayer.clientId === myClientId;
    const firstCardId = gs.pendingDoubleCardId!;
    const firstCard = gs.players[gs.currentPlayerIndex].hand.find(c => c.id === firstCardId)!;
    const sameArtistCards = askPlayer.hand.filter(
      c => c.artistId === firstCard.artistId && c.auctionType !== 'double'
    );

    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-red-400 font-black text-xl mb-1">🎴 더블 경매</div>
            <div className="text-white/50 text-sm">{currentPlayer.name}님의 더블 카드 — 두 번째 카드 요청</div>
          </div>
          {firstCard && <div className="flex justify-center"><div style={{ width: 96 }}><ArtCard card={firstCard} selected /></div></div>}
          <PlayerTurnBanner name={askPlayer.name} cash={askPlayer.cash} isMe={isAskPlayer} />
          {isAskPlayer ? (
            <>
              <div className="text-white/50 text-sm text-center">
                같은 작가 카드를 추가하시겠습니까?
              </div>
              {sameArtistCards.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {sameArtistCards.map(card => (
                    <ArtCard key={card.id} card={card}
                      onClick={() => perform(s => doublePassOffer(s, card.id))} />
                  ))}
                </div>
              )}
              <button onClick={() => perform(s => doublePassDecline(s))}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 font-bold transition-colors">
                패스
              </button>
            </>
          ) : (
            <WaitingForPlayer name={askPlayer.name} detail="두 번째 카드 제공 여부 결정 중..." />
          )}
        </div>
      </GameLayout>
    );
  }

  // ─── 턴 커버: 패 확인 후 경매 시작 ───────────────────────────
  if (phase === 'turn-cover') {
    if (!isMyTurn) {
      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <WaitingForPlayer name={currentPlayer.name} detail="패를 확인 중..." />
        </GameLayout>
      );
    }
    if (!myPlayer || myPlayer.hand.length === 0) {
      perform(s => ({ ...s, phase: 'select-card' as const }));
      return null;
    }
    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="space-y-4">
          <div style={{ fontFamily: 'var(--f-kr)', fontSize: 13, fontWeight: 700, color: 'var(--dim)' }}>
            내 패 확인
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ARTISTS.filter(a => myPlayer.hand.some(c => c.artistId === a.id)).map(artist => (
              <div key={artist.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <span style={{ fontSize: 12 }}>{artist.avatar}</span>
                  <span style={{ fontFamily: 'var(--f-kr)', fontSize: 10, fontWeight: 700, color: artist.color }}>{artist.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--dim)' }}>({myPlayer.hand.filter(c => c.artistId === artist.id).length}장)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
                  {myPlayer.hand.filter(c => c.artistId === artist.id).map(card => (
                    <ArtCard key={card.id} card={card} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ position: 'sticky', bottom: 0, paddingBottom: 4 }}>
            <button
              onClick={() => perform(s => ({ ...s, phase: 'select-card' as const }))}
              className="arc-btn w-full"
              style={{ fontSize: 15, padding: '14px' }}
            >
              🎨 경매에 작품 올리기
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 경매 화면 ─────────────────────────────────────────────
  if (phase === 'auction' && currentAuction) {
    const seller = getPlayerById(gs, currentAuction.sellerId)!;

    // 공개 / 더블 경매
    if (currentAuction.type === 'open') {
      const a = currentAuction as OpenAuction;
      const currentBidderId = a.activeBidderIds[a.currentBidderIndex];
      const currentBidder = getPlayerById(gs, currentBidderId)!;
      const isWinner = a.currentWinnerId === currentBidderId;
      const amIBidder = isMyPlayerId(currentBidderId);
      const isDoubleAuction = a.cards.length === 2;
      const auctionLabel = isDoubleAuction ? '🎴 더블 + 공개 경매' : '공개 경매';
      const auctionIcon = isDoubleAuction ? '🎴' : '📣';
      const auctionColor = AUCTION_TYPE_COLORS['open'];

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="space-y-4">
            <AuctionHeader icon={auctionIcon} label={auctionLabel} sellerName={seller.name} color={auctionColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentBidder.name} cash={currentBidder.cash} isMe={amIBidder} />
            {amIBidder ? (
              <div className="space-y-2">
                <BidInput minBid={a.currentBid + 1} maxBid={currentBidder.cash}
                  onSubmit={v => perform(s => openBid(s, v))} label="입찰" accentColor={auctionColor} playerCash={currentBidder.cash} />
                {isWinner ? (
                  <button onClick={() => perform(s => openStand(s))}
                    className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black transition-colors">
                    ✅ 낙찰 확정 ({a.currentBid}M)
                  </button>
                ) : (
                  <button onClick={() => perform(s => openPass(s))}
                    className="w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 font-bold transition-colors border border-white/10">
                    패스
                  </button>
                )}
              </div>
            ) : (
              <WaitingForPlayer name={currentBidder.name} />
            )}
            <BidderProgress playerIds={a.activeBidderIds} players={gs.players} currentId={currentBidderId} />
          </div>
        </GameLayout>
      );
    }

    // 지정가 경매
    if (currentAuction.type === 'fixed') {
      const a = currentAuction as FixedAuction;
      const amISeller = isMyPlayerId(a.sellerId);
      const fixedColor = AUCTION_TYPE_COLORS['fixed'];

      if (a.subPhase === 'setting') {
        return (
          <GameLayout gs={gs} myClientId={myClientId}>
            <div className="space-y-4">
              <AuctionHeader icon="🏷️" label="지정가 경매" sellerName={seller.name} color={fixedColor} />
              <AuctionCardDisplay cards={a.cards} />
              {amISeller ? (
                <>
                  <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
                    style={{ background: fixedColor + '10', borderColor: fixedColor + '30' }}>
                    <span className="text-xl">💰</span>
                    <div className="text-white/60 text-sm">판매 가격을 설정하세요</div>
                  </div>
                  <BidInput minBid={1} maxBid={999} onSubmit={v => perform(s => fixedSetPrice(s, v))} label="가격 설정" accentColor={fixedColor} />
                </>
              ) : (
                <WaitingForPlayer name={seller.name} detail="판매 가격 설정 중..." />
              )}
            </div>
          </GameLayout>
        );
      }

      const nonSellers = gs.players.filter(p => p.id !== a.sellerId);
      const offerTo = nonSellers[a.currentOfferIndex];
      const amIBuyer = offerTo.clientId === myClientId;

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="space-y-4">
            <AuctionHeader icon="🏷️" label="지정가 경매" sellerName={seller.name} color={fixedColor} />
            <AuctionCardDisplay cards={a.cards} />
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-1">지정 가격</div>
              <div className="text-5xl font-black text-amber-400">{a.fixedPrice}M</div>
            </div>
            <PlayerTurnBanner name={offerTo.name} cash={offerTo.cash} isMe={amIBuyer} />
            {amIBuyer ? (
              <div className="space-y-2">
                <button onClick={() => perform(s => fixedAccept(s))}
                  disabled={offerTo.cash < a.fixedPrice}
                  className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {offerTo.cash < a.fixedPrice ? `💸 잔고 부족 (${offerTo.cash}M)` : `💰 구매 (${a.fixedPrice}M)`}
                </button>
                <button onClick={() => perform(s => fixedDecline(s))}
                  className="w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 font-bold transition-colors border border-white/10">
                  거절
                </button>
              </div>
            ) : (
              <WaitingForPlayer name={offerTo.name} detail={`${a.fixedPrice}M 수락/거절 대기 중`} />
            )}
            {nonSellers.slice(a.currentOfferIndex + 1).length > 0 && (
              <div className="text-white/45 text-xs text-center">
                다음 제안: {nonSellers.slice(a.currentOfferIndex + 1).map(p => p.name).join(' → ')}
              </div>
            )}
          </div>
        </GameLayout>
      );
    }

    // 비밀 경매
    if (currentAuction.type === 'secret') {
      const a = currentAuction as SecretAuction;
      const secretColor = AUCTION_TYPE_COLORS['secret'];

      if (a.subPhase === 'collecting') {
        const myPlayerId = myPlayer?.id;
        const iAmSeller = isMyPlayerId(a.sellerId);
        const myBidAmount = myPlayerId ? a.bids[myPlayerId] : -1;
        const hasIBid = (myBidAmount ?? -1) >= 0;
        const submittedCount = a.bidOrder.filter(id => (a.bids[id] ?? -1) >= 0).length;

        return (
          <GameLayout gs={gs} myClientId={myClientId}>
            <div className="space-y-4">
              <AuctionHeader icon="🤫" label="비밀 경매" sellerName={seller.name} color={secretColor} />
              <AuctionCardDisplay cards={a.cards} />
              {iAmSeller ? (
                <div className="text-center py-3 text-white/40 text-sm">판매자 — 모든 플레이어의 입찰 대기 중</div>
              ) : hasIBid ? (
                <div className="text-center py-3 text-green-400/70 text-sm font-semibold">
                  ✓ 입찰 완료 ({myBidAmount}M) — 다른 플레이어 대기 중
                </div>
              ) : (
                <>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center text-white/50 text-sm">
                    비밀 입찰 금액을 입력하세요 (다른 플레이어에게 보이지 않습니다)
                  </div>
                  <BidInput minBid={1} maxBid={myPlayer!.cash}
                    onSubmit={v => {
                      // 1. 로컬 낙관적 업데이트 (즉시 "입찰 완료" 표시)
                      setGs(prev => {
                        if (!prev || prev.phase !== 'auction') return prev;
                        const auction = prev.currentAuction as SecretAuction;
                        if (!auction || auction.type !== 'secret') return prev;
                        return { ...prev, currentAuction: { ...auction, bids: { ...auction.bids, [myPlayer!.id]: v } } };
                      });
                      // 2. 이 플레이어의 입찰만 원자적으로 Firebase에 기록 (race condition 방지)
                      submitSecretBidAtomic(code, myPlayer!.id, v);
                    }}
                    label="비밀 입찰" accentColor={secretColor} playerCash={myPlayer!.cash} />
                </>
              )}
              <div className="text-white/40 text-xs text-center">
                입찰 완료: {submittedCount}/{a.bidOrder.length}명
              </div>
            </div>
          </GameLayout>
        );
      }

      // 결과 공개
      const entries = Object.entries(a.bids)
        .map(([id, bid]) => ({ player: getPlayerById(gs, id), bid }))
        .filter((e): e is { player: NonNullable<typeof e.player>; bid: number } => e.player != null)
        .sort((x, y) => y.bid - x.bid);

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="space-y-4">
            <AuctionHeader icon="🤫" label="비밀 경매 — 결과 공개" sellerName={seller.name} color={secretColor} />
            <AuctionCardDisplay cards={a.cards} />
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div key={e.player.id} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? 'bg-amber-500/15 border-amber-500/40' : 'bg-white/4 border-transparent'
                  }`}>
                  <span className={`font-bold ${i === 0 ? 'text-amber-400' : 'text-white/60'}`}>
                    {i === 0 && '🏆 '}{e.player.name}
                    {e.player.clientId === myClientId && <span className="text-white/30 text-xs ml-1">(나)</span>}
                  </span>
                  <span className={`font-black text-xl ${i === 0 ? 'text-amber-400' : 'text-white/40'}`}>{e.bid}M</span>
                </div>
              ))}
            </div>
            <button onClick={() => perform(s => secretResolve(s))}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base transition-colors">
              낙찰 확정
            </button>
          </div>
        </GameLayout>
      );
    }

    // 한 바퀴 경매
    if (currentAuction.type === 'once-around') {
      const a = currentAuction as OnceAroundAuction;
      const currentOfferId = a.bidOrder[a.currentOfferIndex];
      const currentOfferPlayer = getPlayerById(gs, currentOfferId)!;
      const isSeller = currentOfferId === a.sellerId;
      const amIBidder = isMyPlayerId(currentOfferId);
      const onceColor = AUCTION_TYPE_COLORS['once-around'];

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="space-y-4">
            <AuctionHeader icon="🔄" label="한 바퀴 경매" sellerName={seller.name} color={onceColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentOfferPlayer.name} cash={currentOfferPlayer.cash}
              badge={isSeller ? '(판매자)' : undefined} isMe={amIBidder} />
            {amIBidder ? (
              <div className="space-y-2">
                <BidInput minBid={a.currentBid + 1} maxBid={currentOfferPlayer.cash}
                  onSubmit={v => perform(s => onceAroundBid(s, v))} label="입찰" accentColor={onceColor} playerCash={currentOfferPlayer.cash} />
                <button onClick={() => perform(s => onceAroundPass(s))}
                  className="w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 font-bold transition-colors border border-white/10">
                  {isSeller && !a.currentWinnerId ? '가져가기 (공짜)' : '패스'}
                </button>
              </div>
            ) : (
              <WaitingForPlayer name={currentOfferPlayer.name} />
            )}
            <OnceAroundProgress bidOrder={a.bidOrder} currentIdx={a.currentOfferIndex} players={gs.players} sellerId={a.sellerId} />
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
    // 참가자 누구나 다음으로 진행 가능
    const canAdvance = myPlayer != null;

    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="flex flex-col items-center gap-4">
          {triggerArtist && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-center w-full">
              <div className="text-red-400 font-black text-lg">⚠️ 라운드 종료!</div>
              <div className="text-white/60 text-sm mt-1">{triggerArtist.avatar} {triggerArtist.name} 5장 달성</div>
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center w-full">
            {isNoContest && roundEndArtistId ? (
              <>
                <div className="text-red-400 text-sm mb-2 font-bold">5번째 카드 출품 — 경매 취소</div>
                <div className="text-white/60 mt-1">카드가 버려집니다</div>
              </>
            ) : isNoContest ? (
              <>
                <div className="text-white/40 text-sm mb-2">낙찰자 없음</div>
                <div className="text-amber-400 text-2xl font-black">{seller.name}</div>
                <div className="text-white/60 mt-1">이 가져갑니다</div>
              </>
            ) : (
              <>
                <div className="text-white/40 text-sm mb-1">낙찰!</div>
                <div className="text-amber-400 text-3xl font-black">{winner.name}</div>
                <div className="text-white/60 mt-2 text-xl font-black">{lastAuctionResult.price}M</div>
                {winner.id !== seller.id && (
                  <div className="text-green-400/80 text-sm mt-2 font-semibold">판매자: {seller.name} +{lastAuctionResult.price}M</div>
                )}
              </>
            )}
          </div>
          <AuctionCardDisplay cards={lastAuctionResult.cards} />
          {/* 나의 거래 결과 */}
          {myPlayer && (() => {
            const { winnerId, sellerId, price, noContest } = lastAuctionResult;
            const isWinner = winnerId === myPlayer.id;
            const isSeller = sellerId === myPlayer.id;
            if (isWinner && !noContest) {
              return (
                <div className="w-full space-y-2">
                  <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 16, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,.6)' }}>나 (낙찰){isSeller ? ' · 판매자 무상' : ''}</span>
                    <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, fontWeight: 900, color: isSeller ? '#10b981' : '#ef4444' }}>
                      {isSeller ? '0M' : `-${price}M`}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,183,43,.06)', border: '1px solid rgba(255,183,43,.2)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🎨</span>
                    <span style={{ fontFamily: 'var(--f-kr)', fontSize: 11, color: 'var(--gold)' }}>컬렉션에 추가됨 ({lastAuctionResult.cards.length}장)</span>
                  </div>
                </div>
              );
            }
            if (isSeller && winnerId !== myPlayer.id && !noContest) {
              return (
                <div className="w-full" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 16, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'rgba(255,255,255,.6)' }}>나 (판매)</span>
                  <span style={{ fontFamily: 'var(--f-title)', fontSize: 22, fontWeight: 900, color: '#10b981' }}>+{price}M</span>
                </div>
              );
            }
            return null;
          })()}
          <div className="w-full space-y-1.5">
            {gs.players.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 bg-white/4 rounded-xl border border-white/8">
                <span className="text-white/60 text-sm font-semibold">
                  {p.name}{p.clientId === myClientId && <span className="text-white/30 text-xs ml-1">(나)</span>}
                </span>
                <span className="text-green-400 font-black">{p.cash}M</span>
              </div>
            ))}
          </div>
          {canAdvance ? (
            <button onClick={() => perform(s => acknowledgeResult(s))}
              className="px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg w-full transition-colors">
              {triggerArtist ? '라운드 채점 보기' : '다음 턴'}
            </button>
          ) : (
            <div className="text-white/35 text-sm">대기 중...</div>
          )}
        </div>
      </GameLayout>
    );
  }

  // ─── 라운드 채점 ─────────────────────────────────────────────
  if (phase === 'round-scoring') {
    const lastResult = gs.roundResults[gs.roundResults.length - 1];
    const isLastRound = gs.round >= gs.maxRounds;

    return (
      <GameLayout gs={gs} myClientId={myClientId}>
        <div className="space-y-6">
          <div className="text-center pt-2">
            <div className="text-white/30 text-sm tracking-widest uppercase mb-1">라운드 {gs.round} 종료</div>
            <div className="text-white font-black text-2xl">작가 순위 및 가치</div>
          </div>
          <div className="space-y-2">
            {lastResult.rankings.filter(r => r.count > 0).map(r => {
              const artist = getArtistById(r.artistId);
              return (
                <div key={r.artistId} className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: artist.color + '12', borderLeft: `3px solid ${artist.color}` }}>
                  <span className="text-3xl">{artist.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm" style={{ color: artist.color }}>{artist.name}</div>
                    <div className="text-white/40 text-xs">{r.count}장 출품</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.rank ? (
                      <>
                        <div className="text-white/50 text-xs">{r.rank}위 +{r.addedValue}M</div>
                        <div className="font-black text-amber-400 text-lg">= {r.cumulativeValue}M</div>
                      </>
                    ) : (
                      <div className="text-white/25 text-sm">순위 외</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-3">현재 자산 순위</div>
            <div className="space-y-2">
              {gs.players
                .map(p => {
                  const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
                  return { ...p, collVal, total: p.cash + collVal };
                })
                .sort((a, b) => b.total - a.total)
                .map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/4 border-transparent'
                    }`}>
                    <span className={`text-lg font-black w-6 text-center ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>{i + 1}</span>
                    <span className={`flex-1 font-bold ${i === 0 ? 'text-white' : 'text-white/70'}`}>
                      {p.name}{p.clientId === myClientId && <span className="text-white/35 text-xs ml-1">(나)</span>}
                    </span>
                    <div className="text-right">
                      <div className="text-white/40 text-xs">현금 {p.cash}M + 작품 {p.collVal}M</div>
                      <div className={`font-black text-xl ${i === 0 ? 'text-amber-400' : 'text-white'}`}>{p.total}M</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          {/* 누구나 다음 라운드로 진행 가능 */}
          <button onClick={() => perform(s => acknowledgeScoring(s))}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg transition-colors">
            {isLastRound ? '최종 결과 보기' : `라운드 ${gs.round + 1} 시작`}
          </button>
        </div>
      </GameLayout>
    );
  }

  // ─── 게임 종료 ─────────────────────────────────────────────
  if (phase === 'game-over') {
    const finalScores = calcFinalScores(gs);
    return (
      <main className="min-h-screen bg-[#0d0d1a] p-4 md:p-8 pb-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-3xl font-black text-amber-400">{finalScores[0].name}</div>
            <div className="text-white/50 mt-1 text-lg">승리!</div>
          </div>
          <div className="space-y-3">
            {finalScores.map((p, i) => (
              <div key={p.id} className={`rounded-2xl p-5 border ${i === 0 ? 'bg-amber-500/12 border-amber-500/30' : 'bg-white/4 border-white/8'
                }`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-2xl font-black w-10 ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>{i + 1}위</span>
                  <span className={`flex-1 font-black text-lg ${i === 0 ? 'text-amber-300' : 'text-white/80'}`}>
                    {p.name}
                    {gs.players.find(pl => pl.id === p.id)?.clientId === myClientId && (
                      <span className="text-white/30 text-sm ml-1">(나)</span>
                    )}
                  </span>
                  <span className={`font-black text-2xl ${i === 0 ? 'text-amber-400' : 'text-white'}`}>{p.total}M</span>
                </div>
                <div className="flex gap-6 text-xs text-white/40 mb-3">
                  <span>💰 현금 {p.cash}M</span>
                  <span>🎨 작품 {p.collectionValue}M</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {p.cardsByArtist.filter(a => a.count > 0).map(a => {
                    const artist = getArtistById(a.artistId);
                    return (
                      <span key={a.artistId} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: artist.color + '25', color: artist.color, border: `1px solid ${artist.color}40` }}>
                        {artist.avatar} ×{a.count} ({a.value > 0 ? `${a.count * a.value}M` : '0M'})
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-3">최종 작가 가치</div>
            <div className="grid grid-cols-5 gap-2">
              {ARTISTS.map(a => (
                <div key={a.id} className="flex flex-col items-center p-3 rounded-2xl"
                  style={{ background: a.color + '15', border: `1px solid ${a.color}25` }}>
                  <span className="text-2xl mb-1">{a.avatar}</span>
                  <span className="text-sm font-black" style={{ color: a.color }}>
                    {gs.artistValues[a.id] ?? 0}M
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <a href="/modern-art"
              className="block text-center py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base transition-colors">
              새 게임
            </a>
            <a href="/lobby"
              className="block text-center py-3 rounded-2xl bg-white/8 hover:bg-white/12 text-white/50 text-sm transition-colors">
              로비로 돌아가기
            </a>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
