'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createLocalGame, selectLocalCategory, restartLocalGame } from '@/lib/liar/game-logic';
import { ALL_CATEGORIES, WORD_CATEGORIES } from '@/lib/liar/game-data';
import type { LocalLiarState } from '@/lib/liar/types';

const ACCENT = '#e84242';
const LIAR_COLOR = '#e84242';
const WORD_COLOR = '#36e0cf';

// ─── 카테고리 선택 ────────────────────────────────────────────

function CategorySelectScreen({ onSelect }: { onSelect: (cat: string) => void }) {
  return (
    <div style={{ padding: '24px 18px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎲</div>
        <h2 style={{ fontFamily: 'var(--f-title)', fontSize: 24, color: 'var(--text)', margin: '0 0 6px' }}>카테고리 선택</h2>
        <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>하나를 골라서 랜덤 단어를 뽑아요</p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="arc-btn-ghost"
            style={{
              padding: '14px 8px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              width: '100%',
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 넘기기 화면 ──────────────────────────────────────────────

function PassScreen({ playerNum, onReady }: { playerNum: number; onReady: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', gap: 28, textAlign: 'center', padding: '0 32px',
    }}>
      <div style={{ fontSize: 64 }}>👋</div>
      <div>
        <p style={{ color: 'var(--faint)', fontSize: 14, margin: '0 0 6px' }}>폰을 넘기세요</p>
        <p style={{ fontFamily: 'var(--f-disp)', fontSize: 52, color: ACCENT, textShadow: `0 0 20px rgba(232,66,66,0.5)`, margin: 0 }}>
          {playerNum}번
        </p>
        <p style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: 'var(--text)', margin: '4px 0 0' }}>플레이어</p>
      </div>
      <button onClick={onReady} className="arc-btn" style={{ background: ACCENT, fontSize: 18, width: '100%', maxWidth: 300 }}>
        준비됐어요 ✓
      </button>
    </div>
  );
}

// ─── 역할 공개 (꾹 눌러서 확인) ──────────────────────────────

function RoleReveal({
  playerNum, isLiar, word, liarWord, category, mode, onConfirm,
}: {
  playerNum: number; isLiar: boolean; word: string; liarWord: string;
  category: string; mode: 'normal' | 'fake'; onConfirm: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFake = mode === 'fake';
  const showWord = isLiar ? (isFake ? liarWord : null) : word;
  const isKnownLiar = isLiar && !isFake;

  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => setHolding(true), 100);
  };
  const handlePointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHolding(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', gap: 20, textAlign: 'center', padding: '0 24px',
    }}>
      <p style={{ color: 'var(--faint)', fontSize: 13 }}>{playerNum}번 플레이어</p>

      {/* 역할 카드 — 누르는 동안만 공개 */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={e => e.preventDefault()}
        style={{
          width: '100%', maxWidth: 320,
          background: holding
            ? (isKnownLiar ? 'rgba(232,66,66,0.12)' : 'rgba(54,224,207,0.10)')
            : 'var(--surface)',
          border: `2px solid ${holding ? (isKnownLiar ? LIAR_COLOR : WORD_COLOR) : 'var(--line-2)'}`,
          borderRadius: 24, padding: '32px 24px',
          boxShadow: holding ? `0 0 40px -8px ${isKnownLiar ? LIAR_COLOR : WORD_COLOR}` : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: 'background .2s, border-color .2s, box-shadow .2s',
          display: 'grid',
        }}
      >
        {/* 잠금 상태 */}
        <div style={{
          gridArea: '1/1',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity .15s, transform .15s',
          opacity: holding ? 0 : 1,
          transform: holding ? 'scale(0.88) translateY(-10px)' : 'scale(1) translateY(0)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <p style={{ fontFamily: 'var(--f-title)', fontSize: 20, color: 'var(--text-2)', margin: '0 0 6px' }}>꾹 눌러서 역할 확인</p>
          <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>누르는 동안만 보여요</p>
        </div>

        {/* 공개 상태 */}
        <div style={{
          gridArea: '1/1',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity .3s cubic-bezier(.34,1.4,.64,1), transform .3s cubic-bezier(.34,1.4,.64,1)',
          opacity: holding ? 1 : 0,
          transform: holding ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.94)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{isKnownLiar ? '🕵️' : '🎯'}</div>
          {isKnownLiar ? (
            <>
              <div style={{ fontFamily: 'var(--f-disp)', fontSize: 36, color: LIAR_COLOR, textShadow: `0 0 20px rgba(232,66,66,0.7)`, letterSpacing: 2 }}>
                라이어
              </div>
              <div style={{ marginTop: 16, padding: '10px 18px', borderRadius: 12, background: 'rgba(232,66,66,0.1)', border: `1px solid rgba(232,66,66,0.3)` }}>
                <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>카테고리 (단어는 모름)</p>
                <p style={{ fontFamily: 'var(--f-title)', fontSize: 22, color: LIAR_COLOR, margin: 0 }}>{category}</p>
              </div>
              <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 14, lineHeight: 1.6 }}>들키지 않게 적당히 맞춰요!</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 6 }}>카테고리: {category}</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 42, color: WORD_COLOR, textShadow: `0 0 20px rgba(54,224,207,0.7)` }}>
                {showWord}
              </div>
              <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 14, lineHeight: 1.6 }}>단어를 직접 말하지 말고 설명하세요!</p>
            </>
          )}
        </div>
      </div>

      <button onClick={onConfirm} className="arc-btn-ghost" style={{ width: '100%', maxWidth: 320, fontSize: 16, padding: '14px' }}>
        확인했어요 →
      </button>
    </div>
  );
}

