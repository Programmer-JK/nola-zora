import { Weather } from './types';

export const WEATHER_LIST: Weather[] = [
  {
    id: 'clear',
    name: '맑음',
    emoji: '☀️',
    frequency: 'common',
    description: '기본 컨디션. 모든 캐릭터 평균 성능.',
    effect: '변동 없음',
    globalSpeedMod: 1.0,
  },
  {
    id: 'rain',
    name: '비',
    emoji: '🌧️',
    frequency: 'common',
    description: '그립력 -8%. 늪지/숲 캐릭터에게 유리.',
    effect: '전체 그립력 -8%, STA형 캐릭터 우대',
    globalSpeedMod: 0.95,
  },
  {
    id: 'snow',
    name: '눈',
    emoji: '❄️',
    frequency: 'common',
    description: '빙판 트랙 강화. 미끄럼 이벤트 증가.',
    effect: '빙판 트랙 증강, 미끄럼 이벤트 2배',
    globalSpeedMod: 0.93,
  },
  {
    id: 'fog',
    name: '안개',
    emoji: '🌫️',
    frequency: 'uncommon',
    description: 'AI 판단력 저하. 방해 이벤트 무효화.',
    effect: '방해 이벤트 50% 무효, 기술형 캐릭터 우대',
    globalSpeedMod: 0.97,
  },
  {
    id: 'storm',
    name: '폭풍',
    emoji: '⛈️',
    frequency: 'rare',
    description: '강풍+폭우. 고분산 레이스. 순위 변동 많음.',
    effect: '이벤트 빈도 +50%, 순위 변동성 대폭 증가',
    globalSpeedMod: 0.9,
  },
  {
    id: 'heatwave',
    name: '폭염',
    emoji: '🔥',
    frequency: 'uncommon',
    description: '열기 지대 확장. 내열 캐릭터 우대, 나머지 STA 1.5배 소모.',
    effect: '비내열 캐릭터 STA 소모 1.5배',
    globalSpeedMod: 0.95,
  },
  {
    id: 'gale-wind',
    name: '강풍',
    emoji: '💨',
    frequency: 'uncommon',
    description: '직선 속도 +. 역풍 방향에 따라 -. 게일 +22%.',
    effect: '직선 구간 속도 +10%, 경량 캐릭터 불안정',
    globalSpeedMod: 1.03,
  },
  {
    id: 'thunder',
    name: '천둥',
    emoji: '⚡',
    frequency: 'rare',
    description: '낙뢰 스턴 이벤트. 볼트 쿨다운 감소. 순위 변동성 높음.',
    effect: '낙뢰 스턴 이벤트 발생, 볼트 액티브 재사용 가능',
    globalSpeedMod: 0.97,
  },
  {
    id: 'sandstorm',
    name: '모래폭풍',
    emoji: '🌪️',
    frequency: 'uncommon',
    description: '시야 차단. 듄/록시 저항. 다른 캐릭터 -12%.',
    effect: '모래 저항 없는 캐릭터 속도 -12%',
    globalSpeedMod: 0.92,
  },
  {
    id: 'rainbow',
    name: '무지개',
    emoji: '🌈',
    frequency: 'rare',
    description: '행운의 날. 긍정 이벤트 2배, LCK 영향력 증가.',
    effect: '긍정 이벤트 확률 2배, LCK 기반 보너스 2배',
    globalSpeedMod: 1.02,
  },
];

// Weighted selection pool for random weather
const WEATHER_WEIGHTS: Record<string, number> = {
  clear: 5,
  rain: 4,
  snow: 4,
  fog: 3,
  storm: 1,
  heatwave: 3,
  'gale-wind': 3,
  thunder: 1,
  sandstorm: 3,
  rainbow: 1,
};

export function getWeatherWeight(id: string): number {
  return WEATHER_WEIGHTS[id] ?? 1;
}

export const getWeather = (id: string) =>
  WEATHER_LIST.find(w => w.id === id)!;
