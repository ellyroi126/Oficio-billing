'use client'

import { useState, useEffect, useCallback } from 'react'

export function useTableNavigation(itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const direction = (e as CustomEvent).detail as 'up' | 'down'
      setFocusedIndex(prev => {
        if (prev === null) return 0
        if (direction === 'down') return Math.min(prev + 1, itemCount - 1)
        if (direction === 'up') return Math.max(prev - 1, 0)
        return prev
      })
    }
    window.addEventListener('table-navigate', handleNavigate)
    return () => window.removeEventListener('table-navigate', handleNavigate)
  }, [itemCount])

  // Reset focused index when item count changes (page change)
  useEffect(() => {
    setFocusedIndex(null)
  }, [itemCount])

  return { focusedIndex, setFocusedIndex }
}
