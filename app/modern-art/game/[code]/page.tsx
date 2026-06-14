'use client';

import { useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getGuestUid } from '@/lib/auth';
import { subscribeRoom, updateGameState, finishGame } from '@/lib/modern-art/firebase-game';
import {
  ARTISTS, AUCTION_TYPE_ICONS, AUCTION_TYPE_LABELS, AUCTION_TYPE_COLORS, getArtistById,
} from '@/lib/modern-art/game-data';
import {
  selectCard, selectDoubleSecond,
  openBid, openPass, openStand,
  fixedSetPrice, fixedAccept, fixedDecline,
  secretSubmitBid, secretResolve,
  onceAroundBid, onceAroundPass,
  acknowledgeResult, acknowledgeScoring,
  calcFinalScores, getPlayerById,
} from '@/lib/modern-art/game-logic';
import {
  GameState, Card, OpenAuction, FixedAuction, SecretAuction, OnceAroundAuction,
} from '@/lib/modern-art/types';

// ─── 공유 UI 컴포넌트 ─────────────────────────────────────────
function ArtworkImage({ artistId, avatar, artworkIndex, className }: {
  artistId: string; avatar: string; artworkIndex: number; className?: string;
}) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`flex items-center justify-center ${className ?? ''}`}>
        <span className="text-5xl">{avatar}</span>
      </div>
    );
  }
  return (
    <img
      src={`/modern-art/${artistId}/${artworkIndex}.png`}
      alt={`${artistId}-${artworkIndex}`}
      className={`object-cover ${className ?? ''}`}
      onError={() => setErr(true)}
    />
  );
}

