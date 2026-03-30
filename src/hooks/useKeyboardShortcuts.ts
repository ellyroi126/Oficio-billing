'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Shortcut {
  key: string
  description: string
  action: () => void
  ctrl?: boolean
  shift?: boolean
}

export function useKeyboardShortcuts(extraShortcuts?: Shortcut[]) {
  const router = useRouter()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const tag = target.tagName.toLowerCase()
    // Skip if user is typing in an input, textarea, or contenteditable
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
      return
    }

    const shortcuts: Shortcut[] = [
      { key: '/', description: 'Focus search', action: () => {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-search', { detail: 'focus-search' }))
      }},
      { key: 'g', description: 'Go to Dashboard', action: () => router.push('/'), shift: true },
      { key: 'c', description: 'Go to Clients', action: () => router.push('/clients'), shift: true },
      { key: 'i', description: 'Go to Invoices', action: () => router.push('/invoices'), shift: true },
      { key: 'p', description: 'Go to Payments', action: () => router.push('/payments'), shift: true },
      ...(extraShortcuts || []),
    ]

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey

      if (keyMatch && ctrlMatch && shiftMatch) {
        shortcut.action()
        return
      }
    }
  }, [router, extraShortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const shortcutsList = [
  { keys: '/', description: 'Focus search' },
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: 'Shift + G', description: 'Go to Dashboard' },
  { keys: 'Shift + C', description: 'Go to Clients' },
  { keys: 'Shift + I', description: 'Go to Invoices' },
  { keys: 'Shift + P', description: 'Go to Payments' },
  { keys: 'Esc', description: 'Close modals / search' },
]
