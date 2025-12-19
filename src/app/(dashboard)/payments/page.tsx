'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { PaymentTable, PaymentSortField, SortDirection } from '@/components/payments/PaymentTable'
import { Plus, Trash2, Search, X } from 'lucide-react'
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<PaymentSortField>('paymentDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (clientFilter) params.set('clientId', clientFilter)

      const response = await fetch(`/api/payments?${params}`)
      const result = await response.json()
      if (result.success) {
        setPayments(result.data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [clientFilter])

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

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
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} payment(s)?`)) return

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
  }

  const handleSort = (field: PaymentSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setMethodFilter('')
    setClientFilter('')
  }

  // Filter and sort payments
  const filteredPayments = payments
    .filter((payment) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          payment.invoice.invoiceNumber.toLowerCase().includes(query) ||
          payment.invoice.client.clientName.toLowerCase().includes(query) ||
          (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(query))
        )
      }
      return true
    })
    .filter((payment) => {
      // Method filter
      if (methodFilter) {
        return payment.paymentMethod === methodFilter
      }
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'paymentDate':
          comparison = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
          break
        case 'clientName':
          comparison = a.invoice.client.clientName.localeCompare(b.invoice.client.clientName)
          break
        case 'invoiceNumber':
          comparison = a.invoice.invoiceNumber.localeCompare(b.invoice.invoiceNumber)
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'paymentMethod':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const hasActiveFilters = searchQuery || methodFilter || clientFilter

  // Calculate total payments
  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
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
              Delete Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
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

        {/* Payment List */}
        <Card className="mt-4">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <PaymentTable
                payments={filteredPayments}
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
        {!loading && filteredPayments.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredPayments.length} of {payments.length} payment(s)
            </span>
            <span className="font-medium text-green-600">
              Total: {formatCurrency(totalPayments)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
