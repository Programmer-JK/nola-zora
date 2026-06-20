export type YachtCatId =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'choice' | 'fourk' | 'fullh' | 'sstr' | 'bstr' | 'yacht';

export interface YachtCategory {
  id: YachtCatId;
  kr: string;
  sub: string;
  sec: 'upper' | 'lower';
  face?: number;
  fixed?: number;
}

export interface YachtPlayer {
  id: number;
  name: string;
  color: string; // hex color
  scores: Partial<Record<YachtCatId, number>>;
}

export interface PlayerSetup {
  name: string;
  color: string;
}
