'use client';
import { useEffect, useRef } from 'react';
import type { CharacterRaceState, TerrainType } from '@/lib/race-game/types';
import { TRACKS } from '@/lib/race-game/tracks';

// ── Canvas constants ──────────────────────────────────────────
const SCALE = 2;
const LW = 188;
const SKY_H = 14;
const LANE_H = 9;
const WORLD_W = 600;
const TRACK_START = 12;

const TERRAIN_H = 10;   // terrain profile strip height (logical px)
const SPR_W = 5;
const SPR_H = 7;

// Terrain colors: bg fill + border
const TERRAIN_COLORS: Record<TerrainType, [string, string]> = {
  flat:     ['#1e1c48', '#3a3870'],
  uphill:   ['#3a1400', '#c04820'],
  downhill: ['#001838', '#1870c0'],
  curves:   ['#2a1800', '#b07010'],
  hazard:   ['#280010', '#b01050'],
};

// ── Character color palettes: [main, highlight, dark] ────────
const COLORS: Record<string, [string, string, string]> = {
  bolt:  ['#f5c542', '#fff7cc', '#7a611a'],
  ember: ['#ff6b35', '#ffb399', '#a03300'],
  frosty:['#57c7ff', '#cdf0ff', '#1a5f8b'],
  sage:  ['#4fd88a', '#b8f5d0', '#1a7040'],
  nova:  ['#b57af0', '#e0ccff', '#5a2d8b'],
  mudd:  ['#6fa866', '#c0e8b8', '#3d6b38'],
  neo:   ['#57e8f0', '#ccfaff', '#1a8090'],
  gale:  ['#a0c8f0', '#dff0ff', '#3d6b90'],
  coco:  ['#ff90b3', '#ffccdd', '#8b3a60'],
  roxy:  ['#f0a030', '#ffd888', '#8b5515'],
};

// ── Per-character top body (rows 0-3) ─────────────────────────
// pixel values: 0=transparent, 1=main color, 2=highlight, 3=dark
const CHAR_TOP: Record<string, number[][]> = {
  // bolt: racing helmet with visor + aerodynamic streamlines
  bolt:  [[0,3,2,3,0],[3,2,2,2,3],[0,2,1,2,0],[0,1,1,1,0]],
  // ember: triple flame crown tips
  ember: [[1,3,1,3,1],[3,1,1,1,3],[1,2,1,2,1],[0,1,1,1,0]],
  // frosty: icicle crown (5 alternating tips) + full ice armor band + ice chest
  frosty:[[2,3,2,3,2],[2,2,2,2,2],[0,2,1,2,0],[2,1,2,1,2]],
  // sage: leaf canopy crown + wide leafy body
  sage:  [[3,1,3,1,3],[1,2,2,2,1],[3,1,1,1,3],[1,1,1,1,1]],
  // nova: glowing star crown + slim radiant body
  nova:  [[0,2,3,2,0],[2,2,3,2,2],[0,2,2,2,0],[0,1,2,1,0]],
  // mudd: wide blob silhouette, no neck, lumpy
  mudd:  [[1,1,1,1,1],[1,2,2,2,1],[1,1,2,1,1],[1,1,1,1,1]],
  // neo: center antenna + square robot helmet + visor
  neo:   [[0,0,2,0,0],[3,3,3,3,3],[3,2,1,2,3],[0,3,3,3,0]],
  // gale: aerodynamic pointed head, narrow body with speed lines
  gale:  [[0,0,2,0,0],[0,1,2,1,0],[1,1,2,1,1],[0,1,2,1,0]],
  // coco: big round head with cheek blush dots
  coco:  [[0,2,2,2,0],[2,1,2,1,2],[2,1,1,1,2],[0,2,2,2,0]],
  // roxy: three-spike mohawk + edgy dark face
  roxy:  [[3,0,3,0,3],[0,1,1,1,0],[3,1,2,1,3],[0,3,1,3,0]],
};

const LEGS_DEFAULT: [number[][], number[][]] = [
  [[0,3,0,3,0],[0,3,0,0,3],[0,3,0,3,3]],
  [[0,3,0,3,0],[3,0,0,3,0],[3,3,0,3,0]],
];

