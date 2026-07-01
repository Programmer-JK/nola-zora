'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createRoom, joinRoom } from '@/lib/guryongtu/firebase-game';

const ACCENT = '#ff3333';

export default function GuryongtuSetupPage() {
  const router = useRouter();
  const { uid, nickname } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = useCallback(async () => {
    if (!uid || !nickname) return;
    setLoading(true);
    setError('');
    try {
      const code = await createRoom(uid, nickname);
      router.push(`/guryongtu/room/${code}`);
    } catch (e) {
      console.error('[guryongtu] createRoom failed:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(`방 생성 실패: ${msg}`);
      setLoading(false);
    }
  }, [uid, nickname, router]);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) { setError('6자리 방 코드를 입력하세요.'); return; }
    if (!uid || !nickname) return;
    setLoading(true);
    setError('');
    try {
      const err = await joinRoom(code, uid, nickname);
      if (err) { setError(err); setLoading(false); return; }
      router.push(`/guryongtu/room/${code}`);
    } catch (e) {
      console.error('[guryongtu] joinRoom failed:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(`방 참가 실패: ${msg}`);
      setLoading(false);
    }
  }, [joinCode, uid, nickname, router]);

  return (
    <div className="cabinet">
      <div className="crt" />
      <div className="arc-screen" style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 32 }}>

        {/* 타이틀 */}
        <div className="arc-pop" style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>🐉</div>
          <div className="pix" style={{
            fontSize: 18, letterSpacing: 3, lineHeight: 1.3,
            color: ACCENT, textShadow: `0 0 18px ${ACCENT}88`,
          }}>
            구룡투
          </div>
          <div className="pix" style={{ fontSize: 8, color: 'var(--dim)', marginTop: 6, letterSpacing: 2 }}>
            NINE DRAGONS DUEL
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <span key={n} className="pix" style={{
                fontSize: 9, color: n === 1 ? ACCENT : 'var(--faint)',
                textShadow: n === 1 ? `0 0 8px ${ACCENT}` : undefined,
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* 탭 선택 */}
        <div className="arc-seg" style={{ marginBottom: 20, width: '100%', maxWidth: 340 }}>
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`arc-seg-btn${tab === t ? ' active' : ''}`}
              style={tab === t ? { background: ACCENT, color: '#fff', borderColor: ACCENT } : {}}
            >
              {t === 'create' ? '방 만들기' : '방 참가'}
            </button>
          ))}
        </div>

        <div className="arc-panel ticks arc-rise" style={{ width: '100%', maxWidth: 340, padding: '22px 20px' }}>
          {tab === 'create' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--dim)', marginBottom: 20, lineHeight: 1.6 }}>
                방을 만들고 상대에게<br />코드를 공유하세요.
              </p>
              <p style={{ fontFamily: 'var(--f-kr)', fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                플레이어: <strong style={{ color: ACCENT }}>{nickname}</strong>
              </p>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="arc-btn"
                style={{ background: ACCENT, borderColor: ACCENT, color: '#fff', fontSize: 15 }}
              >
                {loading ? 'LOADING...' : '🐉 방 만들기'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--f-kr)', fontSize: 14, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.6 }}>
                상대방의 방 코드를<br />입력하세요.
              </p>
              <input
                className="arc-input"
                style={{
                  fontFamily: 'var(--f-pix)', fontSize: 20, letterSpacing: 6,
                  textAlign: 'center', textTransform: 'uppercase',
                  marginBottom: 14, width: '100%',
                }}
                placeholder="XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={6}
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="arc-btn"
                style={{ background: ACCENT, borderColor: ACCENT, color: '#fff', fontSize: 15 }}
              >
                {loading ? 'LOADING...' : '⚔️ 참가하기'}
              </button>
            </div>
          )}

          {error && (
            <p style={{
              color: 'var(--red)', fontSize: 12, marginTop: 14, textAlign: 'center',
              background: 'rgba(255,90,77,0.08)', border: '1px solid rgba(255,90,77,0.25)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              {error}
            </p>
          )}
        </div>

        <button
          onClick={() => router.push('/guryongtu/rules')}
          className="arc-btn-ghost"
          style={{ marginTop: 14, fontSize: 12 }}
        >
          📖 규칙 보기
        </button>

        <button
          onClick={() => router.push('/lobby')}
          className="arc-btn-ghost"
          style={{ marginTop: 8, fontSize: 12 }}
        >
          ← 로비로
        </button>

        <p className="pix" style={{ fontSize: 7, color: 'var(--faint)', marginTop: 24, textAlign: 'center' }}>
          2P · BEST OF 3 · 1 BEATS 9
        </p>
      </div>
    </div>
  );
}
