'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGuestUid } from '@/lib/auth';
import { subscribeRoom, act, type Room } from '@/lib/modern-art/firebase-game';
import {
  ARTISTS, AUCTION_INFO, SALES_PER_ROUND, TOTAL_ROUNDS, marketValues, workOf, doublePartners,
  type Action, type BidType, type Card, type GameState,
} from '@/lib/modern-art/game';

const ACCENT = '#e879f9';
const ACCENT_LO = '#a21caf';
const btn = { '--c': ACCENT, '--c-lo': ACCENT_LO, color: '#fff' } as React.CSSProperties;

// 레이아웃: 넓은 화면은 [시장 | 경매장] 2단, 좁은 화면은 경매장 → 시장 순으로 쌓임
const CSS = `
.ma-top { display: grid; gap: 12px; grid-template-columns: 1fr; }
.ma-stage { order: -1; }
.ma-players { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
@media (min-width: 760px) {
  .ma-top { grid-template-columns: 240px 1fr; }
  .ma-stage { order: 0; }
}
.ma-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x proximity; }
.ma-scroll > * { scroll-snap-align: start; }
.ma-lbl { font-family: var(--f-disp); font-size: 11px; letter-spacing: 1.5px; color: var(--dim); margin: 0 0 8px; }
@keyframes maHammer { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
`;

const SIZES = { sm: { w: 104, img: 96 }, md: { w: 132, img: 124 }, lg: { w: 230, img: 230 } };