const LEGS_SPECIAL: Partial<Record<string, [number[][], number[][]]>> = {
  // bolt: wide sprinting stride
  bolt:  [[[0,3,3,0,0],[0,0,3,0,3],[0,0,3,3,3]],[[0,0,3,3,0],[3,0,3,0,0],[3,3,3,0,0]]],
  // frosty: ice skate glide (highlight on blade)
  frosty:[[[0,3,0,3,0],[0,2,0,0,3],[0,2,0,3,3]],[[0,3,0,3,0],[3,0,0,2,0],[3,3,0,2,0]]],
  // mudd: heavy wide shuffling legs
  mudd:  [[[3,3,0,3,3],[3,0,0,0,3],[3,0,0,0,3]],[[3,3,0,3,3],[0,3,0,3,0],[0,3,0,3,0]]],
  // neo: stiff mechanical robot legs
  neo:   [[[3,3,0,3,3],[0,3,0,0,3],[0,0,0,3,3]],[[3,3,0,3,3],[3,0,0,3,0],[3,3,0,0,0]]],
  // coco: cute bouncy skip
  coco:  [[[0,3,0,3,0],[0,3,0,3,0],[0,0,3,0,0]],[[0,3,0,3,0],[0,0,3,0,0],[3,0,0,0,3]]],
  // roxy: punk stomp
  roxy:  [[[3,3,0,3,3],[0,3,0,0,3],[0,3,0,3,0]],[[3,3,0,3,3],[3,0,0,3,0],[0,3,0,3,0]]],
  // gale: light floating stride
  gale:  [[[0,3,1,3,0],[0,3,0,3,0],[0,0,0,3,3]],[[0,3,1,3,0],[0,3,0,3,0],[3,3,0,0,0]]],
};

function getSprite(charId: string, frame: number): number[][] {
  const top = CHAR_TOP[charId] ?? CHAR_TOP.bolt;
  const legsFrames = LEGS_SPECIAL[charId] ?? LEGS_DEFAULT;
  return [...top, ...legsFrames[frame]];
}

// ── Track themes ──────────────────────────────────────────────
interface TrackTheme {
  skyTop: string;
  skyHorizon: string;
  bgShape: 'mountains' | 'spikes' | 'trees' | 'buildings' | 'dunes' | 'stalactites' | 'clouds' | 'roots';
  bgColor: string;
  laneA: string;
  laneB: string;
  sep: string;
  dash: string;
  marker: string;
  starColor: string | null;
  moonColor: string | null;
  accentColor: string;
}