// ─── 토론 화면 ────────────────────────────────────────────────

function DiscussingScreen({ category, playerCount, mode, liarCount, onReveal }: {
  category: string; playerCount: number; mode: 'normal' | 'fake'; liarCount: number; onReveal: () => void;
}) {
  const catData = WORD_CATEGORIES.find(c => c.category === category);
  const words = catData?.words ?? [];
  const [showWords, setShowWords] = useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', gap: 24, textAlign: 'center', padding: '0 24px',
    }}>
      <div style={{ fontSize: 56 }}>💬</div>
      <div>
        <p className="arc-lbl" style={{ marginBottom: 10 }}>자유 토론</p>
        <div style={{ padding: '12px 28px', borderRadius: 20, background: 'rgba(232,66,66,0.08)', border: `1px solid rgba(232,66,66,0.3)`, display: 'inline-block' }}>
          <p style={{ fontSize: 12, color: 'var(--faint)', margin: '0 0 4px' }}>카테고리</p>
          <p style={{ fontFamily: 'var(--f-title)', fontSize: 28, color: ACCENT, margin: 0 }}>{category}</p>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300 }}>
        순서대로 단어 힌트를 한 마디씩 말하세요.<br />
        {mode === 'fake'
          ? <span style={{ color: 'var(--gold)' }}>다른 말을 하는 사람을 찾아요!</span>
          : <span>라이어를 찾아내면 지목 후 공개!</span>
        }
      </p>
      <p style={{ fontSize: 12, color: 'var(--faint)' }}>{playerCount}명 참여 · 라이어 {liarCount}명</p>

      {/* 단어 목록 보기 */}
      {words.length > 0 && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <button
            onClick={() => setShowWords(v => !v)}
            className="arc-btn-ghost"
            style={{ width: '100%', fontSize: 13 }}
          >
            {showWords ? '▲ 단어 목록 닫기' : '▼ 이 카테고리 단어 목록 보기'}
          </button>
          {showWords && (
            <div style={{
              marginTop: 10, padding: '14px 16px', borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--line-2)',
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {words.map(w => (
                <span key={w} style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--bg-2)', fontSize: 13, color: 'var(--text-2)' }}>
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={onReveal} className="arc-btn" style={{ background: ACCENT, fontSize: 18, width: '100%', maxWidth: 320 }}>
        🕵️ 라이어 공개
      </button>
    </div>
  );
}

// ─── 전체 공개 ────────────────────────────────────────────────

function RevealScreen({ state, onRestart }: { state: LocalLiarState; onRestart: () => void }) {
  const { liarIdxs, word, liarWord, category, mode } = state;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 20, padding: '40px 24px', maxWidth: 420, margin: '0 auto', width: '100%',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎭</div>
        <h2 style={{ fontFamily: 'var(--f-disp)', fontSize: 24, color: ACCENT, margin: 0 }}>공개!</h2>
      </div>

      <div className="liar-reveal" style={{
        width: '100%', padding: '20px', borderRadius: 20, textAlign: 'center',
        background: 'rgba(232,66,66,0.1)', border: `2px solid ${LIAR_COLOR}`,
        boxShadow: `0 0 30px -8px ${LIAR_COLOR}`,
      }}>
        <p style={{ fontSize: 12, color: 'var(--faint)', margin: '0 0 4px' }}>{mode === 'fake' ? '거짓 라이어' : '라이어'}</p>
        <p style={{ fontFamily: 'var(--f-disp)', fontSize: 44, color: LIAR_COLOR, margin: 0 }}>
          {liarIdxs.map(i => `${i + 1}번`).join(', ')}
        </p>
        {mode === 'fake' && <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>본인은 몰랐어요 😅</p>}
      </div>

      <div className="arc-panel" style={{ width: '100%', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--faint)' }}>카테고리</span>
          <span style={{ fontWeight: 600 }}>{category}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--faint)' }}>시민 단어</span>
          <span style={{ color: WORD_COLOR, fontWeight: 700, fontSize: 17 }}>{word}</span>
        </div>
        {mode === 'fake' && liarWord && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--faint)' }}>라이어 받은 단어</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 17 }}>{liarWord}</span>
          </div>
        )}
      </div>

      <button onClick={onRestart} className="arc-btn" style={{ background: ACCENT, fontSize: 17, width: '100%' }}>
        다시 하기
      </button>
      <button
        onClick={() => { sessionStorage.clear(); window.location.href = '/liar'; }}
        className="arc-btn-ghost" style={{ fontSize: 14, width: '100%' }}
      >
        설정으로
      </button>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────

export default function LiarLocalGame() {
  const router = useRouter();
  const [G, setG] = useState<LocalLiarState | null>(null);

  useEffect(() => {
    const count = parseInt(sessionStorage.getItem('liar-count') ?? '0', 10);
    const liarCount = parseInt(sessionStorage.getItem('liar-liarCount') ?? '1', 10);
    const mode = (sessionStorage.getItem('liar-mode') ?? 'normal') as 'normal' | 'fake';
    if (!count) { router.replace('/liar'); return; }
    setG(createLocalGame(count, liarCount, mode));
  }, [router]);

  const handleCategorySelect = useCallback((cat: string) => {
    setG(p => p ? selectLocalCategory(p, cat) : p);
  }, []);

  const handleRevealReady = useCallback(() => setG(p => p ? { ...p, roleShowing: true } : p), []);

  const handleRevealConfirm = useCallback(() => {
    setG(p => {
      if (!p) return p;
      if (p.revealPlayerIdx < p.playerCount - 1) {
        return { ...p, revealPlayerIdx: p.revealPlayerIdx + 1, roleShowing: false };
      }
      return { ...p, phase: 'discussing', revealPlayerIdx: 0, roleShowing: false };
    });
  }, []);

  const handleGoToReveal = useCallback(() => setG(p => p ? { ...p, phase: 'reveal' } : p), []);

  const handleRestart = useCallback(() => {
    setG(p => p ? restartLocalGame(p) : p);
  }, []);

  if (!G) {
    return (
      <div className="cabinet"><div className="crt" />
        <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p className="pix blink" style={{ fontSize: 9, color: 'var(--dim)' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ padding: 0, maxWidth: '100%' }}>

        {/* 상단 바 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)',
        }}>
          <button
            onClick={() => { if (G.phase === 'category-select' || confirm('게임을 종료할까요?')) router.push('/liar'); }}
            className="arc-btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }}
          >← 종료</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="arc-chip" style={{ fontSize: 11 }}>{G.playerCount}명</span>
            <span className="arc-chip" style={{ fontSize: 11 }}>라이어 {G.liarCount}명</span>
            <span className="arc-chip" style={{ fontSize: 11 }}>{G.mode === 'fake' ? '⚡ 거짓' : '🕵️ 기본'}</span>
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>

          {G.phase === 'category-select' && (
            <CategorySelectScreen onSelect={handleCategorySelect} />
          )}

          {G.phase === 'role-reveal' && !G.roleShowing && (
            <PassScreen playerNum={G.revealPlayerIdx + 1} onReady={handleRevealReady} />
          )}

          {G.phase === 'role-reveal' && G.roleShowing && (
            <RoleReveal
              playerNum={G.revealPlayerIdx + 1}
              isLiar={G.liarIdxs.includes(G.revealPlayerIdx)}
              word={G.word} liarWord={G.liarWord}
              category={G.category} mode={G.mode}
              onConfirm={handleRevealConfirm}
            />
          )}

          {G.phase === 'discussing' && (
            <DiscussingScreen
              category={G.category} playerCount={G.playerCount}
              mode={G.mode} liarCount={G.liarCount}
              onReveal={handleGoToReveal}
            />
          )}

          {G.phase === 'reveal' && (
            <RevealScreen state={G} onRestart={handleRestart} />
          )}
        </div>
      </div>
    </div>
  );
}
