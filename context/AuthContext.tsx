'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getGuestNickname, getGuestUid } from '@/lib/auth'

interface AuthState {
  uid: string
  nickname: string
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const uid = getGuestUid()
    const nickname = getGuestNickname()
    if (uid && nickname) {
      setAuth({ uid, nickname })
    } else {
      setAuth(null)
    }
    setChecked(true)
  }, [pathname])

  useEffect(() => {
    if (!checked) return
    if (!auth && pathname !== '/') {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      router.replace(`/?returnUrl=${returnUrl}`)
    }
  }, [checked, auth, pathname, router])

  // 아직 확인 안 됐거나, 비로그인 상태에서 보호 페이지에 접근 중이면 아무것도 렌더하지 않음
  // (리다이렉트 effect가 실행되기 전에 useAuth()가 throw하는 것 방지)
  if (!checked || (!auth && pathname !== '/')) return null

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthOptional(): AuthState | null {
  return useContext(AuthContext)
}
