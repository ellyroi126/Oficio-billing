'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Receipt, CreditCard, ScrollText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface TimelineItem {
  type: 'contract' | 'invoice' | 'payment' | 'audit'
  date: string
  title: string
  description: string
  linkUrl?: string
}

const iconConfig = {
  contract: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
  invoice: { icon: Receipt, color: 'text-green-600', bg: 'bg-green-100' },
  payment: { icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
  audit: { icon: ScrollText, color: 'text-gray-600', bg: 'bg-gray-100' },
}

function formatTimelineDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTimelineTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ClientTimeline({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const response = await fetch(`/api/clients/${clientId}/timeline`)
        const result = await response.json()
        if (result.success) {
          setItems(result.data)
        } else {
          setError(result.error || 'Failed to load timeline')
        }
      } catch (err) {
        console.error('Error fetching timeline:', err)
        setError('Failed to load timeline')
      } finally {
        setLoading(false)
      }
    }
    fetchTimeline()
  }, [clientId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <p className="py-4 text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">No activity recorded yet.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-6">
              {items.map((item, index) => {
                const config = iconConfig[item.type]
                const Icon = config.icon
                const content = (
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500">{formatTimelineDate(item.date)}</p>
                          <p className="text-xs text-gray-400">{formatTimelineTime(item.date)}</p>
                        </div>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                )

                if (item.linkUrl) {
                  return (
                    <Link
                      key={`${item.type}-${index}`}
                      href={item.linkUrl}
                      className="block rounded-lg p-2 -ml-2 transition-colors hover:bg-gray-50"
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <div key={`${item.type}-${index}`} className="p-2 -ml-2">
                    {content}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
