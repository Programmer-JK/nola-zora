'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginGuest, getGuestNickname } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getGuestNickname()) {
      router.replace('/lobby')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) { setError('닉네임을 입력해주세요'); return }
    if (name.length > 12) { setError('닉네임은 12자 이내로 입력해주세요'); return }
    setLoading(true)
    setError('')
    try {
      await loginGuest(name)
      router.push('/lobby')
    } catch {
      setError('입장 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fdfcea] flex flex-col items-center justify-center p-4 text-amber-900">
      <div className="w-full max-w-sm">
        {/* Hero */}
        <div className="text-center mb-8">
          <img src="/icon.png" alt="놀아조라" className="w-36 h-36 mx-auto mb-4" />
          <p className="text-amber-700 text-xs tracking-widest uppercase">보드게임 놀아조라</p>
        </div>

        {/* Form */}
        <div className="bg-white/60 border border-amber-200/60 rounded-3xl p-8 backdrop-blur-sm shadow-xl shadow-amber-900/10">
          <form onSubmit={handleSubmit}>
            <label className="block text-amber-800 text-xs font-bold tracking-widest uppercase mb-3">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="최대 12자"
              maxLength={12}
              autoFocus
              className="w-full bg-white/80 border border-amber-300/60 rounded-xl px-4 py-3 text-amber-950 placeholder-amber-400/50 focus:outline-none focus:border-amber-500 transition-all text-lg"
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 py-4 rounded-2xl font-black text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? '입장 중...' : '입장하기 🎲'}
            </button>
          </form>
        </div>

        <p className="text-center text-amber-700 text-xs mt-6 tracking-widest">보드게임 하즈아~</p>
      </div>
    </main>
  )
}
