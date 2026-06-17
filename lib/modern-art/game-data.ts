import { nanoid } from 'nanoid';
import { Artist, AuctionType, Card } from './types';

export const ARTISTS: Artist[] = [
  {
    id: 'yugioh', name: '유희왕', avatar: '🃏', color: '#F59E0B',
    images: [
      '/modern-art/yugi/yugi-dark-magician-girl.jpg',
      '/modern-art/yugi/yugi-dark-magician.jpg',
      '/modern-art/yugi/yugi-exodia.jpg',
      '/modern-art/yugi/yugi-kuriboh.jpg',
      '/modern-art/yugi/yugi-magi-kuriboh.jpg',
      '/modern-art/yugi/yugi-monster-reborn.jpg',
      '/modern-art/yugi/yugi-obelisk-the-tormentor.jpg',
      '/modern-art/yugi/yugi-pot-of-greed.jpg',
      '/modern-art/yugi/yugi-red-eyes-black-dragon.jpg',
      '/modern-art/yugi/yugi-slifer-the-sky-dragon.jpg',
      '/modern-art/yugi/yugi-the-winged-dragon-of-ra.jpg',
      '/modern-art/yugi/yugi-white-dragon.jpg',
    ],
  },
  {
    id: 'digimon', name: '디지몬', avatar: '🦕', color: '#8B5CF6',
    images: [
      '/modern-art/digmon/digimon-angewoman.jpg',
      '/modern-art/digmon/digimon-darkwargreymon.png',
      '/modern-art/digmon/digimon-dukemon.jpg',
      '/modern-art/digmon/digimon-imperialdramon.jpg',
      '/modern-art/digmon/digimon-patamon.jpg',
      '/modern-art/digmon/digimon-piemon.png',
      '/modern-art/digmon/digimon-powerdramon.jpg',
      '/modern-art/digmon/digimon-terriamon.jpg',
      '/modern-art/digmon/digimon-wargreymon.jpg',
      '/modern-art/digmon/digmon-agumon.jpg',
      '/modern-art/digmon/digmon-omegamon.jpg',
      '/modern-art/digmon/digmon-vmon.jpg',
      '/modern-art/digmon/digmon-wizardmon.jpg',
    ],
  },
  {
    id: 'pokemon', name: '포켓몬', avatar: '⚡', color: '#EF4444',
    images: [
      '/modern-art/pokemon/pokemon-bulbasaur.png',
      '/modern-art/pokemon/pokemon-cute.png',
      '/modern-art/pokemon/pokemon-duck.png',
      '/modern-art/pokemon/pokemon-fire.png',
      '/modern-art/pokemon/pokemon-ice.png',
      '/modern-art/pokemon/pokemon-king.png',
      '/modern-art/pokemon/pokemon-lapras.png',
      '/modern-art/pokemon/pokemon-lizard.png',
      '/modern-art/pokemon/pokemon-mew.png',
      '/modern-art/pokemon/pokemon-mewtwo.png',
      '/modern-art/pokemon/pokemon-pikachu.png',
      '/modern-art/pokemon/pokemon-requka.png',
      '/modern-art/pokemon/pokemon-whale.png',
      '/modern-art/pokemon/pokemon-white.png',
    ],
  },
  {
    id: 'indie-game', name: '인디게임', avatar: '🎮', color: '#10B981',
    images: [
      '/modern-art/indi/indi-arpia.png',
      '/modern-art/indi/indi-baldaur.png',
      '/modern-art/indi/indi-hollow.png',
      '/modern-art/indi/indi-minecraft.png',
      '/modern-art/indi/indi-ori.png',
      '/modern-art/indi/indi-repo.png',
      '/modern-art/indi/indi-riskofrain.png',
      '/modern-art/indi/indi-stardewvally.png',
      '/modern-art/indi/indi-terraria.jpg',
      '/modern-art/indi/indi-undertaii.jpg',
    ],
  },
  {
    id: 'nintendo', name: '닌텐도', avatar: '🍄', color: '#3B82F6',
    images: [
      '/modern-art/nintendo/nintendo-animal.jpg',
      '/modern-art/nintendo/nintendo-game.jpg',
      '/modern-art/nintendo/nintendo-hero.png',
      '/modern-art/nintendo/nintendo-kerby.png',
      '/modern-art/nintendo/nintendo-kery2.png',
      '/modern-art/nintendo/nintendo-mario-p.jpg',
      '/modern-art/nintendo/nintendo-mario2.jpg',
      '/modern-art/nintendo/nintendo-splatoon.jpg',
      '/modern-art/nintendo/nintendo-yoshi.jpg',
      '/modern-art/nintendo/nintendo-zelda.jpg',
      '/modern-art/nintendo/nintendo-zelda2.jpg',
    ],
  },
];

