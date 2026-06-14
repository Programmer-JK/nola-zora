import { CATEGORIES, CardItem, Category } from '@/lib/card-game/game-data'

export interface DrawnCard {
  catName: string
  catIdx: number
  colorIdx: number
  itemName: string
  itemDesc: string
  itemIcon: string
}

export interface DeckEntry {
  cat: Category
  remaining: CardItem[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDecks(): DeckEntry[] {
  return CATEGORIES.map(cat => ({
    cat,
    remaining: shuffle(cat.items),
  }))
}

export function nextItem(deckEntry: DeckEntry, infiniteActive: boolean, usedNames?: Set<string>): CardItem {
  if (infiniteActive) {
    const pool = usedNames
      ? deckEntry.cat.items.filter(i => !usedNames.has(i.name))
      : deckEntry.cat.items
    const src = pool.length > 0 ? pool : deckEntry.cat.items
    return src[Math.floor(Math.random() * src.length)]
  }
  if (deckEntry.remaining.length === 0) {
    deckEntry.remaining = shuffle(deckEntry.cat.items)
  }
  return deckEntry.remaining.pop()!
}

export function pickRandom6(decks: DeckEntry[], infiniteActive: boolean): DrawnCard[] {
  const catCounts = new Map<number, number>()
  const results: DrawnCard[] = []
  const usedNames = new Set<string>()

  while (results.length < 6) {
    const available = decks.filter((_, i) => {
      const name = decks[i].cat.name
      const max = name === '성격' ? 1 : name === '특징' ? 3 : 2
      return (catCounts.get(i) || 0) < max
    })
    if (available.length === 0) break

    const deckEntry = available[Math.floor(Math.random() * available.length)]
    const catIdx = decks.indexOf(deckEntry)
    const item = nextItem(deckEntry, infiniteActive, usedNames)
    usedNames.add(item.name)
    results.push(toDrawnCard(deckEntry.cat, catIdx, item))
    catCounts.set(catIdx, (catCounts.get(catIdx) || 0) + 1)
  }
  return results
}

export function toDrawnCard(cat: Category, catIdx: number, item: CardItem): DrawnCard {
  return {
    catName: cat.name,
    catIdx,
    colorIdx: cat.colorIdx,
    itemName: item.name,
    itemDesc: item.desc,
    itemIcon: item.icon,
  }
}

export function remainingCount(decks: DeckEntry[]): number {
  return decks.reduce((s, d) => s + d.remaining.length, 0)
}