const TRACK_THEMES: Record<string, TrackTheme> = {
  forest: {
    skyTop: '#0b2010', skyHorizon: '#1a3a1a',
    bgShape: 'trees', bgColor: '#1a3a12',
    laneA: '#1a2e10', laneB: '#15270d',
    sep: '#2a4a1a', dash: '#2e5520', marker: '#2e5a1a',
    starColor: '#a0d878', moonColor: '#c8f0a0',
    accentColor: '#4fd88a',
  },
  desert: {
    skyTop: '#1a0c00', skyHorizon: '#4a2800',
    bgShape: 'dunes', bgColor: '#6b3d10',
    laneA: '#3d2508', laneB: '#341f06',
    sep: '#5a3512', dash: '#7a4a18', marker: '#8a5520',
    starColor: '#ffd88a', moonColor: '#ffec99',
    accentColor: '#d4a24c',
  },
  ice: {
    skyTop: '#00101e', skyHorizon: '#0a2a40',
    bgShape: 'spikes', bgColor: '#0d3050',
    laneA: '#0a2038', laneB: '#081828',
    sep: '#1a4060', dash: '#1e4a70', marker: '#2060a0',
    starColor: '#b0e8ff', moonColor: '#d8f4ff',
    accentColor: '#57c7ff',
  },
  volcano: {
    skyTop: '#1a0000', skyHorizon: '#400800',
    bgShape: 'spikes', bgColor: '#2a0a00',
    laneA: '#1e0800', laneB: '#180600',
    sep: '#3a1000', dash: '#5a1a00', marker: '#8a2000',
    starColor: '#ff8060', moonColor: null,
    accentColor: '#ff4400',
  },
  swamp: {
    skyTop: '#050e04', skyHorizon: '#0d1f0a',
    bgShape: 'roots', bgColor: '#0d1e08',
    laneA: '#0a180a', laneB: '#081408',
    sep: '#1a2e10', dash: '#1e3812', marker: '#204010',
    starColor: '#80c850', moonColor: '#b0e870',
    accentColor: '#6fa866',
  },
  city: {
    skyTop: '#020510', skyHorizon: '#080f28',
    bgShape: 'buildings', bgColor: '#0a1030',
    laneA: '#0e1228', laneB: '#0a0e20',
    sep: '#1a2050', dash: '#202860', marker: '#2030a0',
    starColor: '#8898ff', moonColor: '#c8d8ff',
    accentColor: '#57e8f0',
  },
  space: {
    skyTop: '#000000', skyHorizon: '#04000e',
    bgShape: 'clouds', bgColor: '#0a0020',
    laneA: '#050015', laneB: '#030010',
    sep: '#150038', dash: '#200060', marker: '#3000a0',
    starColor: '#ffffff', moonColor: '#e0d0ff',
    accentColor: '#b57af0',
  },
  beach: {
    skyTop: '#001828', skyHorizon: '#003050',
    bgShape: 'dunes', bgColor: '#004870',
    laneA: '#1a1000', laneB: '#150d00',
    sep: '#2e1e08', dash: '#3a2810', marker: '#4a3818',
    starColor: '#80d8ff', moonColor: '#fffbe8',
    accentColor: '#57c7ff',
  },
  cave: {
    skyTop: '#000000', skyHorizon: '#020408',
    bgShape: 'stalactites', bgColor: '#060c10',
    laneA: '#0a0e12', laneB: '#080b0f',
    sep: '#151e28', dash: '#1e2e40', marker: '#2040a0',
    starColor: '#40c8ff', moonColor: null,
    accentColor: '#40c8ff',
  },
  'sky-garden': {
    skyTop: '#100028', skyHorizon: '#1e0050',
    bgShape: 'clouds', bgColor: '#280070',
    laneA: '#180045', laneB: '#12003a',
    sep: '#2e0060', dash: '#3a0080', marker: '#5000c0',
    starColor: '#d090ff', moonColor: '#f0d0ff',
    accentColor: '#b57af0',
  },
};

const DEFAULT_THEME: TrackTheme = {
  skyTop: '#07051a', skyHorizon: '#07051a',
  bgShape: 'mountains', bgColor: '#1a1748',
  laneA: '#100e30', laneB: '#0b0928',
  sep: '#201c52', dash: '#28245a', marker: '#3a3670',
  starColor: '#b0aad8', moonColor: '#fffbe8',
  accentColor: '#5050c0',
};

// ── Background shape data ─────────────────────────────────────
const STAR_TILE = 200;
const STARS: [number, number][] = [
  [5,2],[18,5],[32,3],[45,8],[58,4],[72,2],[86,7],[98,10],
  [112,3],[126,6],[140,11],[154,4],[168,9],[181,2],[195,7],
  [10,12],[28,1],[52,13],[78,9],[104,5],[128,12],[152,2],[176,10],
];

const BG_TILE = 320;
// Each shape: [centerX, width, height] — interpreted differently per bgShape
const BG_SHAPES: [number, number, number][] = [
  [18,22,8],[58,16,5],[102,26,11],[150,18,6],
  [198,22,9],[240,14,4],[280,24,10],[305,16,7],
];

