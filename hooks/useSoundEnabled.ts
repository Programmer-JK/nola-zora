'use client'

import { useState, useEffect } from 'react'

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('arc-sound')
    if (saved !== null) setEnabled(saved === 'true')
  }, [])

  const toggle = () => setEnabled(v => {
    const next = !v
    localStorage.setItem('arc-sound', String(next))
    return next
  })

  return { soundEnabled: enabled, toggleSound: toggle }
}
