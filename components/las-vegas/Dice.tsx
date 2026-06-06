'use client';

interface DiceProps {
  value: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const DOT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: '50%', left: '50%' }],
  2: [{ top: '25%', left: '25%' }, { top: '75%', left: '75%' }],
  3: [{ top: '25%', left: '25%' }, { top: '50%', left: '50%' }, { top: '75%', left: '75%' }],
  4: [
    { top: '25%', left: '25%' }, { top: '25%', left: '75%' },
    { top: '75%', left: '25%' }, { top: '75%', left: '75%' },
  ],
  5: [
    { top: '25%', left: '25%' }, { top: '25%', left: '75%' },
    { top: '50%', left: '50%' },
    { top: '75%', left: '25%' }, { top: '75%', left: '75%' },
  ],
  6: [
    { top: '25%', left: '25%' }, { top: '25%', left: '75%' },
    { top: '50%', left: '25%' }, { top: '50%', left: '75%' },
    { top: '75%', left: '25%' }, { top: '75%', left: '75%' },
  ],
};

const COLOR_MAP: Record<string, { face: string; dot: string; ring: string }> = {
  red:    { face: 'bg-red-500',    dot: 'bg-white',      ring: 'ring-red-300' },
  blue:   { face: 'bg-blue-500',   dot: 'bg-white',      ring: 'ring-blue-300' },
  green:  { face: 'bg-green-500',  dot: 'bg-white',      ring: 'ring-green-300' },
  yellow: { face: 'bg-yellow-400', dot: 'bg-yellow-900', ring: 'ring-yellow-200' },
  purple: { face: 'bg-purple-500', dot: 'bg-white',      ring: 'ring-purple-300' },
  orange: { face: 'bg-orange-500', dot: 'bg-white',      ring: 'ring-orange-300' },
  white:  { face: 'bg-white',      dot: 'bg-gray-800',   ring: 'ring-gray-300' },
};

const SIZE_MAP = {
  sm: { wrapper: 'w-7 h-7',   dot: 'w-1.5 h-1.5' },
  md: { wrapper: 'w-10 h-10', dot: 'w-2 h-2' },
  lg: { wrapper: 'w-14 h-14', dot: 'w-2.5 h-2.5' },
};

export default function Dice({ value, color, size = 'md', selectable = false, selected = false, onClick }: DiceProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP['red'];
  const s = SIZE_MAP[size];
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];

  return (
    <div
      onClick={onClick}
      className={[
        'relative rounded-lg select-none shadow-md',
        s.wrapper,
        c.face,
        selectable ? 'cursor-pointer transition-transform duration-150 hover:scale-110' : '',
        selected ? `ring-3 ring-offset-2 ring-offset-transparent ${c.ring} scale-110` : '',
      ].filter(Boolean).join(' ')}
    >
      {dots.map((pos, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${c.dot} ${s.dot} -translate-x-1/2 -translate-y-1/2`}
          style={{ top: pos.top, left: pos.left }}
        />
      ))}
    </div>
  );
}