function drawBgShape(
  ctx: CanvasRenderingContext2D,
  shape: TrackTheme['bgShape'],
  mx: number, mw: number, mh: number,
  skyH: number, color: string, accent: string,
) {
  ctx.fillStyle = color;

  if (shape === 'mountains') {
    // Triangle, wide base, pointed tip
    for (let row = 0; row < mh; row++) {
      const frac = row / mh; // 0=tip top, 1=wide base
      const rowW = Math.max(1, Math.round(mw * (0.06 + frac * 0.94)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'spikes') {
    // Very sharp triangles (quadratic taper)
    for (let row = 0; row < mh; row++) {
      const frac = row / mh;
      const rowW = Math.max(1, Math.round(mw * frac * frac));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'dunes') {
    // Flat arc / hill (wide at top, barely tapers)
    for (let row = 0; row < mh; row++) {
      const relY = row / mh;
      const rowW = Math.max(1, Math.round(mw * (0.4 + relY * 0.6)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'trees') {
    // Crown triangle (top 60%) + narrow trunk (bottom 40%)
    const crownH = Math.max(3, Math.round(mh * 0.6));
    const trunkH = mh - crownH;
    const trunkW = Math.max(2, Math.round(mw * 0.18));
    // Crown
    for (let row = 0; row < crownH; row++) {
      const frac = row / crownH;
      const rowW = Math.max(1, Math.round(mw * (0.1 + frac * 0.9)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
    // Trunk
    for (let row = crownH; row < mh; row++) {
      const lx = Math.round(mx - trunkW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + trunkW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'buildings') {
    // Rectangle body with pixel windows using accent color
    const bx = Math.round(mx - mw / 2);
    for (let row = 0; row < mh; row++) {
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, bx), cr = Math.min(LW, bx + mw);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
    // Windows every 3 rows, 2 wide
    ctx.fillStyle = accent;
    for (let row = 1; row < mh - 1; row += 3) {
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      for (let wx = bx + 1; wx < bx + mw - 2; wx += 3) {
        if (wx < 0 || wx + 1 >= LW) continue;
        ctx.fillRect(wx * SCALE, ly * SCALE, 2 * SCALE, SCALE);
      }
    }
  } else if (shape === 'stalactites') {
    // Downward pointing — tip at bottom, wide at top
    for (let row = 0; row < mh; row++) {
      const frac = (mh - row - 1) / mh; // 1=widest at top, 0=tip at bottom
      const rowW = Math.max(1, Math.round(mw * (0.06 + frac * 0.94)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'clouds') {
    // Pill/capsule shape — widest in the middle
    for (let row = 0; row < mh; row++) {
      const relY = row / mh;
      const rowW = Math.max(1, Math.round(mw * (0.35 + 4 * relY * (1 - relY) * 0.65)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  } else if (shape === 'roots') {
    // Wide crown + thickening trunk (inverted tree — like mangrove roots)
    const crownH = Math.max(3, Math.round(mh * 0.4));
    const rootH = mh - crownH;
    const trunkW = Math.max(2, Math.round(mw * 0.28));
    // Wide canopy top
    for (let row = 0; row < crownH; row++) {
      const frac = (crownH - row - 1) / crownH;
      const rowW = Math.max(1, Math.round(mw * (0.5 + frac * 0.5)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
    // Root stem — gets thicker going down (swamp vibe)
    for (let row = crownH; row < mh; row++) {
      const frac = (row - crownH) / rootH;
      const rowW = Math.max(1, Math.round(trunkW * (0.4 + frac * 0.6)));
      const lx = Math.round(mx - rowW / 2);
      const ly = skyH - mh + row;
      if (ly < 0 || ly >= skyH) continue;
      const cl = Math.max(0, lx), cr = Math.min(LW, lx + rowW);
      if (cl >= cr) continue;
      ctx.fillRect(cl * SCALE, ly * SCALE, (cr - cl) * SCALE, SCALE);
    }
  }
}

// ── Component ─────────────────────────────────────────────────
export default function PixelRaceCanvas({
  states,
  trackDistance,
  tick,
  trackId,
  events,
}: {
  states: CharacterRaceState[];
  trackDistance: number;
  tick: number;
  trackId?: string;
  events?: { charId: string; good: boolean; born: number }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laneCount = states.length;
  const LH = SKY_H + laneCount * LANE_H;
  const CANVAS_H = LH + TERRAIN_H;
  const trackW = LW - TRACK_START;
  const camXMax = WORLD_W - trackW + 8;

  const theme = (trackId && TRACK_THEMES[trackId]) ? TRACK_THEMES[trackId] : DEFAULT_THEME;
  const sections = trackId ? (TRACKS.find(t => t.id === trackId)?.sections ?? []) : [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // ── Camera ───────────────────────────────────────────────
    const leader = states.reduce((a, b) => a.position > b.position ? a : b, states[0]);
    const leaderWX = (leader.position / trackDistance) * WORLD_W;
    let camX = leaderWX - Math.round(trackW * 0.3);
    camX = Math.max(0, Math.min(camX, camXMax));
    const wx2cx = (wx: number) => TRACK_START + Math.round(wx - camX);

    // ── Sky gradient ─────────────────────────────────────────
    // Simple two-stop sky: top color fills upper half, horizon fills lower half
    const midY = Math.floor(SKY_H / 2);
    ctx.fillStyle = theme.skyTop;
    ctx.fillRect(0, 0, LW * SCALE, midY * SCALE);
    ctx.fillStyle = theme.skyHorizon;
    ctx.fillRect(0, midY * SCALE, LW * SCALE, (SKY_H - midY) * SCALE);

    // Stars / particles (parallax 0.08)
    if (theme.starColor) {
      const starOff = camX * 0.08;
      for (const [sx, sy] of STARS) {
        if (sy >= SKY_H) continue;
        const base = sx - starOff;
        const k0 = Math.floor(-base / STAR_TILE) - 1;
        for (let k = k0; k <= k0 + 2; k++) {
          const dx = base + k * STAR_TILE;
          if (dx < 0 || dx >= LW) continue;
          ctx.fillStyle = sx % 7 === 0 ? '#ffffff' : theme.starColor!;
          ctx.fillRect(Math.round(dx) * SCALE, sy * SCALE, SCALE, SCALE);
        }
      }
    }

    // Moon / ambient light (only if moonColor set)
    if (theme.moonColor) {
      const moonX = Math.round(LW * 0.88 - camX * 0.01);
      if (moonX >= 0 && moonX + 4 <= LW) {
        ctx.fillStyle = theme.moonColor;
        ctx.fillRect(moonX * SCALE, 2 * SCALE, 4 * SCALE, 4 * SCALE);
        ctx.fillStyle = theme.skyTop;
        ctx.fillRect((moonX + 1) * SCALE, 2 * SCALE, 2 * SCALE, SCALE);
        ctx.fillRect((moonX + 3) * SCALE, 3 * SCALE, SCALE, SCALE);
      }
    } else if (theme.accentColor) {
      // Draw a glow orb instead (for volcano/cave)
      const glowX = Math.round(LW * 0.82 - camX * 0.01);
      if (glowX >= 0 && glowX + 3 <= LW) {
        ctx.fillStyle = theme.accentColor + '88';
        ctx.fillRect(glowX * SCALE, 3 * SCALE, 3 * SCALE, 3 * SCALE);
        ctx.fillStyle = theme.accentColor;
        ctx.fillRect((glowX + 1) * SCALE, 4 * SCALE, SCALE, SCALE);
      }
    }

    // Background shapes (parallax 0.3)
    const bgOff = camX * 0.3;
    for (const [mx, mw, mh] of BG_SHAPES) {
      const base = mx - bgOff;
      const k0 = Math.floor(-base / BG_TILE) - 1;
      for (let k = k0; k <= k0 + 2; k++) {
        const drawMX = base + k * BG_TILE;
        if (drawMX + mw < 0 || drawMX - mw > LW) continue;
        drawBgShape(ctx, theme.bgShape, drawMX, mw, mh, SKY_H, theme.bgColor, theme.accentColor);
      }
    }

    // ── Lane label strip ─────────────────────────────────────
    ctx.fillStyle = '#060419';
    ctx.fillRect(0, SKY_H * SCALE, TRACK_START * SCALE, laneCount * LANE_H * SCALE);
    ctx.fillStyle = theme.sep;
    ctx.fillRect((TRACK_START - 1) * SCALE, SKY_H * SCALE, SCALE, laneCount * LANE_H * SCALE);
    for (let i = 0; i < laneCount; i++) {
      const st = states[i];
      const [main] = COLORS[st.characterId] ?? ['#fff'];
      const dotY = SKY_H + i * LANE_H + Math.floor(LANE_H / 2) - 1;
      ctx.fillStyle = main;
      ctx.fillRect(3 * SCALE, dotY * SCALE, 3 * SCALE, 3 * SCALE);
    }

    // ── Clip to track area ───────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(TRACK_START * SCALE, 0, (LW - TRACK_START) * SCALE, LH * SCALE);
    ctx.clip();

    // Lane backgrounds
    for (let lane = 0; lane < laneCount; lane++) {
      const y = SKY_H + lane * LANE_H;
      ctx.fillStyle = lane % 2 === 0 ? theme.laneA : theme.laneB;
      ctx.fillRect(TRACK_START * SCALE, y * SCALE, (LW - TRACK_START) * SCALE, LANE_H * SCALE);
      ctx.fillStyle = theme.sep;
      ctx.fillRect(TRACK_START * SCALE, y * SCALE, (LW - TRACK_START) * SCALE, 1);
    }

    // Dashed center lines
    for (let lane = 0; lane < laneCount; lane++) {
      const cy = SKY_H + lane * LANE_H + Math.floor(LANE_H / 2);
      for (let d = 0; d < WORLD_W + 20; d += 20) {
        const cx2 = wx2cx(d);
        if (cx2 + 10 < TRACK_START || cx2 >= LW) continue;
        ctx.fillStyle = theme.dash;
        ctx.fillRect(Math.max(TRACK_START, cx2) * SCALE, cy * SCALE,
          (Math.min(LW - 1, cx2 + 9) - Math.max(TRACK_START, cx2)) * SCALE, 1);
      }
    }

    // ── Terrain floor strips in lanes ────────────────────────
    // Draw directional marks at the bottom of each lane per terrain section
    if (sections.length > 0) {
      for (const sec of sections) {
        const wxS = sec.from * WORLD_W;
        const wxE = sec.to * WORLD_W;
        const cxS = Math.max(TRACK_START, wx2cx(wxS));
        const cxE = Math.min(LW, wx2cx(wxE));
        if (cxS >= cxE) continue;
        const [, border] = TERRAIN_COLORS[sec.type];

        for (let lane = 0; lane < laneCount; lane++) {
          const floorY = SKY_H + (lane + 1) * LANE_H - 1; // bottom pixel row of lane

          // Base floor color strip (1px)
          ctx.fillStyle = border + 'bb';
          ctx.fillRect(cxS * SCALE, floorY * SCALE, (cxE - cxS) * SCALE, SCALE);

          if (sec.type === 'uphill') {
            // "/" marks: step up to the right (orange-red)
            ctx.fillStyle = '#ff8844ee';
            for (let cx = cxS; cx < cxE - 1; cx += 5) {
              ctx.fillRect(cx * SCALE,       floorY       * SCALE, SCALE, SCALE);
              ctx.fillRect((cx + 1) * SCALE, (floorY - 1) * SCALE, SCALE, SCALE);
            }
          } else if (sec.type === 'downhill') {
            // "\" marks: step down to the right (blue)
            ctx.fillStyle = '#5599ffee';
            for (let cx = cxS; cx < cxE - 1; cx += 5) {
              ctx.fillRect(cx * SCALE,       (floorY - 1) * SCALE, SCALE, SCALE);
              ctx.fillRect((cx + 1) * SCALE, floorY       * SCALE, SCALE, SCALE);
            }
          } else if (sec.type === 'hazard') {
            // alternating danger blocks (red)
            ctx.fillStyle = '#ff1040cc';
            for (let cx = cxS; cx < cxE; cx += 4) {
              ctx.fillRect(cx * SCALE, (floorY - 1) * SCALE, 2 * SCALE, 2 * SCALE);
            }
          } else if (sec.type === 'curves') {
            // wavy pattern (amber)
            ctx.fillStyle = '#ffaa20cc';
            for (let cx = cxS; cx < cxE; cx++) {
              const wave = Math.sin((cx + camX) * 0.5) > 0 ? 0 : 1;
              ctx.fillRect(cx * SCALE, (floorY - wave) * SCALE, SCALE, SCALE);
            }
          }
        }
      }
    }

    // Distance markers every ~100m
    const mStep = (100 / trackDistance) * WORLD_W;
    for (let mwx = mStep; mwx < WORLD_W - 5; mwx += mStep) {
      const dx = wx2cx(mwx);
      if (dx < TRACK_START || dx >= LW) continue;
      ctx.fillStyle = theme.marker;
      ctx.fillRect(dx * SCALE, SKY_H * SCALE, 1, laneCount * LANE_H * SCALE);
    }

    // Finish line (checkered)
    const finDX = wx2cx(WORLD_W);
    if (finDX >= TRACK_START - 6 && finDX < LW + 6) {
      for (let row = 0; row < laneCount * LANE_H; row++) {
        for (let col = 0; col < 6; col++) {
          const white = (Math.floor(row / 2) + col) % 2 === 0;
          ctx.fillStyle = white ? '#ffffff' : '#222222';
          const px = finDX + col;
          if (px < TRACK_START || px >= LW) continue;
          ctx.fillRect(px * SCALE, (SKY_H + row) * SCALE, SCALE, SCALE);
        }
      }
    }

    // ── Characters ───────────────────────────────────────────
    const animFrame = Math.floor(tick / 6) % 2;

    for (let laneIdx = 0; laneIdx < laneCount; laneIdx++) {
      const st = states[laneIdx];
      const cols = COLORS[st.characterId] ?? ['#fff', '#ccc', '#555'];
      const [main, hi, dark] = cols;

      const charWX = (st.position / trackDistance) * WORLD_W;
      const sprX = wx2cx(charWX) - Math.floor(SPR_W / 2);
      const sprY = SKY_H + laneIdx * LANE_H + Math.floor((LANE_H - SPR_H) / 2);

      // Speed trail (before sprite so it appears behind)
      if (st.speedBoost > 1.1 && !st.isFinished) {
        const trailColor = main;
        const midY = sprY + Math.floor(SPR_H / 2) - 1;
        for (let t = 1; t <= 4; t++) {
          const trailCX = wx2cx(charWX - t * 2.5);
          if (trailCX < TRACK_START || trailCX >= LW) continue;
          ctx.globalAlpha = 0.5 - t * 0.1;
          ctx.fillStyle = trailColor;
          ctx.fillRect(trailCX * SCALE, midY * SCALE, SCALE, 3 * SCALE);
        }
        ctx.globalAlpha = 1;
      }

      // Glow
      if (st.speedBoost > 1.05) {
        ctx.fillStyle = '#4fd88a38';
        ctx.fillRect(Math.max(TRACK_START, sprX - 1) * SCALE, sprY * SCALE, (SPR_W + 2) * SCALE, SPR_H * SCALE);
      } else if (st.slowFactor < 0.95) {
        ctx.fillStyle = '#ff5d6c38';
        ctx.fillRect(Math.max(TRACK_START, sprX - 1) * SCALE, sprY * SCALE, (SPR_W + 2) * SCALE, SPR_H * SCALE);
      }

      // Draw sprite
      const spr = getSprite(st.characterId, st.isFinished ? 0 : animFrame);
      for (let row = 0; row < SPR_H; row++) {
        for (let col = 0; col < SPR_W; col++) {
          const pxv = spr[row]?.[col] ?? 0;
          if (pxv === 0) continue;
          const color = pxv === 1 ? main : pxv === 2 ? hi : dark;
          const cx2 = (sprX + col) * SCALE;
          const cy2 = (sprY + row) * SCALE;
          if (cx2 < TRACK_START * SCALE || cy2 < 0 || cy2 + SCALE > LH * SCALE) continue;
          ctx.fillStyle = color;
          ctx.fillRect(cx2, cy2, SCALE, SCALE);
        }
      }
    }

    ctx.restore();

    // ── Event particle effects ────────────────────────────────
    // Drawn outside clip so particles can cross lane boundaries
    if (events) {
      const DIRS: [number, number][] = [
        [0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],
      ];
      for (const ev of events) {
        const age = tick - ev.born;
        if (age < 0 || age > 14) continue;

        const si = states.findIndex(s => s.characterId === ev.charId);
        if (si < 0) continue;
        const st = states[si];

        const charWX = (st.position / trackDistance) * WORLD_W;
        const cx = wx2cx(charWX);
        const cy = SKY_H + si * LANE_H + Math.floor(LANE_H / 2);
        const t = age / 14;
        const fade = 1 - t;

        const [colA, colB, flashCol] = ev.good
          ? ['#4fd88a', '#f5c542', '#ccffee']
          : ['#ff5d6c', '#ff9944', '#ff3300'];
        const spread = ev.good ? 9 : 11;

        // 8-directional expanding burst
        for (let i = 0; i < DIRS.length; i++) {
          const [dx, dy] = DIRS[i];
          const dist = Math.max(1, Math.round(t * spread));
          const px = cx + dx * dist;
          const py = cy + dy * dist;
          if (px < TRACK_START || px >= LW || py < 0 || py >= LH + TERRAIN_H) continue;
          ctx.globalAlpha = fade;
          ctx.fillStyle = i % 2 === 0 ? colA : colB;
          ctx.fillRect(px * SCALE, py * SCALE, SCALE, SCALE);
          // Trailing spark pixel
          if (dist > 3) {
            const tx2 = px + dx, ty2 = py + dy;
            if (tx2 >= TRACK_START && tx2 < LW && ty2 >= 0 && ty2 < LH + TERRAIN_H) {
              ctx.globalAlpha = fade * 0.4;
              ctx.fillRect(tx2 * SCALE, ty2 * SCALE, SCALE, SCALE);
            }
          }
        }

        // Center flash on first 5 frames
        if (age < 5) {
          ctx.globalAlpha = ((5 - age) / 5) * (ev.good ? 0.65 : 0.5);
          ctx.fillStyle = flashCol;
          const fw = 5, fh = 7;
          ctx.fillRect((cx - Math.floor(fw / 2)) * SCALE, (cy - Math.floor(fh / 2)) * SCALE, fw * SCALE, fh * SCALE);
        }

        ctx.globalAlpha = 1;
      }
    }

    // ── Terrain profile strip ─────────────────────────────────
    const stripY = LH * SCALE;
    const stripH = TERRAIN_H * SCALE;
    const stripW = LW * SCALE;

    // Background
    ctx.fillStyle = '#0a0820';
    ctx.fillRect(0, stripY, stripW, stripH);

    // Top separator line
    ctx.fillStyle = theme.sep;
    ctx.fillRect(0, stripY, stripW, 1);

    // Draw each terrain section as a colored band
    if (sections.length > 0) {
      for (const sec of sections) {
        const sx = Math.round(sec.from * stripW);
        const sw = Math.max(1, Math.round((sec.to - sec.from) * stripW));
        const [bg, border] = TERRAIN_COLORS[sec.type];
        ctx.fillStyle = bg;
        ctx.fillRect(sx, stripY + 2, sw, stripH - 4);
        // Top accent line per section
        ctx.fillStyle = border;
        ctx.fillRect(sx, stripY + 2, sw, 2);
        // Section border (right edge)
        ctx.fillStyle = '#ffffff22';
        ctx.fillRect(sx + sw - 1, stripY + 2, 1, stripH - 4);
      }

      // Elevation silhouette: draw a pixel-art elevation curve
      const pts: [number, number][] = [];
      for (const sec of sections) {
        const elevMap: Record<TerrainType, number> = {
          flat: 0, downhill: -1, uphill: 1, curves: 0.3, hazard: -0.2,
        };
        pts.push([sec.from, elevMap[sec.type]]);
        pts.push([sec.to, elevMap[sec.type]]);
      }
      // Draw elevation as a pixel line
      const midY2 = stripY + Math.floor(stripH / 2);
      const amp = Math.floor(stripH / 2) - 3;
      ctx.fillStyle = '#ffffff55';
      for (let px = 0; px < stripW; px++) {
        const frac = px / stripW;
        const sec = sections.find(s => frac >= s.from && frac < s.to) ?? sections[sections.length - 1];
        const elevMap: Record<TerrainType, number> = {
          flat: 0, downhill: -0.7, uphill: 0.7, curves: 0.2, hazard: -0.2,
        };
        const elev = elevMap[sec.type];
        const py = Math.round(midY2 - elev * amp);
        ctx.fillRect(px, py, 1, 1);
      }

      // Leader position indicator (white vertical bar)
      const leaderFrac = Math.min(1, leader.position / trackDistance);
      const indX = Math.round(leaderFrac * stripW);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.max(0, indX - 1), stripY + 1, 2, stripH - 2);

      // Current terrain label (left side, 3px dot)
      const curSec = sections.find(s => leaderFrac >= s.from && leaderFrac < s.to) ?? sections[sections.length - 1];
      const [, curBorder] = TERRAIN_COLORS[curSec.type];
      ctx.fillStyle = curBorder;
      ctx.fillRect(2, stripY + Math.floor(stripH / 2) - 1, 3, 3);
    }
  }, [states, tick, trackDistance, laneCount, LH, CANVAS_H, trackW, camXMax, theme, sections]);

  return (
    <canvas
      ref={canvasRef}
      width={LW * SCALE}
      height={CANVAS_H * SCALE}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        imageRendering: 'pixelated',
        borderRadius: 10,
        border: `1px solid ${theme.sep}`,
      }}
    />
  );
}
