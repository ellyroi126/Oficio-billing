'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { InvoiceTable, InvoiceSortField, SortDirection } from '@/components/invoices/InvoiceTable'
import { InvoiceGenerateModal } from '@/components/invoices/InvoiceGenerateModal'
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal'
import { SendReminderModal } from '@/components/invoices/SendReminderModal'
import { RegeneratePdfModal } from '@/components/invoices/RegeneratePdfModal'
import ApprovalRequestModal from '@/components/approvals/ApprovalRequestModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRole } from '@/contexts/RoleContext'
import { useToast } from '@/contexts/ToastContext'
import { usePagination } from '@/hooks/usePagination'
import { exportToExcel, invoiceExportColumns } from '@/lib/excel-export'
import { QuickFilterBar } from '@/components/ui/QuickFilterBar'
import { Plus, Zap, Trash2, Search, X, Send, RefreshCw, Download, Bell, Clock, FileText, CalendarDays } from 'lucide-react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amount: number
  vatAmount: number
  totalAmount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  filePath: string | null
  createdAt: string
  client: {
    id: string
    clientName: string
  }
  payments?: { amount: number }[]
  totalPaid?: number
  balance?: number
}

interface Client {
  id: string
  clientName: string
}

export default function InvoicesPage() {
  const { isAdmin } = useRole()
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean
    invoiceId: string
    invoiceNumber: string
  }>({ isOpen: false, invoiceId: '', invoiceNumber: '' })
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Quick filter
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)

  // Sorting
  const [sortField, setSortField] = useState<InvoiceSortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination
  const { page, pageSize, totalItems, totalPages, setPage, setPageSize, updateFromResponse, resetPage } = usePagination()

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (clientFilter) params.set('clientId', clientFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      params.set('sortField', sortField)
      params.set('sortDirection', sortDirection)

      const response = await fetch(`/api/invoices?${params.toString()}`)
      const result = await response.json()
      if (result.success) {
        setInvoices(result.data)
        if (result.pagination) {
          updateFromResponse(result.pagination)
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, clientFilter, searchQuery, dateFrom, dateTo, page, pageSize, sortField, sortDirection, updateFromResponse])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  useEffect(() => {
    fetchInvoices()
    fetchClients()
  }, [fetchInvoices])

  const handleDelete = async (id: string) => {
    const invoice = invoices.find((inv) => inv.id === id)
    if (!invoice) return

    // If employee, request approval
    if (!isAdmin) {
      setApprovalModal({
        isOpen: true,
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber
      })
      return
    }

    // If admin, delete directly
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice?',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/invoices/${id}`, {
            method: 'DELETE',
          })
          const result = await response.json()
          if (result.success) {
            fetchInvoices()
          }
        } catch (error) {
          console.error('Error deleting invoice:', error)
        }
      }
    })
  }

  const handleApprovalSubmit = async (reason: string) => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'DELETE_INVOICE',
          entityType: 'invoice',
          entityId: approvalModal.invoiceId,
          entityName: approvalModal.invoiceNumber,
          reason
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Delete request submitted for approval')
      } else {
        throw new Error(result.error || 'Failed to submit approval request')
      }
    } catch (error) {
      console.error('Error submitting approval request:', error)
      throw error
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    // Employees: submit individual approval requests for each selected invoice
    if (!isAdmin) {
      const selectedInvs = invoices.filter(inv => selectedIds.includes(inv.id))
      let submitted = 0
      for (const inv of selectedInvs) {
        try {
          const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType: 'DELETE_INVOICE',
              entityType: 'invoice',
              entityId: inv.id,
              entityName: inv.invoiceNumber,
              reason: `Bulk delete request for ${selectedIds.length} invoice(s)`
            })
          })
          const result = await response.json()
          if (result.success) submitted++
        } catch (error) {
          console.error('Error submitting approval for invoice:', inv.invoiceNumber, error)
        }
      }
      if (submitted > 0) {
        toast.success(`${submitted} delete request(s) submitted for approval`)
      }
      setSelectedIds([])
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Invoices',
      message: `Are you sure you want to delete ${selectedIds.length} invoice(s)?`,
      onConfirm: async () => {
        setDeleting(true)
        try {
          const response = await fetch('/api/invoices', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds }),
          })
          const result = await response.json()
          if (result.success) {
            setSelectedIds([])
            fetchInvoices()
          }
        } catch (error) {
          console.error('Error deleting invoices:', error)
        } finally {
          setDeleting(false)
        }
      }
    })
  }

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? invoices.filter(inv => selectedIds.includes(inv.id))
      : invoices

    const exportData = dataToExport.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.clientName,
      billingPeriodStart: inv.billingPeriodStart,
      billingPeriodEnd: inv.billingPeriodEnd,
      totalAmount: inv.totalAmount,
      balance: inv.balance ?? inv.totalAmount,
      dueDate: inv.dueDate,
      status: inv.status,
    }))

    const filename = selectedIds.length > 0
      ? `invoices-selected-${new Date().toISOString().split('T')[0]}`
      : `invoices-${new Date().toISOString().split('T')[0]}`

    exportToExcel(exportData, invoiceExportColumns, filename)
  }

  const selectedInvoices = invoices.filter(inv => selectedIds.includes(inv.id))

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    resetPage()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setClientFilter('')
    setDateFrom('')
    setDateTo('')
    setActiveQuickFilter(null)
    resetPage()
  }

  const applyQuickFilter = (name: string) => {
    if (activeQuickFilter === name) {
      clearFilters()
      return
    }

    // Reset all filters first
    setSearchQuery('')
    setClientFilter('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')

    const now = new Date()

    if (name === 'overdue30') {
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      setStatusFilter('overdue')
      setDateTo(thirtyDaysAgo.toISOString().split('T')[0])
    } else if (name === 'sentUnpaid') {
      setStatusFilter('sent')
    } else if (name === 'dueThisMonth') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setDateFrom(firstOfMonth.toISOString().split('T')[0])
      setDateTo(lastOfMonth.toISOString().split('T')[0])
    }

    setActiveQuickFilter(name)
    resetPage()
  }

  const quickFilters = [
    {
      label: 'Overdue > 30 days',
      icon: Clock,
      active: activeQuickFilter === 'overdue30',
      onClick: () => applyQuickFilter('overdue30'),
    },
    {
      label: 'Sent but unpaid',
      icon: FileText,
      active: activeQuickFilter === 'sentUnpaid',
      onClick: () => applyQuickFilter('sentUnpaid'),
    },
    {
      label: 'Due this month',
      icon: CalendarDays,
      active: activeQuickFilter === 'dueThisMonth',
      onClick: () => applyQuickFilter('dueThisMonth'),
    },
  ]

  const hasActiveFilters = searchQuery || statusFilter || clientFilter || dateFrom || dateTo

  return (
    <div>
      <Header title="Invoices" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href="/invoices/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowGenerateModal(true)}>
              <Zap className="mr-2 h-4 w-4" />
              Auto-Generate
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSendModal(true)}
                className="text-blue-600 hover:bg-blue-50"
              >
                <Send className="mr-2 h-4 w-4" />
                Mark as Sent ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReminderModal(true)}
                className="text-orange-600 hover:bg-orange-50"
              >
                <Bell className="mr-2 h-4 w-4" />
                Send Reminder ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRegenerateModal(true)}
                className="text-amber-600 hover:bg-amber-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate PDFs ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="text-red-600 hover:bg-red-50"
              >
                {deleting ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="mt-4">
          <QuickFilterBar filters={quickFilters} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-900" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveQuickFilter(null); resetPage() }}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-40"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>

          <Select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-48"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-40"
            placeholder="From"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-40"
            placeholder="To"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Invoice List */}
        <Card className="mt-4">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <InvoiceTable
                invoices={invoices}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}

        {/* Summary */}
        {!loading && totalItems > 0 && (
          <div className="mt-4 text-sm text-gray-900">
            Showing {invoices.length} of {totalItems} invoice(s)
          </div>
        )}
      </div>

      <InvoiceGenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={() => {
          fetchInvoices()
        }}
      />

      <SendInvoiceModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => {
          setSelectedIds([])
          fetchInvoices()
        }}
        selectedInvoices={selectedInvoices}
      />

      <SendReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSuccess={() => {
          setSelectedIds([])
          fetchInvoices()
        }}
        selectedInvoices={selectedInvoices}
      />

      <RegeneratePdfModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onSuccess={() => {
          setSelectedIds([])
          fetchInvoices()
        }}
        selectedInvoices={selectedInvoices}
      />

      {/* Approval Request Modal */}
      <ApprovalRequestModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, invoiceId: '', invoiceNumber: '' })}
        actionType="DELETE_INVOICE"
        entityType="invoice"
        entityId={approvalModal.invoiceId}
        entityName={approvalModal.invoiceNumber}
        onSubmit={handleApprovalSubmit}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmDialog.onConfirm()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
