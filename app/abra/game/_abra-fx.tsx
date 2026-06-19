'use client';

/**
 * 아브라카왓 — 주문 연출 + 3D 주사위
 *
 * SpellFX  : 주문별 CSS 파티클 연출 (cast overlay 뒤 레이어)
 * DiceRoll3D : Three.js 기반 3D d6 굴림
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─── Helpers ───────────────────────────────────────────────
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const fxArr = (n: number) => Array.from({ length: n }, (_, i) => i);

// ─── SpellFX ───────────────────────────────────────────────
export function SpellFX({ num, color }: { num: number; color: string }) {
  const C = color;
  const cY = '45%';
  const c = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', left: '50%', top: cY, ...extra,
  });

  // 1 · 폭발 — 섬광 + 충격파 링 + 파편
  if (num === 1) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 45%, ${C} 0%, transparent 55%)`, mixBlendMode: 'screen', animation: 'fxFlash .8s ease-out both' }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={c({ width: 110, height: 110, marginLeft: -55, marginTop: -55, borderRadius: '50%', border: `${4 - i}px solid ${i === 1 ? 'var(--coin)' : C}`, animation: `fxShock ${.85 + i * .1}s ease-out ${i * .1}s both` })} />
      ))}
      {fxArr(20).map(i => {
        const a = (i / 20) * Math.PI * 2, d = rnd(120, 240);
        return <span key={i} style={c({ width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: '50%', background: i % 2 ? C : 'var(--coin)', boxShadow: `0 0 10px ${C}`, ['--dx' as string]: `${Math.cos(a) * d}px`, ['--dy' as string]: `${Math.sin(a) * d}px`, animation: `fxSpark ${rnd(.55, .95)}s ease-out both` })} />;
      })}
    </div>
  );

  // 2 · 암흑 물질 — 안으로 빨려드는 링 + 코어
  if (num === 2) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 45%, transparent 30%, ${C}33 70%, transparent 100%)`, animation: 'fxFlash 1.2s ease-out both' }} />
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={c({ width: 260, height: 260, marginLeft: -130, marginTop: -130, borderRadius: '50%', border: `2px solid ${C}`, boxShadow: `0 0 22px ${C} inset`, animation: `fxImplode 1.1s cubic-bezier(.5,0,.9,.6) ${i * .14}s both` })} />
      ))}
      <div style={c({ width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: '50%', background: 'radial-gradient(circle, #120a1f 40%, transparent 72%)', boxShadow: `0 0 40px ${C}, 0 0 80px ${C}`, animation: 'fxOrb 1.2s ease-in-out both' })} />
    </div>
  );

  // 3 · 치유의 바람 — 글로우 + 상승 잎
  if (num === 3) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, ${C}44 0%, transparent 55%)`, animation: 'fxFlash 1.4s ease-out both' }} />
      {fxArr(16).map(i => (
        <span key={i} style={{ position: 'absolute', left: `${rnd(20, 80)}%`, top: `${rnd(58, 78)}%`, fontSize: rnd(13, 24), color: C, filter: `drop-shadow(0 0 6px ${C})`, ['--sway' as string]: `${rnd(-40, 40)}px`, ['--rot' as string]: `${rnd(-60, 60)}deg`, animation: `fxRise ${rnd(1.4, 2.1)}s ease-out ${rnd(0, .5)}s both` }}>{i % 3 ? '✦' : '🍃'}</span>
      ))}
    </div>
  );

  // 4 · 천리안 — 레이더 스윕 + 스캔 링
  if (num === 4) return (
    <div className="abra-fx">
      <div style={c({ width: 320, height: 320, marginLeft: -160, marginTop: -160, borderRadius: '50%', background: `conic-gradient(from 0deg, transparent 0deg, ${C}66 40deg, transparent 80deg)`, animation: 'fxSweep 1.3s linear both' })} />
      {[0, 1, 2].map(i => (
        <div key={i} style={c({ width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', border: `1.5px solid ${C}`, animation: `fxScan 1.4s ease-out ${i * .25}s both` })} />
      ))}
      <div style={c({ marginLeft: -24, marginTop: -24, fontSize: 48, color: C, filter: `drop-shadow(0 0 14px ${C})` })}>👁</div>
    </div>
  );

  // 5 · 연쇄 번개 — 좌우 번개
  if (num === 5) {
    const bolt = 'polygon(52% 0%, 30% 42%, 49% 42%, 24% 100%, 70% 38%, 50% 38%)';
    return (
      <div className="abra-fx">
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${C}55 0%, transparent 60%)`, animation: 'fxBolt 1s ease-out both' }} />
        {[18, 46, 70].map((L, i) => (
          <div key={i} style={{ position: 'absolute', left: `${L}%`, top: '6%', width: rnd(38, 60), height: '74%', background: i % 2 ? 'var(--coin)' : C, clipPath: bolt, filter: `drop-shadow(0 0 14px ${C}) drop-shadow(0 0 4px #fff)`, animation: `fxBolt ${rnd(.9, 1.2)}s ease-out ${i * .12}s both` }} />
        ))}
      </div>
    );
  }

  // 6 · 절대 영도 — 서리 + 결정
  if (num === 6) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 140px 50px ${C}`, background: `radial-gradient(circle at 50% 45%, transparent 40%, ${C}33 100%)`, animation: 'fxFrost 1.3s ease-out both' }} />
      {fxArr(14).map(i => (
        <span key={i} style={{ position: 'absolute', left: `${rnd(8, 92)}%`, top: `${rnd(10, 85)}%`, width: rnd(10, 26), height: rnd(10, 26), background: i % 2 ? '#dff3ff' : C, clipPath: 'polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)', filter: `drop-shadow(0 0 8px ${C})`, ['--rot' as string]: `${rnd(0, 90)}deg`, animation: `fxCrystal ${rnd(.7, 1.1)}s ease-out ${rnd(0, .4)}s both` }} />
      ))}
    </div>
  );

  // 7 · 화염 공 — 중앙 화염 + 상승 불씨
  if (num === 7) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, ${C} 0%, #ff8a3d55 30%, transparent 60%)`, mixBlendMode: 'screen', animation: 'fxFlash 1s ease-out both' }} />
      {fxArr(22).map(i => (
        <span key={i} style={{ position: 'absolute', left: `${rnd(28, 72)}%`, top: `${rnd(55, 75)}%`, width: rnd(5, 11), height: rnd(5, 11), borderRadius: '50%', background: i % 3 ? C : 'var(--coin)', boxShadow: `0 0 10px ${C}`, ['--sway' as string]: `${rnd(-50, 50)}px`, animation: `fxRise ${rnd(1.1, 1.8)}s ease-out ${rnd(0, .4)}s both` }} />
      ))}
    </div>
  );

  // 8 · 치유 — 맥동 하트 링 + + 기호
  if (num === 8) return (
    <div className="abra-fx">
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 45%, ${C}44 0%, transparent 55%)`, animation: 'fxFlash 1.3s ease-out both' }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={c({ width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: '50%', border: `2.5px solid ${C}`, animation: `fxHeart 1.3s ease-out ${i * .22}s both` })} />
      ))}
      {fxArr(10).map(i => (
        <span key={i} style={{ position: 'absolute', left: `${rnd(28, 72)}%`, top: `${rnd(55, 72)}%`, fontFamily: 'var(--f-disp)', fontSize: rnd(16, 26), color: C, filter: `drop-shadow(0 0 8px ${C})`, ['--sway' as string]: `${rnd(-30, 30)}px`, animation: `fxRise ${rnd(1.3, 1.9)}s ease-out ${rnd(0, .4)}s both` }}>+</span>
      ))}
    </div>
  );

  return null;
}

// ─── DiceRoll3D (Three.js) ───────────────────────────────
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function dicePipTexture(value: number, accent: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const x = cv.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#f8f2e6');
  g.addColorStop(1, '#e0d4bd');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(110,84,38,.30)';
  x.lineWidth = 12;
  x.strokeRect(10, 10, 236, 236);

  const cells: [number, number][] = [
    [.26, .26], [.5, .26], [.74, .26],
    [.26, .5],  [.5, .5],  [.74, .5],
    [.26, .74], [.5, .74], [.74, .74],
  ];
  const pips = PIP_MAP[value] ?? [];
  pips.forEach(idx => {
    const [px, py] = cells[idx];
    const grad = x.createRadialGradient(px * 256 - 5, py * 256 - 5, 2, px * 256, py * 256, 24);
    grad.addColorStop(0, accent);
    grad.addColorStop(.55, accent);
    grad.addColorStop(1, '#1c1208');
    x.fillStyle = grad;
    x.beginPath();
    x.arc(px * 256, py * 256, 22, 0, Math.PI * 2);
    x.fill();
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

export function DiceRoll3D({
  result,
  color = '#a274ff',
  caption,
  onDone,
}: {
  result: number;
  color?: string;
  caption?: string;
  onDone?: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 240;
    const H = mount.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 1.15, 4.3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    mount.appendChild(renderer.domElement);

    const accentColor = new THREE.Color(color);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(accentColor, 2.2, 24);
    rim.position.set(-2.5, 1.2, 3.5);
    scene.add(rim);
    const under = new THREE.PointLight(accentColor, 1.2, 18);
    under.position.set(2, -2, 2);
    scene.add(under);

    // face order: +X,-X,+Y,-Y,+Z,-Z → 3,4,5,2,1,6
    const faceVals = [3, 4, 5, 2, 1, 6];
    const mats = faceVals.map(v =>
      new THREE.MeshStandardMaterial({ map: dicePipTexture(v, color), roughness: 0.42, metalness: 0.22 })
    );
    const geo = new THREE.BoxGeometry(1.55, 1.55, 1.55);
    const cube = new THREE.Mesh(geo, mats);
    scene.add(cube);
    cube.rotation.set(rnd(0, Math.PI * 2), rnd(0, Math.PI * 2), rnd(0, Math.PI * 2));

    const TARGET: Record<number, [number, number, number]> = {
      1: [0, 0, 0], 6: [0, Math.PI, 0],
      3: [0, -Math.PI / 2, 0], 4: [0, Math.PI / 2, 0],
      5: [Math.PI / 2, 0, 0], 2: [-Math.PI / 2, 0, 0],
    };
    const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(TARGET[result] ?? [0, 0, 0])));

    const ROLL = 1150, SETTLE = 780;
    const av = { x: rnd(11, 17), y: rnd(13, 19), z: rnd(7, 12) };
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let rafId: number;
    let startQ: THREE.Quaternion | null = null;
    const start = performance.now();

    const frame = (now: number) => {
      const e = now - start;
      if (e < ROLL) {
        const k = 1 - (e / ROLL) * 0.45;
        cube.rotation.x += av.x * 0.0166 * k;
        cube.rotation.y += av.y * 0.0166 * k;
        cube.rotation.z += av.z * 0.0166 * k;
        cube.position.y = Math.sin((e / ROLL) * Math.PI) * 0.7;
      } else {
        if (!startQ) startQ = cube.quaternion.clone();
        const t = Math.min(1, (e - ROLL) / SETTLE);
        const k = ease(t);
        cube.quaternion.slerpQuaternions(startQ, tq, k);
        cube.position.y = (1 - k) * 0.2 - 0.1;
        if (t >= 1 && !landed) setLanded(true);
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    const doneTO = setTimeout(finish, ROLL + SETTLE + 1500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(doneTO);
      geo.dispose();
      mats.forEach(m => { m.map?.dispose(); m.dispose(); });
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCrit = result === 6, isFail = result === 1;
  const rc = isCrit ? 'var(--coin)' : isFail ? 'var(--red)' : color;

  return (
    <div className="abra-dice-overlay" onClick={() => landed && finish()}>
      <div className="pix" style={{ fontSize: 9, letterSpacing: 3, color: rc, marginBottom: 20, height: 14, opacity: landed ? 0 : .9, transition: 'opacity .3s' }}>
        {landed ? '' : '◇ ROLLING ◇'}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${rc}33 0%, transparent 68%)`, filter: 'blur(4px)' }} />
        {landed && (
          <span style={{ position: 'absolute', left: '50%', top: '50%', width: 200, height: 200, borderRadius: '50%', border: `2px solid ${rc}`, animation: 'abraDiceImpact .65s ease-out both' }} />
        )}
        <div ref={mountRef} className="abra-dice-canvas" />
      </div>

      {landed && (
        <div style={{ marginTop: 30, textAlign: 'center', animation: 'abraCritPop .4s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div style={{ fontFamily: 'var(--f-disp)', fontSize: 58, lineHeight: 1, color: rc, textShadow: `0 0 30px ${rc}` }}>{result}</div>
          {isCrit && <div className="pix" style={{ fontSize: 10, color: 'var(--coin)', marginTop: 10, letterSpacing: 3 }}>★ CRITICAL ★</div>}
          {isFail && <div className="pix" style={{ fontSize: 9, color: 'var(--red)', marginTop: 10, letterSpacing: 2 }}>… 빗맞음</div>}
          {caption && <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text)', marginTop: 12 }}>{caption}</div>}
          <div className="pix blink" style={{ fontSize: 7, color: 'var(--faint)', marginTop: 18 }}>TAP TO CONTINUE</div>
        </div>
      )}
    </div>
  );
}
