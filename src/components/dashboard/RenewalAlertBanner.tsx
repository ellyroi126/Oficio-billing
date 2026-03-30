'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'

interface RenewalAlertBannerProps {
  count: number
}

export function RenewalAlertBanner({ count }: RenewalAlertBannerProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const dismissedDate = localStorage.getItem('renewal-banner-dismissed')
    setDismissed(dismissedDate === today)
  }, [])

  if (dismissed || count === 0) return null

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('renewal-banner-dismissed', today)
    setDismissed(true)
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {count} contract{count !== 1 ? 's' : ''} expiring within 30 days.{' '}
          <Link href="/reports" className="underline hover:text-amber-900 dark:hover:text-amber-100">
            View renewals report
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="rounded p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800 hover:text-amber-800 dark:hover:text-amber-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
