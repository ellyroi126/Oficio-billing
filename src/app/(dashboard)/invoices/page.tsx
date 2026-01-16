'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { InvoiceTable, InvoiceSortField, SortDirection } from '@/components/invoices/InvoiceTable'
import { InvoiceGenerateModal } from '@/components/invoices/InvoiceGenerateModal'
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal'
import { RegeneratePdfModal } from '@/components/invoices/RegeneratePdfModal'
import { exportToExcel, invoiceExportColumns } from '@/lib/excel-export'
import { Plus, Zap, Trash2, Search, X, Send, RefreshCw, Download } from 'lucide-react'
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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<InvoiceSortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (clientFilter) params.set('clientId', clientFilter)

      const response = await fetch(`/api/invoices?${params}`)
      const result = await response.json()
      if (result.success) {
        setInvoices(result.data)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, clientFilter])

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
    if (!confirm('Are you sure you want to delete this invoice?')) return

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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} invoice(s)?`)) return

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

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? filteredInvoices.filter(inv => selectedIds.includes(inv.id))
      : filteredInvoices

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
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setClientFilter('')
  }

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter((invoice) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.client.clientName.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'invoiceNumber':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber)
          break
        case 'clientName':
          comparison = a.client.clientName.localeCompare(b.client.clientName)
          break
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount
          break
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const hasActiveFilters = searchQuery || statusFilter || clientFilter

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

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-900" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
              </option>
            ))}
          </Select>

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
                invoices={filteredInvoices}
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

        {/* Summary */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="mt-4 text-sm text-gray-900">
            Showing {filteredInvoices.length} of {invoices.length} invoice(s)
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

      <RegeneratePdfModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onSuccess={() => {
          setSelectedIds([])
          fetchInvoices()
        }}
        selectedInvoices={selectedInvoices}
      />
    </div>
  )
}
