const NICKNAME_KEY = 'guestNickname'
const UID_KEY = 'guestUid'

export async function loginGuest(nickname: string): Promise<string> {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(UID_KEY, uid)
  }
  localStorage.setItem(NICKNAME_KEY, nickname)
  return uid
}

export function getGuestNickname(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NICKNAME_KEY)
}

export function getGuestUid(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(UID_KEY)
}

export function logoutGuest(): void {
  localStorage.removeItem(NICKNAME_KEY)
  localStorage.removeItem(UID_KEY)
}
