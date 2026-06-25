'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WORD_CATEGORIES } from '@/lib/liar/game-data';

const ACCENT = '#e84242';

export default function LiarWords() {
  const [openCat, setOpenCat] = useState<string | null>(null);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 8px' }}>
          <Link href="/liar" className="arc-btn-ghost" style={{ fontSize: 13, padding: '9px 14px' }}>← 뒤로</Link>
        </div>

        <div style={{ textAlign: 'center', margin: '12px 0 24px' }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h1 style={{ fontFamily: 'var(--f-disp)', fontSize: 26, color: ACCENT, margin: '8px 0 2px', letterSpacing: 1 }}>
            WORD LIST
          </h1>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)' }}>단어 목록</div>
          <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
            카테고리를 눌러 단어를 확인하세요
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {WORD_CATEGORIES.map(({ category, words }) => {
            const isOpen = openCat === category;
            return (
              <div
                key={category}
                className="arc-panel"
                style={{
                  overflow: 'hidden',
                  borderColor: isOpen ? `rgba(232,66,66,0.5)` : undefined,
                  background: isOpen ? 'rgba(232,66,66,0.04)' : undefined,
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <button
                  onClick={() => setOpenCat(isOpen ? null : category)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: isOpen ? ACCENT : 'var(--text)', fontWeight: 700 }}>
                      {category}
                    </span>
                    <span className="arc-chip" style={{ fontSize: 10 }}>{words.length}개</span>
                  </div>
                  <span style={{
                    fontSize: 13, color: 'var(--faint)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s',
                    display: 'inline-block',
                  }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 16px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                  }}>
                    {words.map(w => (
                      <div
                        key={w}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 12,
                          background: 'var(--bg-2)',
                          border: '1px solid var(--line-2)',
                          fontSize: 15,
                          color: 'var(--text)',
                          fontWeight: 600,
                          textAlign: 'center',
                          lineHeight: 1.3,
                        }}
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <Link href="/liar" style={{ flex: 1 }}>
            <button className="arc-btn" style={{ background: ACCENT, width: '100%', fontSize: 16 }}>
              게임 시작하러 가기
            </button>
          </Link>
        </div>

        <p className="pix" style={{ fontSize: 8, color: 'var(--faint)', textAlign: 'center', marginTop: 8, lineHeight: 1.8 }}>
          LIAR GAME · {WORD_CATEGORIES.length} CATEGORIES · {WORD_CATEGORIES.reduce((s, c) => s + c.words.length, 0)} WORDS
        </p>
      </div>
    </div>
  );
}