function ArtCard({ card, selected, onClick, dimmed }: {
  card: Card; selected?: boolean; onClick?: () => void; dimmed?: boolean;
}) {
  const artist = getArtistById(card.artistId);
  const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
  return (
    <button
      onClick={onClick}
      disabled={dimmed}
      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 w-full aspect-[3/4]
        ${selected ? 'scale-105 shadow-2xl' : ''}
        ${dimmed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer'}
      `}
      style={{
        borderColor: selected ? artist.color : artist.color + '50',
        boxShadow: selected ? `0 0 24px ${artist.color}50` : undefined,
      }}
    >
      <div className="flex-1 w-full relative"
        style={{ background: `linear-gradient(145deg, ${artist.color}28, ${artist.color}08)` }}>
        <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
        <span
          className="absolute top-1.5 right-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold backdrop-blur-sm"
          style={{ background: auctionColor + '99', color: 'white', border: `1px solid ${auctionColor}` }}
        >
          {AUCTION_TYPE_ICONS[card.auctionType]}
        </span>
      </div>
      <div className="px-2 py-1.5 flex-shrink-0 text-left" style={{ background: `${artist.color}20` }}>
        <div className="text-xs font-black leading-tight truncate" style={{ color: artist.color }}>{artist.name}</div>
        <div className="text-[10px] text-white/40">{AUCTION_TYPE_LABELS[card.auctionType]}</div>
      </div>
    </button>
  );
}

function MarketBoard({ roundMarket, artistValues }: {
  roundMarket: Record<string, number>; artistValues: Record<string, number>;
}) {
  return (
    <div className="space-y-2">
      {ARTISTS.map(a => {
        const count = roundMarket[a.id] ?? 0;
        const value = artistValues[a.id] ?? 0;
        const pct = (count / 5) * 100;
        const isClose = count >= 4;
        return (
          <div key={a.id} className="flex items-center gap-2">
            <span className="text-base w-6 text-center flex-shrink-0">{a.avatar}</span>
            <div className="flex-1">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: isClose ? '#ef4444' : a.color }} />
              </div>
            </div>
            <span className={`text-xs font-bold w-7 text-right flex-shrink-0 ${isClose ? 'text-red-400' : 'text-white/50'}`}>
              {count}/5
            </span>
            {value > 0
              ? <span className="text-[11px] font-bold w-8 text-right flex-shrink-0" style={{ color: a.color }}>{value}M</span>
              : <span className="w-8 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function BidInput({ minBid, maxBid, onSubmit, label = '입찰' }: {
  minBid: number; maxBid: number; onSubmit: (v: number) => void; label?: string;
}) {
  const [val, setVal] = useState(minBid);
  const adjust = (d: number) => setVal(v => Math.min(maxBid, Math.max(minBid, v + d)));
  const presets = [10, 20, 50, 100].filter(v => v > minBid && v <= maxBid);
  return (
    <div className="space-y-3">
      {/* 금액 표시 */}
      <div className="flex items-center justify-center bg-white/8 border border-white/15 rounded-2xl py-3">
        <div className="text-5xl font-black text-amber-400 leading-none">{val}</div>
        <div className="text-white/30 text-lg ml-1 mt-2">M</div>
      </div>
      {/* ±버튼 */}
      <div className="flex gap-1.5 justify-center">
        {([-5, -1, 1, 5] as const).map(d => (
          <button key={d} onClick={() => adjust(d)}
            className="w-14 h-9 rounded-xl bg-white/8 hover:bg-white/14 text-white/60 hover:text-white/80 font-bold transition-colors text-sm">
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      {(presets.length > 0 || maxBid >= minBid) && (
        <div className="flex gap-1.5">
          {presets.map(v => (
            <button key={v} onClick={() => setVal(v)}
              className="flex-1 py-2 rounded-xl bg-white/6 hover:bg-white/12 text-white/50 hover:text-white/80 text-xs font-bold transition-colors">
              {v}M
            </button>
          ))}
          <button onClick={() => setVal(maxBid)}
            className="flex-1 py-2 rounded-xl bg-white/6 hover:bg-white/12 text-white/50 hover:text-white/80 text-xs font-bold transition-colors">
            MAX
          </button>
        </div>
      )}
      <button onClick={() => onSubmit(val)} disabled={val > maxBid || val < minBid}
        className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {label} — {val}M
      </button>
    </div>
  );
}

function AuctionCardDisplay({ cards }: { cards: Card[] }) {
  const isDouble = cards.length === 2;
  return (
    <div className="flex gap-4 justify-center py-2">
      {cards.map((card, idx) => {
        const artist = getArtistById(card.artistId);
        const auctionColor = AUCTION_TYPE_COLORS[card.auctionType];
        return (
          <div key={card.id} className="rounded-3xl border-2 overflow-hidden flex-shrink-0 flex flex-col"
            style={{
              borderColor: idx === 0 && isDouble ? artist.color + 'aa' : artist.color,
              boxShadow: `0 0 60px ${artist.color}35, 0 8px 32px ${artist.color}20`,
              width: isDouble ? '140px' : '180px',
            }}>
            <div className="flex-1 w-full relative" style={{ aspectRatio: '3/4', background: `linear-gradient(145deg, ${artist.color}28, ${artist.color}08)` }}>
              <ArtworkImage artistId={artist.id} avatar={artist.avatar} artworkIndex={card.artworkIndex} className="w-full h-full" />
              <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: auctionColor + 'cc', color: 'white' }}>
                {AUCTION_TYPE_ICONS[card.auctionType]}
              </span>
            </div>
            <div className="px-3 py-2 text-center" style={{ background: `${artist.color}20` }}>
              <div className="font-black text-sm leading-tight" style={{ color: artist.color }}>{artist.name}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{AUCTION_TYPE_LABELS[card.auctionType]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 게임 레이아웃 (온라인용: 모든 플레이어 강조 없음) ────────
function GameLayout({ gs, myClientId, children }: { gs: GameState; myClientId: string; children: ReactNode }) {
  const currentPlayer = gs.players[gs.currentPlayerIndex];
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col">
      <header className="border-b border-white/10 bg-black/30 px-4 md:px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <span className="text-amber-400 font-black text-sm tracking-widest">MODERN ART</span>
        <div className="hidden md:block h-4 w-px bg-white/20" />
        <span className="hidden md:block text-white/40 text-sm">라운드 {gs.round} / {gs.maxRounds}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-amber-400 text-sm font-bold truncate">{currentPlayer.name}</span>
          <span className="text-white/40 text-xs flex-shrink-0">의 차례</span>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-white/8 bg-black/15 overflow-y-auto">
          <div className="p-4 border-b border-white/8">
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">플레이어</div>
            <div className="space-y-2">
              {gs.players.map(p => {
                const isCurrent = p.id === currentPlayer.id;
                const isMe = p.clientId === myClientId;
                const collVal = p.collection.reduce((s, c) => s + (gs.artistValues[c.artistId] ?? 0), 0);
                return (
                  <div key={p.id} className={`rounded-xl p-2.5 border transition-colors ${
                    isCurrent ? 'bg-amber-500/12 border-amber-500/30' : 'bg-white/4 border-transparent'
                  }`}>
                    <div className={`text-xs font-bold truncate flex items-center gap-1 ${isCurrent ? 'text-amber-400' : 'text-white/60'}`}>
                      {isCurrent && <span className="text-[8px]">▶</span>}
                      {p.name}
                      {isMe && <span className="text-[9px] text-white/30 ml-1">(나)</span>}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-green-400 text-sm font-black">{p.cash}M</span>
                      {collVal > 0 && <span className="text-white/35 text-[10px]">+{collVal}</span>}
                    </div>
                    <div className="text-white/25 text-[10px] mt-0.5">패 {p.hand.length}장 · 수집 {p.collection.length}장</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4">
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">라운드 {gs.round} 시장</div>
            <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
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
    <div className={`border rounded-xl p-4 flex items-center justify-between ${
      isMe ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/25'
    }`}>
      <div>
        <div className={`font-black text-base ${isMe ? 'text-green-400' : 'text-amber-400'}`}>
          {isMe ? '내 차례!' : name}{badge ? ` ${badge}` : ''}
        </div>
        <div className="text-white/40 text-xs">의 차례</div>
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
          <span key={id} className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
            isCurrent ? 'bg-amber-500/25 text-amber-300 border-amber-500/40' : 'bg-white/8 text-white/40 border-transparent'
          }`}>
            {isCurrent && '▶ '}{p.name}
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
    <div className="flex gap-2 flex-wrap">
      {bidOrder.map((id, i) => {
        const p = players.find(pl => pl.id === id)!;
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <span key={id} className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
            current ? 'bg-amber-500/25 text-amber-300 border-amber-500/40' :
            done ? 'bg-white/4 text-white/20 border-transparent line-through' :
            'bg-white/8 text-white/45 border-transparent'
          }`}>
            {current && '▶ '}{p.name}
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
  const finishedRef = useRef(false);

  const myClientId = typeof window !== 'undefined' ? (getGuestUid() ?? '') : '';

  useEffect(() => {
    const unsub = subscribeRoom(code, room => {
      if (!room) { router.replace('/modern-art'); return; }
      if (room.gameState) setGs(room.gameState);
    });
    return unsub;
  }, [code, router]);

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
        <div className="p-4 md:p-6 space-y-4">
          <div className="text-white/50 text-sm">경매에 올릴 카드를 선택하세요</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
            {myPlayer.hand.map(card => (
              <ArtCard key={card.id} card={card} onClick={() => perform(s => selectCard(s, card.id))} />
            ))}
          </div>
          <div className="md:hidden pt-3 border-t border-white/10">
            <div className="text-xs text-white/30 mb-2">이번 라운드 시장</div>
            <MarketBoard roundMarket={gs.roundMarket} artistValues={gs.artistValues} />
          </div>
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
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-center">
            <div className="text-red-400 font-black text-xl mb-1">🎴 더블 경매</div>
            <div className="text-white/50 text-sm">같은 작가의 카드를 하나 더 선택하세요</div>
          </div>
          <div className="flex justify-center"><div className="w-24 md:w-32"><ArtCard card={firstCard} selected /></div></div>
          <div className="text-white/30 text-xs text-center">+ 아래 중 하나 선택</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
            {sameArtist.map(card => (
              <ArtCard key={card.id} card={card} onClick={() => perform(s => selectDoubleSecond(s, card.id))} />
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── 경매 화면 ─────────────────────────────────────────────
  if (phase === 'auction' && currentAuction) {
    const seller = getPlayerById(gs, currentAuction.sellerId)!;

    // 공개 / 더블 경매
    if (currentAuction.type === 'open' || currentAuction.type === 'double') {
      const a = currentAuction as OpenAuction;
      const currentBidderId = a.activeBidderIds[a.currentBidderIndex];
      const currentBidder = getPlayerById(gs, currentBidderId)!;
      const isWinner = a.currentWinnerId === currentBidderId;
      const amIBidder = isMyPlayerId(currentBidderId);
      const auctionType = a.type;
      const auctionLabel = auctionType === 'double' ? '더블 경매' : '공개 경매';
      const auctionIcon = auctionType === 'double' ? '🎴' : '📣';
      const auctionColor = AUCTION_TYPE_COLORS[auctionType];

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="p-4 md:p-6 space-y-4">
            <AuctionHeader icon={auctionIcon} label={auctionLabel} sellerName={seller.name} color={auctionColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentBidder.name} cash={currentBidder.cash} isMe={amIBidder} />
            {amIBidder ? (
              <div className="space-y-2">
                <BidInput minBid={a.currentBid + 1} maxBid={currentBidder.cash}
                  onSubmit={v => perform(s => openBid(s, v))} label="입찰" />
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
            <div className="p-4 md:p-6 space-y-4">
              <AuctionHeader icon="🏷️" label="지정가 경매" sellerName={seller.name} color={fixedColor} />
              <AuctionCardDisplay cards={a.cards} />
              {amISeller ? (
                <>
                  <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
                    style={{ background: fixedColor + '10', borderColor: fixedColor + '30' }}>
                    <span className="text-xl">💰</span>
                    <div className="text-white/60 text-sm">판매 가격을 설정하세요</div>
                  </div>
                  <BidInput minBid={1} maxBid={999} onSubmit={v => perform(s => fixedSetPrice(s, v))} label="가격 설정" />
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
          <div className="p-4 md:p-6 space-y-4">
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
                  className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg transition-colors">
                  💰 구매 ({a.fixedPrice}M)
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
              <div className="text-white/25 text-xs text-center">
                다음 제안: {nonSellers.slice(a.currentOfferIndex + 1).map(p => p.name).join(', ')}
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
        const bidderId = a.bidOrder[a.currentBidderIndex];
        const bidder = getPlayerById(gs, bidderId)!;
        const amIBidder = isMyPlayerId(bidderId);

        return (
          <GameLayout gs={gs} myClientId={myClientId}>
            <div className="p-4 md:p-6 space-y-4">
              <AuctionHeader icon="🤫" label="비밀 경매" sellerName={seller.name} color={secretColor} />
              <AuctionCardDisplay cards={a.cards} />
              <PlayerTurnBanner name={bidder.name} cash={bidder.cash} isMe={amIBidder} />
              {amIBidder ? (
                <>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center text-white/50 text-sm">
                    비밀 입찰 금액을 입력하세요 (다른 플레이어에게 보이지 않습니다)
                  </div>
                  <BidInput minBid={0} maxBid={bidder.cash}
                    onSubmit={v => perform(s => secretSubmitBid(s, v))} label="비밀 입찰" />
                </>
              ) : (
                <WaitingForPlayer name={bidder.name} detail="비밀 입찰 중..." />
              )}
              {a.currentBidderIndex > 0 && (
                <div className="text-white/25 text-xs text-center">
                  완료: {a.bidOrder.slice(0, a.currentBidderIndex).map(id => getPlayerById(gs, id)?.name).join(', ')}
                </div>
              )}
            </div>
          </GameLayout>
        );
      }

      // 결과 공개
      const entries = Object.entries(a.bids).map(([id, bid]) => ({
        player: getPlayerById(gs, id)!,
        bid,
      })).sort((x, y) => y.bid - x.bid);

      return (
        <GameLayout gs={gs} myClientId={myClientId}>
          <div className="p-4 md:p-6 space-y-4">
            <AuctionHeader icon="🤫" label="비밀 경매 — 결과 공개" sellerName={seller.name} color={secretColor} />
            <AuctionCardDisplay cards={a.cards} />
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div key={e.player.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                  i === 0 ? 'bg-amber-500/15 border-amber-500/40' : 'bg-white/4 border-transparent'
                }`}>
                  <span className={`font-bold ${i === 0 ? 'text-amber-400' : 'text-white/60'}`}>
                    {i === 0 && '🏆 '}{e.player.name}
                    {e.player.clientId === myClientId && <span className="text-white/30 text-xs ml-1">(나)</span>}
                  </span>
                  <span className={`font-black text-xl ${i === 0 ? 'text-amber-400' : 'text-white/40'}`}>{e.bid}M</span>
                </div>
              ))}
            </div>
            {isMyPlayerId(a.sellerId) && (
              <button onClick={() => perform(s => secretResolve(s))}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base transition-colors">
                낙찰 확정
              </button>
            )}
            {!isMyPlayerId(a.sellerId) && (
              <div className="text-white/30 text-sm text-center">{seller.name}님이 낙찰을 확정 중...</div>
            )}
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
          <div className="p-4 md:p-6 space-y-4">
            <AuctionHeader icon="🔄" label="한 바퀴 경매" sellerName={seller.name} color={onceColor} />
            <AuctionCardDisplay cards={a.cards} />
            <CurrentBidDisplay bid={a.currentBid} winnerName={a.currentWinnerId ? getPlayerById(gs, a.currentWinnerId)?.name : undefined} />
            <PlayerTurnBanner name={currentOfferPlayer.name} cash={currentOfferPlayer.cash}
              badge={isSeller ? '(판매자)' : undefined} isMe={amIBidder} />
            {amIBidder ? (
              <div className="space-y-2">
                <BidInput minBid={a.currentBid + 1} maxBid={currentOfferPlayer.cash}
                  onSubmit={v => perform(s => onceAroundBid(s, v))} label="입찰" />
                <button onClick={() => perform(s => onceAroundPass(s))}
                  className="w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 font-bold transition-colors border border-white/10">
                  {isSeller && !a.currentWinnerId ? '가져가기 (공짜)' : '패스'}
                </button>
              </div>
            ) : (
              <WaitingForPlayer name={currentOfferPlayer.name} />
            )}
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
    // 다음 차례 플레이어가 확인 버튼을 누름
    const nextIndex = roundEndArtistId
      ? gs.currentPlayerIndex
      : (gs.currentPlayerIndex + 1) % gs.players.length;
    const canAdvance = myPlayerIndex === nextIndex || myPlayerIndex === gs.currentPlayerIndex;

    return (
      <main className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center p-6 gap-6">
        {triggerArtist && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-center w-full max-w-sm">
            <div className="text-red-400 font-black text-lg">⚠️ 라운드 종료!</div>
            <div className="text-white/60 text-sm mt-1">{triggerArtist.avatar} {triggerArtist.name} 5장 달성</div>
          </div>
        )}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center w-full max-w-sm">
          {isNoContest ? (
            <>
              <div className="text-white/40 text-sm mb-2">낙찰자 없음</div>
              <div className="text-amber-400 text-2xl font-black">{seller.name}</div>
              <div className="text-white/60 mt-1">이 가져갑니다</div>
            </>
          ) : (
            <>
              <div className="text-white/40 text-sm mb-2">낙찰!</div>
              <div className="text-amber-400 text-3xl font-black">{winner.name}</div>
              <div className="text-white/60 mt-2 text-lg">{lastAuctionResult.price}M</div>
              {winner.id !== seller.id && (
                <div className="text-white/35 text-sm mt-1">판매자 {seller.name} +{lastAuctionResult.price}M</div>
              )}
            </>
          )}
        </div>
        <AuctionCardDisplay cards={lastAuctionResult.cards} />
        <div className="w-full max-w-sm space-y-1.5">
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
            className="px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-lg w-full max-w-sm transition-colors">
            {triggerArtist ? '라운드 채점 보기' : '다음 턴'}
          </button>
        ) : (
          <div className="text-white/35 text-sm">
            {gs.players[nextIndex]?.name}님이 확인 중...
          </div>
        )}
      </main>
    );
  }

  // ─── 라운드 채점 ─────────────────────────────────────────────
  if (phase === 'round-scoring') {
    const lastResult = gs.roundResults[gs.roundResults.length - 1];
    const isLastRound = gs.round >= gs.maxRounds;

    return (
      <main className="min-h-screen bg-[#0d0d1a] p-4 md:p-8 pb-10">
        <div className="max-w-2xl mx-auto space-y-6">
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
                  <div key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border ${
                    i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/4 border-transparent'
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
      </main>
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
              <div key={p.id} className={`rounded-2xl p-5 border ${
                i === 0 ? 'bg-amber-500/12 border-amber-500/30' : 'bg-white/4 border-white/8'
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
