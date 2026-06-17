'use client';

interface DiceProps {
  value: number;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}

// 3×3 그리드 핍 위치 (arcade pip 방식)
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_MAP: Record<string, string> = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#facc15',
  purple: '#a855f7',
  orange: '#f97316',
  white:  '#f0e8d8',
};

const SIZE_MAP: Record<string, number> = {
  xs: 18,
  sm: 34,
  md: 48,
  lg: 64,
};

export default function Dice({ value, color, size = 'md', glow = false }: DiceProps) {
  const face = FACE_MAP[color] ?? FACE_MAP['red'];
  const pips = PIP_MAP[value] || [];
  const s = SIZE_MAP[size];

  return (
    <div
      style={{
        width: s,
        height: s,
        background: `linear-gradient(150deg, ${face} 0%, color-mix(in srgb, ${face} 80%, #999) 100%)`,
        borderRadius: Math.round(s * 0.22),
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        padding: s * 0.13,
        gap: s * 0.04,
        boxShadow: `inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 5px rgba(0,0,0,.25)${glow ? `, 0 0 18px -2px ${face}99` : ''}`,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            borderRadius: '50%',
            background: pips.includes(i) ? '#1a1206' : 'transparent',
            boxShadow: pips.includes(i) ? 'inset 0 1px 1px rgba(0,0,0,.4)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
