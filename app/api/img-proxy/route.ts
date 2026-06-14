import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json({ images: [] })

  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  try {
    // Step 1: VQD 토큰 획득
    const initRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
      { headers: { 'User-Agent': ua } }
    )
    const html = await initRes.text()
    const vqd = html.match(/vqd=['"]?([\d-]+)['"]?/)?.[1]
    if (!vqd) return NextResponse.json({ images: [] })

    // Step 2: 이미지 검색 결과 JSON 획득
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}&o=json&vqd=${vqd}&f=,,,,,&p=1`,
      { headers: { 'User-Agent': ua, 'Referer': 'https://duckduckgo.com/' } }
    )
    const data = await imgRes.json() as { results?: { thumbnail?: string; image?: string }[] }
    const images = (data.results ?? [])
      .slice(0, 6)
      .map(r => r.thumbnail ?? r.image)
      .filter((url): url is string => !!url)

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
