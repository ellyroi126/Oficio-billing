'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ShortcutHelpModal } from '@/components/ui/ShortcutHelpModal'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

function ShortcutHandler({ onToggleHelp }: { onToggleHelp: () => void }) {
  useKeyboardShortcuts([
    { key: '?', description: 'Show shortcuts', action: onToggleHelp, shift: true },
  ])
  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleNewItem = () => {
      if (pathname.startsWith('/clients')) router.push('/clients/new')
      else if (pathname.startsWith('/contracts')) router.push('/contracts/new')
      else if (pathname.startsWith('/invoices')) router.push('/invoices/new')
      else if (pathname.startsWith('/payments')) router.push('/payments/new')
    }
    window.addEventListener('new-item', handleNewItem)
    return () => window.removeEventListener('new-item', handleNewItem)
  }, [pathname, router])

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  const toggleShortcuts = useCallback(() => {
    setShowShortcuts(prev => !prev)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 bg-gray-900" />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <ShortcutHandler onToggleHelp={toggleShortcuts} />
      <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ShortcutHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}