export const AUCTION_TYPES: AuctionType[] = ['open', 'fixed', 'secret', 'once-around', 'double'];

export const AUCTION_TYPE_LABELS: Record<AuctionType, string> = {
  'open':        '공개 경매',
  'fixed':       '지정가 경매',
  'secret':      '비밀 경매',
  'once-around': '한 바퀴 경매',
  'double':      '더블 경매',
};

export const AUCTION_TYPE_ICONS: Record<AuctionType, string> = {
  'open':        '📣',
  'fixed':       '🏷️',
  'secret':      '🤫',
  'once-around': '🔄',
  'double':      '🎴',
};

export const AUCTION_TYPE_COLORS: Record<AuctionType, string> = {
  'open':        '#F59E0B',
  'fixed':       '#10B981',
  'secret':      '#8B5CF6',
  'once-around': '#3B82F6',
  'double':      '#EF4444',
};

// 라운드 종료 조건: 특정 작가 카드가 이 수 이상 등장하면
export const ROUND_END_COUNT = 5;

// 순위 별 작품 가격
export const RANKING_VALUES = [30, 20, 10]; // 1위, 2위, 3위

export const STARTING_CASH = 100;

// 작가별 경매 타입별 카드 수 (포켓몬14/디지몬13/유희왕12/닌텐도11/인디10 = 합계60)
const CARDS_DISTRIBUTION: Record<string, Record<AuctionType, number>> = {
  //                      공개  지정  비밀  한바퀴  더블  = 합계
  'pokemon':    { open: 3, fixed: 3, secret: 3, 'once-around': 3, double: 2 }, // 14
  'digimon':    { open: 3, fixed: 3, secret: 3, 'once-around': 2, double: 2 }, // 13
  'yugioh':     { open: 3, fixed: 3, secret: 3, 'once-around': 2, double: 1 }, // 12
  'nintendo':   { open: 3, fixed: 2, secret: 2, 'once-around': 2, double: 2 }, // 11
  'indie-game': { open: 2, fixed: 2, secret: 2, 'once-around': 2, double: 2 }, // 10
};

export function generateDeck(): Card[] {
  const cards: Card[] = [];

  for (const artist of ARTISTS) {
    const dist = CARDS_DISTRIBUTION[artist.id];
    let artworkIndex = 0;
    for (const type of AUCTION_TYPES) {
      const count = dist[type] ?? 0;
      for (let i = 0; i < count; i++) {
        cards.push({ id: nanoid(8), artistId: artist.id, auctionType: type, artworkIndex: artworkIndex++ });
      }
    }
  }

  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 라운드별 1인당 카드 지급 수 (플레이어 수별, 원작 룰 기준)
// 시즌4는 0장 (남은 패로만 진행)
export const CARDS_PER_ROUND: Record<number, number[]> = {
  2: [10, 6, 6, 0],
  3: [10, 6, 6, 0],
  4: [9,  4, 4, 0],
  5: [8,  3, 3, 0],
};

export function getArtistById(id: string): Artist {
  return ARTISTS.find(a => a.id === id) ?? ARTISTS[0];
}
