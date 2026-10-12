import type { GameSettings } from './types';

export interface TreasureTemplate {
  id: string;
  name: string;
  clue: string;
}

// 24종의 보물 풀 — 같은 이름이라도 게임마다 안전/저주 여부가 달라진다
export const TREASURE_POOL: TreasureTemplate[] = [
  { id: 't001', name: '검은 왕관',        clue: '어둠 속에서 빛나는 권위의 상징' },
  { id: 't002', name: '은빛 거울',        clue: '진실과 거짓을 동시에 비춘다' },
  { id: 't003', name: '황금 해골',        clue: '전설의 용사가 남긴 마지막 유물' },
  { id: 't004', name: '보랏빛 수정구',    clue: '미래를 엿볼 수 있다는 소문이 있다' },
  { id: 't005', name: '봉인된 항아리',    clue: '내부에서 무언가 움직이는 것 같다' },
  { id: 't006', name: '녹슨 열쇠',        clue: '잃어버린 보물창고의 열쇠라 전해진다' },
  { id: 't007', name: '달빛 단검',        clue: '달빛 아래서만 그 진가를 드러낸다' },
  { id: 't008', name: '불사조 깃털',      clue: '부활의 힘이 깃들어 있다는 소문이 있다' },
  { id: 't009', name: '익룡의 알',        clue: '아직 따뜻한 온기가 남아 있다' },
  { id: 't010', name: '마법사의 모자',    clue: '착용자의 생각을 읽는다고 알려졌다' },
  { id: 't011', name: '해신의 조개',      clue: '귓가에 대면 바다의 노래가 들린다' },
  { id: 't012', name: '저주받은 주화',    clue: '무한한 부를 약속하지만 대가가 있다' },
  { id: 't013', name: '달빛 나침반',      clue: '북쪽이 아닌 행복을 가리킨다고 한다' },
  { id: 't014', name: '시간의 모래시계',  clue: '모래가 거꾸로 흐르는 것 같다' },
  { id: 't015', name: '용의 비늘',        clue: '어느 전설의 용에게서 떨어진 것인가' },
  { id: 't016', name: '잊혀진 지도',      clue: '존재하지 않는 장소로 이어지는 길' },
  { id: 't017', name: '투명한 검',        clue: '보이지 않아도 그 예리함은 실재한다' },
  { id: 't018', name: '별의 파편',        clue: '하늘에서 떨어진 것, 그 기원은 불분명하다' },
  { id: 't019', name: '항해사의 일지',    clue: '별들 사이를 여행한 자의 비밀 기록' },
  { id: 't020', name: '마녀의 빗자루',    clue: '하늘을 나는 방법이 적혀 있다' },
  { id: 't021', name: '유령의 초상화',    clue: '보는 방향에 따라 표정이 바뀐다' },
  { id: 't022', name: '황금 거북이',      clue: '천년을 산 거북이, 지혜가 가득하다' },
  { id: 't023', name: '어둠의 수호석',    clue: '모든 빛을 흡수한다' },
  { id: 't024', name: '봄의 씨앗',        clue: '심으면 무엇이든 자란다는 전설이 있다' },
];

export const PLAYER_COLORS = [
  { id: 'red',    label: '빨강', hex: '#ef4444' },
  { id: 'blue',   label: '파랑', hex: '#3b82f6' },
  { id: 'green',  label: '초록', hex: '#22c55e' },
  { id: 'yellow', label: '노랑', hex: '#eab308' },
  { id: 'purple', label: '보라', hex: '#a855f7' },
  { id: 'orange', label: '주황', hex: '#f97316' },
];

export const DEFAULT_SETTINGS: GameSettings = {
  discussionSeconds: 30,
  biddingSeconds: 15,
  resultSeconds: 10,
  totalRounds: 6,
};

export const INITIAL_COINS = 12;
export const MIN_BID = 1;
export const MAX_BID = 4;
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 6;
export const TREASURES_PER_ROUND = 3;

// 위험 등급별 저주 확률 및 점수 테이블
export const RISK_TABLE = {
  low:    { cursePct: 0.15, safeScores: [2, 3] as number[], curseScore: -3 },
  medium: { cursePct: 0.30, safeScores: [3, 5] as number[], curseScore: -3 },
  high:   { cursePct: 0.45, safeScores: [5, 6] as number[], curseScore: -4 },
};
