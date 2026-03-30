'use client'

import { Card, CardContent } from '@/components/ui/Card'

interface AgingData {
  current: number
  thirtyToSixty: number
  sixtyPlus: number
}

interface InvoiceAgingCardProps {
  aging: AgingData
  loading?: boolean
}

export function InvoiceAgingCard({ aging, loading }: InvoiceAgingCardProps) {
  const total = aging.current + aging.thirtyToSixty + aging.sixtyPlus
  if (!loading && total === 0) return null

  const buckets = [
    { label: '1–30 days', count: aging.current, color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400' },
    { label: '31–60 days', count: aging.thirtyToSixty, color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-400' },
    { label: '60+ days', count: aging.sixtyPlus, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Overdue Invoice Aging</h3>
        <div className="flex gap-4">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex-1 text-center">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${bucket.color} text-white text-sm font-bold`}>
                {loading ? '-' : bucket.count}
              </div>
              <p className={`mt-1 text-xs font-medium ${bucket.textColor}`}>{bucket.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
