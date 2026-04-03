'use client'

import { useCallback, useEffect, useState } from 'react'

const LS_KEY = 'actions:groq-key'

export function useGroqKey() {
  const [groqKey, setGroqKey] = useState<string>('')

  useEffect(() => {
    setGroqKey(localStorage.getItem(LS_KEY) ?? '')
  }, [])

  const saveKey = useCallback((key: string) => {
    const trimmed = key.trim()
    if (trimmed) {
      localStorage.setItem(LS_KEY, trimmed)
    } else {
      localStorage.removeItem(LS_KEY)
    }
    setGroqKey(trimmed)
  }, [])

  return { groqKey, saveKey }
}
