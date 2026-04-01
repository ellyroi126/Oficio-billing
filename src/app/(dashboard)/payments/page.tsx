'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { PaymentTable, PaymentSortField, SortDirection } from '@/components/payments/PaymentTable'
import ApprovalRequestModal from '@/components/approvals/ApprovalRequestModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRole } from '@/contexts/RoleContext'
import { useToast } from '@/contexts/ToastContext'
import { exportToExcel, paymentExportColumns } from '@/lib/excel-export'
import { QuickFilterBar } from '@/components/ui/QuickFilterBar'
import { Plus, Trash2, Search, X, Download, Layers, CalendarDays, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  evidencePath: string | null
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    totalAmount: number
    client: {
      id: string
      clientName: string
    }
  }
}

interface Client {
  id: string
  clientName: string
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'other', label: 'Other' },
]

export default function PaymentsPage() {
  const { isAdmin } = useRole()
  const toast = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean
    paymentId: string
    paymentReference: string
  }>({ isOpen: false, paymentId: '', paymentReference: '' })
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)

  // Sorting
  const [sortField, setSortField] = useState<PaymentSortField>('paymentDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination
  const { page, pageSize, totalItems, totalPages, setPage, setPageSize, updateFromResponse, resetPage } = usePagination()

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (clientFilter) params.set('clientId', clientFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (methodFilter) params.set('paymentMethod', methodFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      params.set('sortField', sortField)
      params.set('sortDirection', sortDirection)

      const response = await fetch(`/api/payments?${params}`)
      const result = await response.json()
      if (result.success) {
        setPayments(result.data)
        if (result.pagination) {
          updateFromResponse(result.pagination)
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [clientFilter, searchQuery, methodFilter, dateFrom, dateTo, page, pageSize, sortField, sortDirection, updateFromResponse])

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
    fetchPayments()
    fetchClients()
  }, [fetchPayments])

  // Reset selectedIds when page changes
  useEffect(() => {
    setSelectedIds([])
  }, [page])

  const handleDelete = async (id: string) => {
    const payment = payments.find((p) => p.id === id)
    if (!payment) return

    // If employee, request approval
    if (!isAdmin) {
      setApprovalModal({
        isOpen: true,
        paymentId: id,
        paymentReference: payment.referenceNumber || `Payment ${payment.amount}`
      })
      return
    }

    // If admin, delete directly
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment?',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/payments/${id}`, {
            method: 'DELETE',
          })
          const result = await response.json()
          if (result.success) {
            fetchPayments()
          }
        } catch (error) {
          console.error('Error deleting payment:', error)
        }
      },
    })
    return
  }

  const handleApprovalSubmit = async (reason: string) => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'DELETE_PAYMENT',
          entityType: 'payment',
          entityId: approvalModal.paymentId,
          entityName: approvalModal.paymentReference,
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

    // Employees: submit individual approval requests for each selected payment
    if (!isAdmin) {
      const selectedPmts = payments.filter(p => selectedIds.includes(p.id))
      let submitted = 0
      for (const pmt of selectedPmts) {
        try {
          const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actionType: 'DELETE_PAYMENT',
              entityType: 'payment',
              entityId: pmt.id,
              entityName: pmt.referenceNumber || `Payment ${pmt.amount}`,
              reason: `Bulk delete request for ${selectedIds.length} payment(s)`
            })
          })
          const result = await response.json()
          if (result.success) submitted++
        } catch (error) {
          console.error('Error submitting approval for payment:', pmt.id, error)
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
      title: 'Delete Payments',
      message: `Are you sure you want to delete ${selectedIds.length} payment(s)?`,
      onConfirm: async () => {
        setDeleting(true)
        try {
          const response = await fetch('/api/payments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds }),
          })
          const result = await response.json()
          if (result.success) {
            setSelectedIds([])
            fetchPayments()
          }
        } catch (error) {
          console.error('Error deleting payments:', error)
        } finally {
          setDeleting(false)
        }
      },
    })
    return
  }

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? payments.filter(p => selectedIds.includes(p.id))
      : payments

    const exportData = dataToExport.map(payment => ({
      paymentDate: payment.paymentDate,
      clientName: payment.invoice.client.clientName,
      invoiceNumber: payment.invoice.invoiceNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
    }))

    const filename = selectedIds.length > 0
      ? `payments-selected-${new Date().toISOString().split('T')[0]}`
      : `payments-${new Date().toISOString().split('T')[0]}`

    exportToExcel(exportData, paymentExportColumns, filename)
  }

  const handleSort = (field: PaymentSortField) => {
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
    setMethodFilter('')
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

    setSearchQuery('')
    setMethodFilter('')
    setClientFilter('')
    setDateFrom('')
    setDateTo('')

    const now = new Date()

    if (name === 'thisMonth') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(firstOfMonth.toISOString().split('T')[0])
      setDateTo(now.toISOString().split('T')[0])
    } else if (name === 'bankTransfer') {
      setMethodFilter('bank_transfer')
    }

    setActiveQuickFilter(name)
    resetPage()
  }

  const quickFilters = [
    {
      label: 'This month',
      icon: CalendarDays,
      active: activeQuickFilter === 'thisMonth',
      onClick: () => applyQuickFilter('thisMonth'),
    },
    {
      label: 'Bank transfers',
      icon: Building2,
      active: activeQuickFilter === 'bankTransfer',
      onClick: () => applyQuickFilter('bankTransfer'),
    },
  ]

  const hasActiveFilters = searchQuery || methodFilter || clientFilter || dateFrom || dateTo

  // Calculate total payments
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  return (
    <div>
      <Header title="Payments" />

      <div className="p-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <Link href="/payments/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </Link>
            <Link href="/payments/batch">
              <Button variant="outline">
                <Layers className="mr-2 h-4 w-4" />
                Batch Payment
              </Button>
            </Link>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          {selectedIds.length > 0 && (
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
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveQuickFilter(null); resetPage() }}
              className="pl-10"
            />
          </div>

          <Select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-40"
          >
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
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
            placeholder="From date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setActiveQuickFilter(null); resetPage() }}
            className="w-40"
            placeholder="To date"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Payment List */}
        <Card className="mt-4">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <PaymentTable
                payments={payments}
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
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        {/* Summary */}
        {!loading && payments.length > 0 && (
          <div className="mt-4 flex items-center justify-end text-sm text-gray-900">
            <span className="font-medium text-green-600">
              Total: {formatCurrency(totalPayments)}
            </span>
          </div>
        )}
      </div>

      {/* Approval Request Modal */}
      <ApprovalRequestModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, paymentId: '', paymentReference: '' })}
        actionType="DELETE_PAYMENT"
        entityType="payment"
        entityId={approvalModal.paymentId}
        entityName={approvalModal.paymentReference}
        onSubmit={handleApprovalSubmit}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, isOpen: false })) }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
