'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { AlertTriangle, CheckSquare, Receipt, FileText, ChevronDown, ChevronRight } from 'lucide-react'

interface Approval {
  id: string
  actionType: string
  entityName: string
  requestedByName?: string
  createdAt: string
}

interface OverdueInvoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string
  client: { clientName: string }
}

interface ExpiringContract {
  id: string
  contractNumber: string
  endDate: string
  client: { clientName: string }
}

interface NeedsAttentionData {
  approvals: Approval[]
  overdueInvoices: OverdueInvoice[]
  expiringContracts: ExpiringContract[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDaysUntil(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (count === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-md"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          <Badge variant={count > 0 ? 'danger' : 'default'}>{count}</Badge>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="mt-1 space-y-1 px-2">{children}</div>}
    </div>
  )
}

export function NeedsAttentionCard() {
  const [data, setData] = useState<NeedsAttentionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/needs-attention')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (error) {
        console.error('Error fetching needs-attention data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const totalItems =
    data.approvals.length + data.overdueInvoices.length + data.expiringContracts.length

  if (totalItems === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-sm text-gray-500">
            All clear! Nothing needs your attention right now.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Needs Attention
          <Badge variant="warning">{totalItems}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {/* Pending Approvals */}
        <CollapsibleSection
          title="Pending Approvals"
          icon={<CheckSquare className="h-4 w-4 text-blue-500" />}
          count={data.approvals.length}
        >
          {data.approvals.map((approval) => (
            <Link
              key={approval.id}
              href="/approvals"
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {approval.actionType.replace(/_/g, ' ')} - {approval.entityName}
                </p>
                {approval.requestedByName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {approval.requestedByName}
                  </p>
                )}
              </div>
              <span className="ml-2 shrink-0 text-xs text-gray-400">
                {formatRelativeTime(approval.createdAt)}
              </span>
            </Link>
          ))}
        </CollapsibleSection>

        {/* Overdue Invoices */}
        <CollapsibleSection
          title="Overdue Invoices"
          icon={<Receipt className="h-4 w-4 text-red-500" />}
          count={data.overdueInvoices.length}
        >
          {data.overdueInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {invoice.invoiceNumber} - {invoice.client.clientName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(invoice.totalAmount)} &middot; Due {formatRelativeTime(invoice.dueDate)}
                </p>
              </div>
              <Badge variant="danger" className="ml-2 shrink-0">Overdue</Badge>
            </Link>
          ))}
        </CollapsibleSection>

        {/* Expiring Contracts */}
        <CollapsibleSection
          title="Expiring Contracts"
          icon={<FileText className="h-4 w-4 text-orange-500" />}
          count={data.expiringContracts.length}
        >
          {data.expiringContracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {contract.contractNumber} - {contract.client.clientName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expires {new Date(contract.endDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <Badge variant="warning" className="ml-2 shrink-0">{formatDaysUntil(contract.endDate)}</Badge>
            </Link>
          ))}
        </CollapsibleSection>
      </CardContent>
    </Card>
  )
}
