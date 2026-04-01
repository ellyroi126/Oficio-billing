'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-900 dark:text-gray-100 font-medium">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-4 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}
