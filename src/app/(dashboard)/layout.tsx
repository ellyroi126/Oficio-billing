'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed for more space
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
    setMounted(true)
  }, [])

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-16 bg-gray-900" /> {/* Placeholder matching collapsed width */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