/** 작품 카드: 이미지는 잘리지 않게 contain, 아래에 작가 · 경매 방식 */
function ArtCard({ card, size = 'md', onClick, disabled, value }: {
  card: Card; size?: keyof typeof SIZES; onClick?: () => void; disabled?: boolean; value?: number;
}) {
  const a = ARTISTS[card.artist];
  const info = AUCTION_INFO[card.type];
  const work = workOf(card);
  const z = SIZES[size];
  const clickable = !!onClick && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      aria-label={`${a.name} · ${work.title} · ${info.label}`}
      style={{
        width: z.w, flexShrink: 0, padding: 0, borderRadius: 12, overflow: 'hidden', textAlign: 'left',
        background: 'var(--surface)', border: `2px solid ${a.color}`, color: 'var(--text)',
        cursor: clickable ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1,
        boxShadow: size === 'lg' ? `0 0 40px -8px ${a.color}` : undefined,
        transition: 'transform .12s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ height: z.img, background: '#0a0810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={work.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ padding: size === 'sm' ? '5px 6px' : '8px 9px', borderTop: `2px solid ${a.color}` }}>
        <div style={{ fontSize: size === 'lg' ? 16 : 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{work.title}</div>
        <div style={{ fontSize: size === 'lg' ? 13 : 11, color: a.color, fontWeight: 700 }}>{a.emoji} {a.name}</div>
        <div style={{
          marginTop: 4, display: 'inline-block', fontSize: size === 'lg' ? 13 : 11, fontWeight: 700,
          padding: '2px 6px', borderRadius: 6, background: 'var(--surface-3)', color: 'var(--text)',
        }}>
          {info.emoji} {info.label}
        </div>
        {value !== undefined && (
          <div style={{ fontSize: 11, color: value ? 'var(--gold)' : 'var(--faint)', marginTop: 3 }}>예상 가치 ${value}</div>
        )}
      </div>
    </button>
  );
}

function BidControls({ min, max, label, onBid, onPass, quick }: {
  min: number; max: number; label: string; onBid: (n: number) => void; onPass?: () => void; quick?: boolean;
}) {
  const [v, setV] = useState(String(min));
  useEffect(() => setV(String(min)), [min]);
  const n = Number(v);
  const ok = Number.isInteger(n) && n >= min && n <= max;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {quick && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[0, 4, 9].map(d => min + d <= max && (
            <button key={d} type="button" className="arc-btn-ghost" style={{ flex: 1, padding: '10px 8px' }} onClick={() => onBid(min + d)}>
              ${min + d}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--f-pix)', fontSize: 14, color: 'var(--gold)' }}>$</span>
          <input
            className="arc-field" type="number" inputMode="numeric" min={min} max={max} value={v}
            aria-label="금액" onChange={e => setV(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ok && onBid(n)}
            style={{ flex: 1, minWidth: 0, fontFamily: 'var(--f-pix)', fontSize: 14 }}
          />
        </label>
        <button type="button" className="arc-btn" style={{ ...btn, width: 'auto', padding: '0 18px' }} disabled={!ok} onClick={() => onBid(n)}>{label}</button>
      </div>
      {onPass && <button type="button" className="arc-btn-ghost" onClick={onPass}>패스</button>}
      <div style={{ fontSize: 11, color: 'var(--faint)' }}>입찰 가능: ${min} ~ ${max}</div>
    </div>
  );
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,3,10,.82)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

/** 팝업 틀: 바깥 클릭/Esc로 닫힘 */
function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} className="arc-panel ticks arc-pop"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, maxHeight: '90dvh', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/** 작품 보기 팝업 (읽기 전용) */
function ViewModal({ card, caption, onClose }: { card: Card; caption: React.ReactNode; onClose: () => void }) {
  const info = AUCTION_INFO[card.type];
  return (
    <Modal label="작품 보기" onClose={onClose}>
      <ArtCard card={card} size="lg" />
      <div style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{caption}</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>{info.emoji} {info.label}</div>
      </div>
      <button type="button" className="arc-btn-ghost" style={{ width: '100%' }} onClick={onClose}>닫기</button>
    </Modal>
  );
}

/** 손패 카드 출품 확인 팝업. 고정 가격이면 가격도 여기서 정한다. */
function PlayModal({ card, hand, value, busy, error, onConfirm, onClose }: {
  card: Card; hand: Card[]; value: number; busy: boolean; error: string;
  onConfirm: (price?: number, secondId?: number) => void; onClose: () => void;
}) {
  const isDouble = card.type === 'double';
  const partners = isDouble ? doublePartners(hand, card) : [];
  const [secondId, setSecondId] = useState(partners[0]?.id);
  const second = partners.find(c => c.id === secondId);
  // 실제 경매 방식: 1+1은 두 번째 카드, 단독 1+1은 자유 경매
  const type: BidType = isDouble ? (second?.type as BidType | undefined) ?? 'open' : card.type as BidType;
  const info = AUCTION_INFO[type];
  const fixed = type === 'fixed';
  const [price, setPrice] = useState('20');
  const n = Number(price);
  const ok = !fixed || (Number.isInteger(n) && n >= 1 && n <= 999);
  const confirm = () => ok && onConfirm(fixed ? n : undefined, second?.id);
  return (
    <Modal label="작품 출품" onClose={onClose}>
        <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, color: ACCENT }}>{isDouble && second ? '1+1로 2점을 출품할까요?' : '이 작품을 출품할까요?'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <ArtCard card={card} size={second ? 'md' : 'lg'} />
          {second && <><span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: ACCENT }}>+</span><ArtCard card={second} size="md" /></>}
        </div>
        {isDouble && (
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🎴 함께 올릴 {ARTISTS[card.artist].name} 작품 선택</div>
            {partners.length ? (
              <div className="ma-scroll" role="radiogroup" aria-label="함께 올릴 작품">
                {partners.map(c => (
                  <div key={c.id} role="radio" aria-checked={c.id === secondId}
                    style={{ borderRadius: 14, padding: 2, outline: c.id === secondId ? `3px solid ${ACCENT}` : 'none', opacity: c.id === secondId ? 1 : 0.6 }}>
                    <ArtCard card={c} size="sm" onClick={() => setSecondId(c.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--dim)', margin: 0 }}>같은 작가 작품이 없어 단독 자유 경매로 올라갑니다.</p>
            )}
          </div>
        )}
        <div style={{ width: '100%' }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 20 }}>{info.emoji} {info.label}{isDouble && second ? ' (두 번째 카드 방식)' : ''}</div>
          <p style={{ fontSize: 12, color: 'var(--dim)', margin: '4px 0 0', lineHeight: 1.5 }}>{info.desc}</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '6px 0 0' }}>
            지금 판매량 기준 예상 가치 <b style={{ color: value ? 'var(--gold)' : 'var(--faint)' }}>${value}{second ? ' × 2점' : ''}</b> · 낙찰금은 내가 받습니다
          </p>
        </div>
        {fixed && (
          <label style={{ width: '100%' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>판매 가격</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--f-pix)', fontSize: 14, color: 'var(--gold)' }}>$</span>
              <input className="arc-field" type="number" inputMode="numeric" min={1} max={999} value={price} autoFocus
                onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirm()}
                style={{ flex: 1, minWidth: 0, fontFamily: 'var(--f-pix)', fontSize: 14 }} />
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>아무도 사지 않으면 작품이 내 손패로 돌아옵니다</span>
          </label>
        )}
        {error && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button type="button" className="arc-btn-ghost" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button type="button" className="arc-btn" style={{ ...btn, flex: 2 }} disabled={!ok || busy} onClick={confirm}>
            {busy ? '...' : `${fixed && ok ? `$${n}에 ` : '🔨 '}${second ? '2점 ' : ''}출품하기`}
          </button>
        </div>
    </Modal>
  );
}

export default function ModernArtGamePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const uid = getGuestUid() ?? '';
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [picked, setPicked] = useState<Card | null>(null);
  const [viewing, setViewing] = useState<{ card: Card; caption: React.ReactNode } | null>(null);

  useEffect(() => subscribeRoom(code, r => {
    if (!r) { router.replace('/modern-art'); return; }
    setRoom(r);
  }), [code, router]);

  if (!room?.game) {
    return (
      <div className="cabinet"><div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>CONNECTING...</p>
        </div>
      </div>
    );
  }

  const g: GameState = room.game;
  const me = g.players.findIndex(p => p.id === uid);
  const mine = g.players[me];
  const au = g.auction;
  const totalSold = g.sold.reduce((x, y) => x + y, 0);
  const value = marketValues(g.sold);
  const prevValues = g.results[g.results.length - 1]?.values;
  const maxSold = Math.max(1, ...g.sold);
  const auctioneer = au ? au.seller : g.current;
  const settling = g.phase === 'roundEnd' || g.phase === 'over';

  const send = async (a: Action) => {
    setBusy(true); setError('');
    const err = await act(code, uid, a);
    if (err) setError(err);
    setBusy(false);
  };

  // ── 경매 상태 문구 + 내 조작 ──
  let headline = '';
  let controls: React.ReactNode = null;
  if (g.phase === 'play') {
    headline = g.current === me ? '🔨 내 차례 — 아래 손패에서 출품할 작품을 고르세요' : `🔨 ${g.players[g.current].name}님이 출품할 작품을 고르는 중`;
  } else if (au) {
    const isSeller = au.seller === me;
    if (au.type === 'fixed' && !au.price) {
      headline = isSeller ? '판매 가격을 정하세요' : `${g.players[au.seller].name}님이 가격을 정하는 중`;
      if (isSeller) controls = <BidControls min={1} max={999} label="가격 결정" onBid={n => send({ t: 'price', amount: n })} />;
    } else if (au.type === 'sealed') {
      const done = !isSeller && me in au.bids;
      headline = isSeller ? '다른 플레이어들이 비밀 입찰 중' : done ? `입찰 완료 ($${au.bids[me]}) — 다른 플레이어를 기다리는 중` : '비밀 입찰 — 금액은 공개 전까지 보이지 않습니다';
      if (!isSeller && mine && !done) {
        controls = <BidControls min={1} max={mine.money} label="입찰 확정" onBid={n => send({ t: 'bid', amount: n })} onPass={() => send({ t: 'pass' })} />;
      }
    } else {
      const turnName = au.turn === me ? '내' : `${g.players[au.turn].name}님`;
      headline = au.type === 'fixed' ? `${turnName} 구매 여부 결정 차례` : `${turnName} 입찰 차례`;
      if (au.turn === me && mine) {
        controls = au.type === 'fixed'
          ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="arc-btn" style={btn} disabled={mine.money < au.price} onClick={() => send({ t: 'bid', amount: au.price })}>
                ${au.price}에 구매
              </button>
              <button type="button" className="arc-btn-ghost" onClick={() => send({ t: 'pass' })}>패스</button>
            </div>
          )
          : <BidControls quick min={au.price + 1} max={mine.money} label="입찰" onBid={n => send({ t: 'bid', amount: n })} onPass={() => send({ t: 'pass' })} />;
      }
    }
  }

  /** 경매 중 플레이어별 상태 문구 */
  const auctionStatus = (i: number): { text: string; color: string } | null => {
    if (!au) return null;
    if (i === au.seller) return { text: '🔨 출품자', color: ACCENT };
    if (au.type === 'sealed') return i in au.bids ? { text: '✓ 입찰 완료', color: 'var(--green)' } : { text: '고민 중…', color: 'var(--faint)' };
    if (au.type === 'fixed' && !au.price) return { text: '대기', color: 'var(--faint)' };
    if (au.turn === i) return { text: '▶ 차례', color: 'var(--gold)' };
    const a = au.acts[i];
    if (a === undefined) return { text: '대기', color: 'var(--faint)' };
    if (a < 0) return { text: 'PASS', color: 'var(--dim)' };
    return { text: `$${a}`, color: au.high === i ? 'var(--gold)' : 'var(--text-2)' };
  };

  const last = g.results[g.results.length - 1];
  const ranking = g.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.money - a.money);
  const myWonValue = mine ? mine.won.reduce((s, c) => s + value[c.artist], 0) : 0;
  const myPast = g.results.flatMap(r => (r.bought[me] ?? []).map(c => ({ c, round: r.round, v: r.values[c.artist] })));

  return (
    <div className="cabinet">
      <style>{CSS}</style>
      <div className="crt" />
      <div className="arc-screen arc-screen--wide" style={{ '--c': ACCENT, gap: 12 } as React.CSSProperties}>

        {/* ── 헤더 ── */}
        <header className="arc-panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginTop: 14, flexWrap: 'wrap' }}>
          <Link href="/modern-art" className="arc-btn-ghost" style={{ fontSize: 13, padding: '8px 12px' }} aria-label="나가기">←</Link>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 16, color: ACCENT, letterSpacing: 1 }}>MODERN ART</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="arc-chip">ROUND <b style={{ color: 'var(--text)' }}>{g.round}/{TOTAL_ROUNDS}</b></span>
            <span className="arc-chip">판매 <b style={{ color: totalSold >= SALES_PER_ROUND - 1 ? 'var(--red)' : 'var(--text)' }}>{totalSold}/{SALES_PER_ROUND}</b></span>
            {!settling && <span className="arc-chip">🔨 <b style={{ color: 'var(--text)' }}>{g.players[auctioneer].name}</b></span>}
            {mine && <span className="arc-chip" style={{ color: 'var(--gold)' }}>내 현금 <b>${mine.money}</b></span>}
            <Link href="/modern-art/rules" className="arc-btn-ghost" style={{ fontSize: 13, padding: '8px 12px' }} aria-label="규칙">📖</Link>
          </div>
        </header>

        <div className="ma-top">
          {/* ── 시장 ── */}
          <section className="arc-panel" style={{ padding: 14 }} aria-label="시장">
            <h2 className="ma-lbl">MARKET · 이번 라운드</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ARTISTS.map((a, i) => (
                <div key={a.name}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: a.color }}>{value[i] ? '★' : ''} {a.emoji} {a.name}</span>
                    <span className="pix" style={{ marginLeft: 'auto', fontSize: 11, color: value[i] ? 'var(--gold)' : 'var(--faint)' }}>${value[i]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${(g.sold[i] / maxSold) * 100}%`, height: '100%', background: a.color, transition: 'width .3s' }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 28, textAlign: 'right' }}>{g.sold[i]}장</span>
                  </div>
                  {prevValues && <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>지난 라운드 ${prevValues[i]}</div>}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--faint)', margin: '12px 0 0', lineHeight: 1.5 }}>
              판매량 상위 3작가 → $30 / $20 / $10<br />동점이면 위쪽 작가 우선
            </p>
          </section>

          {/* ── 경매장 ── */}
          <section className="arc-panel ticks ma-stage" style={{ padding: 16 }} aria-label="경매장">
            <h2 className="ma-lbl">AUCTION STAGE</h2>
            {au ? (
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {au.extra && <><ArtCard card={au.extra} size="md" /><span style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: ACCENT }}>+</span></>}
                  <ArtCard card={au.card} size={au.extra ? 'md' : 'lg'} />
                </div>
                <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    {au.extra && <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 2 }}>🎴 1+1 — 2점 일괄 경매</div>}
                    <div style={{ fontFamily: 'var(--f-title)', fontSize: 24 }}>{AUCTION_INFO[au.type].emoji} {AUCTION_INFO[au.type].label}</div>
                    <p style={{ fontSize: 12, color: 'var(--dim)', margin: '4px 0 0', lineHeight: 1.5 }}>{AUCTION_INFO[au.type].desc}</p>
                  </div>
                  {au.type !== 'sealed' && (
                    <div className="arc-panel-inset" style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{au.type === 'fixed' ? '고정 가격' : '현재 최고가'}</div>
                      <div className="pix" style={{ fontSize: 22, color: 'var(--gold)', margin: '6px 0 4px' }}>{au.price ? `$${au.price}` : '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {au.high !== null ? `최고 입찰자: ${g.players[au.high].name}` : `출품자: ${g.players[au.seller].name}`}
                      </div>
                    </div>
                  )}
                  <div className="arc-panel-inset" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {g.players.map((p, i) => {
                      const st = auctionStatus(i)!;
                      return (
                        <div key={p.id} style={{ display: 'flex', fontSize: 13 }}>
                          <span style={{ color: i === me ? ACCENT : 'var(--text)' }}>{p.name}{i === me ? ' (나)' : ''}</span>
                          <span style={{ marginLeft: 'auto', color: st.color, fontWeight: 700 }}>{st.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : g.lastSale && !settling ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {g.lastSale.extra && <ArtCard card={g.lastSale.extra} size="sm" />}
                  <ArtCard card={g.lastSale.card} size={g.lastSale.extra ? 'sm' : 'md'} />
                </div>
                <div style={{ animation: 'maHammer .4s ease-out' }}>
                  <div style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: g.lastSale.buyer === null ? 'var(--dim)' : 'var(--gold)' }}>
                    {g.lastSale.buyer === null ? 'NO SALE' : '🔨 HAMMER DOWN'}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.6 }}>
                    {g.lastSale.buyer === null
                      ? `유찰 — ${g.players[g.lastSale.seller].name}님 손으로 돌아갔습니다`
                      : <>{g.players[g.lastSale.buyer].name}님이 <b style={{ color: 'var(--gold)' }}>${g.lastSale.price}</b>에 낙찰<br />→ {g.players[g.lastSale.seller].name}님이 ${g.lastSale.price} 받음</>}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--dim)', fontSize: 14, margin: '24px 0', textAlign: 'center' }}>
                {settling ? '라운드 정산 중' : '첫 작품을 기다리는 중'}
              </p>
            )}

            {/* 차례 / 조작 */}
            {headline && (
              <div style={{
                marginTop: 14, padding: 12, borderRadius: 12,
                background: controls || (g.phase === 'play' && g.current === me) ? `${ACCENT}1a` : 'rgba(0,0,0,.2)',
                border: `1px solid ${controls || (g.phase === 'play' && g.current === me) ? ACCENT : 'var(--line)'}`,
              }}>
                <p aria-live="polite" style={{ fontSize: 15, fontWeight: 700, margin: controls ? '0 0 10px' : 0 }}>{headline}</p>
                {controls && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>{controls}</fieldset>}
              </div>
            )}
            {error && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}
          </section>
        </div>

        {/* ── 플레이어 ── */}
        <section className="arc-panel" style={{ padding: 14 }} aria-label="플레이어">
          <h2 className="ma-lbl">PLAYERS · 이번 라운드 구매 작품</h2>
          <div className="ma-players">
            {g.players.map((p, i) => (
              <div key={p.id} className="arc-panel-inset" style={{ padding: 10, borderColor: i === auctioneer && !settling ? ACCENT : 'var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: i === me ? ACCENT : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === auctioneer && !settling ? '🔨 ' : ''}{p.name}{i === me ? ' (나)' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', margin: '2px 0 6px' }}>
                  💰 {i === me || g.phase === 'over' ? <b style={{ color: 'var(--gold)' }}>${p.money}</b> : '비공개'} · 손패 {p.hand.length}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 30 }}>
                  {p.won.length ? p.won.map(c => (
                    <button key={c.id} type="button" aria-label={`${ARTISTS[c.artist].name} ${workOf(c).title} 크게 보기`} title={`${ARTISTS[c.artist].name} · ${workOf(c).title}`}
                      onClick={() => setViewing({ card: c, caption: <><b>{p.name}</b>님이 이번 라운드에 구매 · 예상 가치 <b style={{ color: 'var(--gold)' }}>${value[c.artist]}</b></> })}
                      style={{ width: 40, height: 40, padding: 0, cursor: 'zoom-in', background: '#0a0810', borderRadius: 6, border: `2px solid ${ARTISTS[c.artist].color}`, overflow: 'hidden' }}>
                      <img src={workOf(c).src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    </button>
                  )) : <span style={{ fontSize: 11, color: 'var(--faint)' }}>아직 없음</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 내 미술관 ── */}
        {mine && (
          <section className="arc-panel" style={{ padding: 14 }} aria-label="내 미술관">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <h2 className="ma-lbl" style={{ margin: 0 }}>MY MUSEUM · 이번 라운드 구매 {mine.won.length}점</h2>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-2)' }}>
                지금 끝나면 <b style={{ color: 'var(--gold)' }}>+${myWonValue}</b>
              </span>
            </div>
            <div className="ma-scroll" style={{ marginTop: 10 }}>
              {mine.won.length
                ? mine.won.map(c => <ArtCard key={c.id} card={c} size="sm" value={value[c.artist]}
                    onClick={() => setViewing({ card: c, caption: <>이번 라운드에 구매 · 예상 가치 <b style={{ color: 'var(--gold)' }}>${value[c.artist]}</b></> })} />)
                : <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>이번 라운드에 산 작품이 없습니다.</p>}
            </div>
            {myPast.length > 0 && (
              <>
                <button type="button" className="arc-btn-ghost" style={{ marginTop: 10, fontSize: 12, padding: '8px 12px' }} aria-expanded={historyOpen} onClick={() => setHistoryOpen(o => !o)}>
                  {historyOpen ? '▲' : '▼'} 지난 라운드 구매 기록 ({myPast.length}점)
                </button>
                {historyOpen && (
                  <div className="ma-scroll" style={{ marginTop: 10 }}>
                    {myPast.map(({ c, round, v }) => (
                      <div key={c.id} style={{ textAlign: 'center' }}>
                        <ArtCard card={c} size="sm" onClick={() => setViewing({ card: c, caption: <>{round}라운드 구매 · <b style={{ color: 'var(--gold)' }}>${v}</b>로 정산</> })} />
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>R{round} · <b style={{ color: v ? 'var(--gold)' : 'var(--faint)' }}>${v}</b></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── 내 손패 ── */}
        {mine && (
          <section className="arc-panel" style={{ padding: 14 }} aria-label="내 손패">
            <h2 className="ma-lbl">MY HAND · {mine.hand.length}장 {g.phase === 'play' && g.current === me && <span style={{ color: ACCENT }}>— 출품할 작품을 탭하세요</span>}</h2>
            <div className="ma-scroll">
              {[...mine.hand].sort((a, b) => a.artist - b.artist || a.type.localeCompare(b.type)).map(c => (
                <ArtCard key={c.id} card={c} value={value[c.artist]}
                  disabled={busy || g.phase !== 'play' || g.current !== me}
                  onClick={() => { setError(''); setPicked(c); }} />
              ))}
            </div>
          </section>
        )}

        {/* ── 로그 ── */}
        <section className="arc-panel" style={{ padding: 14 }} aria-label="게임 기록">
          <h2 className="ma-lbl">GAME LOG</h2>
          {g.log.slice(0, 10).map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: i ? 'var(--faint)' : 'var(--text-2)', lineHeight: 1.7 }}>{l}</div>
          ))}
        </section>
      </div>

      {viewing && <ViewModal card={viewing.card} caption={viewing.caption} onClose={() => setViewing(null)} />}

      {/* ── 출품 확인 팝업 ── */}
      {picked && g.phase === 'play' && g.current === me && (
        <PlayModal card={picked} hand={mine.hand} value={value[picked.artist]} busy={busy} error={error} onClose={() => setPicked(null)}
          onConfirm={async (price, secondId) => {
            setBusy(true); setError('');
            const err = await act(code, uid, { t: 'play', cardId: picked.id, secondId, price });
            setBusy(false);
            if (err) setError(err); else setPicked(null);
          }} />
      )}

      {/* ── 정산 / 종료 모달 ── */}
      {settling && last && (
        <div role="dialog" aria-modal="true" aria-label={`${last.round}라운드 정산`} style={OVERLAY}>
          <div className="arc-panel ticks arc-pop" style={{ width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto', padding: 20 }}>
            <div style={{ fontFamily: 'var(--f-disp)', fontSize: 20, color: ACCENT, textAlign: 'center' }}>
              {g.phase === 'over' ? 'GAME OVER' : `ROUND ${last.round} COMPLETE`}
            </div>

            <h3 className="ma-lbl" style={{ marginTop: 16 }}>시장 가치 확정</h3>
            {ARTISTS.map((a, i) => ({ a, i })).filter(({ i }) => last.values[i]).sort((x, y) => last.values[y.i] - last.values[x.i]).map(({ a, i }, rank) => (
              <div key={a.name} style={{ display: 'flex', fontSize: 15, padding: '4px 0' }}>
                <span style={{ color: a.color, fontWeight: 700 }}>{rank + 1}. {a.emoji} {a.name}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-2)' }}>{last.sold[i]}장 판매 · <b style={{ color: 'var(--gold)' }}>${last.values[i]}</b></span>
              </div>
            ))}

            <h3 className="ma-lbl" style={{ marginTop: 16 }}>작품 정산</h3>
            {g.players.map((p, pi) => {
              const counts = ARTISTS.map((_, ai) => last.bought[pi].filter(c => c.artist === ai).length);
              return (
                <div key={p.id} className="arc-panel-inset" style={{ padding: '8px 12px', marginBottom: 6, borderColor: pi === me ? `${ACCENT}88` : 'var(--line)' }}>
                  <div style={{ display: 'flex', fontWeight: 700, fontSize: 14 }}>
                    <span style={{ color: pi === me ? ACCENT : 'var(--text)' }}>{p.name}{pi === me ? ' (나)' : ''}</span>
                    <span style={{ marginLeft: 'auto', color: last.payouts[pi] ? 'var(--gold)' : 'var(--faint)' }}>+${last.payouts[pi]}</span>
                  </div>
                  {counts.some(n => n) ? counts.map((n, ai) => n > 0 && (
                    <div key={ai} style={{ fontSize: 12, color: 'var(--dim)' }}>
                      {ARTISTS[ai].emoji} {ARTISTS[ai].name} ${last.values[ai]} × {n}점 = ${last.values[ai] * n}
                    </div>
                  )) : <div style={{ fontSize: 12, color: 'var(--faint)' }}>구매 작품 없음</div>}
                </div>
              );
            })}

            {mine && g.phase === 'roundEnd' && (
              <div className="arc-panel-inset" style={{ padding: '10px 12px', marginTop: 10, fontSize: 13 }}>
                <div style={{ display: 'flex' }}><span>정산 전 현금</span><span style={{ marginLeft: 'auto' }}>${mine.money - last.payouts[me]}</span></div>
                <div style={{ display: 'flex' }}><span>작품 판매 수익</span><span style={{ marginLeft: 'auto', color: 'var(--gold)' }}>+${last.payouts[me]}</span></div>
                <div style={{ display: 'flex', fontWeight: 700, marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}><span>내 현금</span><span style={{ marginLeft: 'auto' }}>${mine.money}</span></div>
              </div>
            )}

            {g.phase === 'over' && (
              <>
                <h3 className="ma-lbl" style={{ marginTop: 16 }}>최종 순위</h3>
                {ranking.map((p, r) => {
                  const win = p.money === ranking[0].money;
                  return (
                    <div key={p.id} style={{ display: 'flex', fontSize: win ? 18 : 14, fontWeight: 700, padding: '4px 0', color: win ? 'var(--gold)' : 'var(--text-2)' }}>
                      <span>{win ? '🏆' : `${r + 1}.`} {p.name}{p.i === me ? ' (나)' : ''}</span>
                      <span style={{ marginLeft: 'auto' }}>${p.money}</span>
                    </div>
                  );
                })}
                <Link href="/lobby" className="arc-btn" style={{ ...btn, display: 'block', textAlign: 'center', marginTop: 16 }}>로비로</Link>
              </>
            )}

            {g.phase === 'roundEnd' && (
              <button type="button" className="arc-btn" style={{ ...btn, marginTop: 16 }} disabled={busy} onClick={() => send({ t: 'next' })}>
                {g.round + 1}라운드 시작
              </button>
            )}
            {error && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '10px 0 0' }}>{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
