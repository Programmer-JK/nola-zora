import type { Metadata } from 'next'
import { Noto_Sans_KR, Jua } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto',
  subsets: ['latin'],
  weight: ['400', '700'],
})

const jua = Jua({
  variable: '--font-jua',
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: '놀아조라',
  description: '라스베가스 주사위 게임 & 캐릭터 카드 파티 게임',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} ${jua.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
