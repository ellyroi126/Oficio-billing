'use client'

import type { LucideIcon } from 'lucide-react'

interface QuickFilter {
  label: string
  icon?: LucideIcon
  active?: boolean
  onClick: () => void
}

interface QuickFilterBarProps {
  filters: QuickFilter[]
}

export function QuickFilterBar({ filters }: QuickFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => {
        const Icon = filter.icon
        return (
          <button
            key={filter.label}
            onClick={filter.onClick}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter.active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
