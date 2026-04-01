'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import { Trash2, RotateCcw, AlertTriangle, Users, FileText, Receipt, CreditCard } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

type EntityType = 'clients' | 'contracts' | 'invoices' | 'payments'

interface TrashItem {
  id: string
  deletedAt: string
  [key: string]: unknown
}

interface TrashData {
  clients: TrashItem[]
  contracts: TrashItem[]
  invoices: TrashItem[]
  payments: TrashItem[]
}

const TABS: { key: EntityType; label: string; model: string; icon: typeof Users }[] = [
  { key: 'clients', label: 'Clients', model: 'client', icon: Users },
  { key: 'contracts', label: 'Contracts', model: 'contract', icon: FileText },
  { key: 'invoices', label: 'Invoices', model: 'invoice', icon: Receipt },
  { key: 'payments', label: 'Payments', model: 'payment', icon: CreditCard },
]

export default function TrashPage() {
  const toast = useToast()
  const [data, setData] = useState<TrashData>({ clients: [], contracts: [], invoices: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EntityType>('clients')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const fetchTrash = useCallback(async () => {
    try {
      const res = await fetch('/api/trash')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching trash:', error)
      toast.error('Failed to load trash')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRestore = async (model: string, ids: string[]) => {
    try {
      const res = await fetch('/api/trash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, ids }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`Restored ${ids.length} item(s)`)
        setSelectedIds([])
        fetchTrash()
      } else {
        toast.error(result.error || 'Failed to restore')
      }
    } catch (error) {
      console.error('Error restoring:', error)
      toast.error('Failed to restore items')
    }
  }

  const handlePermanentDelete = (model: string, ids: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete',
      message: `This will permanently delete ${ids.length} item(s). This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/trash', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, ids }),
          })
          const result = await res.json()
          if (result.success) {
            toast.success(`Permanently deleted ${ids.length} item(s)`)
            setSelectedIds([])
            fetchTrash()
          } else {
            toast.error(result.error || 'Failed to delete')
          }
        } catch (error) {
          console.error('Error deleting:', error)
          toast.error('Failed to permanently delete items')
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      },
    })
  }

  const currentTab = TABS.find(t => t.key === activeTab)!
  const items = data[activeTab]

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  const getItemLabel = (item: TrashItem): string => {
    switch (activeTab) {
      case 'clients': return (item as any).clientName
      case 'contracts': return `${(item as any).contractNumber} — ${(item as any).client?.clientName || ''}`
      case 'invoices': return `${(item as any).invoiceNumber} — ${formatCurrency((item as any).totalAmount)} — ${(item as any).client?.clientName || ''}`
      case 'payments': return `${formatCurrency((item as any).amount)} via ${(item as any).paymentMethod || 'N/A'} — ${(item as any).client?.clientName || ''}`
    }
  }

  const totalCount = data.clients.length + data.contracts.length + data.invoices.length + data.payments.length

  return (
    <div>
      <Header title="Trash" />

      <div className="p-6">
        {/* Warning banner */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Items in trash are automatically purged after 30 days.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Restore items to recover them, or permanently delete to free up space immediately.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => {
            const count = data[tab.key].length
            const TabIcon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedIds([]) }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(currentTab.model, selectedIds)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Selected
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handlePermanentDelete(currentTab.model, selectedIds)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        )}

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Trash2}
                title={`No deleted ${currentTab.label.toLowerCase()}`}
                description="Deleted items will appear here for 30 days before being permanently removed."
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-6 py-4 ${
                      selectedIds.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, item.id])
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== item.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {getItemLabel(item)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Deleted {formatRelativeTime(item.deletedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(currentTab.model, [item.id])}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePermanentDelete(currentTab.model, [item.id])}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {totalCount > 0 && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            {totalCount} item(s) in trash
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </div>
  )
}
