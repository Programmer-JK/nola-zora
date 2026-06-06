'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { logoutGuest } from '@/lib/auth'

const GAMES = [
  {
    id: 'las-vegas',
    title: '라스베가스',
    subtitle: 'Las Vegas 주사위 보드게임',
    emoji: '🎰',
    desc: '2~6인 / 주사위 전략 게임\n카지노에 주사위를 배치해 가장 많은 돈을 모으세요!',
    href: '/las-vegas',
    bg: 'bg-amber-50 hover:bg-amber-100/80',
    border: 'border-amber-300/60 hover:border-amber-400',
    badge: 'bg-amber-400 text-black',
    arrow: 'text-amber-400',
  },
  {
    id: 'card-game',
    title: '캐릭터 카드 뽑기',
    subtitle: '애니메이션 캐릭터 파티 게임',
    emoji: '🃏',
    desc: '2인 이상 / 파티 카드 게임\n무작위 카드로 캐릭터를 만들어 설명하세요!',
    href: '/card-game',
    bg: 'bg-violet-50 hover:bg-violet-100/80',
    border: 'border-violet-300/60 hover:border-violet-400',
    badge: 'bg-violet-500 text-white',
    arrow: 'text-violet-400',
  },
]

export default function LobbyPage() {
  const router = useRouter()
  const { nickname } = useAuth()

  function handleLogout() {
    logoutGuest()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#fdfcea] p-4 text-amber-900">
      {/* Header */}
      <header className="max-w-2xl mx-auto flex items-center justify-between pt-6 pb-8">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="놀아조라" className="w-9 h-9 rounded-xl" />
          <div>
            <h1 className="text-xl font-black text-amber-800" style={{ fontFamily: 'var(--font-jua)' }}>
              놀아조라
            </h1>
            <p className="text-amber-700/50 text-xs mt-0.5">
              안녕하세요, <span className="text-amber-900 font-semibold">{nickname}</span>님!
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-amber-700/50 hover:text-amber-800 border border-amber-300/50 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-all"
        >
          로그아웃
        </button>
      </header>

      {/* Game Cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-amber-700/40 text-xs uppercase tracking-widest font-bold mb-6">게임 선택</p>
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => router.push(game.href)}
            className={`w-full text-left ${game.bg} border ${game.border} rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md group`}
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-200">
                {game.emoji}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-amber-950 font-bold text-xl">{game.title}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${game.badge}`}>
                    게임
                  </span>
                </div>
                <p className="text-amber-800/60 text-sm">{game.subtitle}</p>
                <p className="text-amber-700/40 text-xs mt-2 whitespace-pre-line">{game.desc}</p>
              </div>
              <span className={`${game.arrow} text-2xl transition-colors`}>→</span>
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
