'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import { CreditCard, Trash2, Plus, CheckSquare } from 'lucide-react'

interface UnpaidInvoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string
  billingPeriodStart: string
  billingPeriodEnd: string
  balance: number
  client: {
    id: string
    clientName: string
  }
}

interface PaymentEntry {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  billingPeriod: string
  balance: number
  amount: string
}

export default function BatchPaymentPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Common fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [referenceNumber, setReferenceNumber] = useState('')

  // Filters
  const [clientFilter, setClientFilter] = useState('')
  const [billingPeriodFrom, setBillingPeriodFrom] = useState('')
  const [billingPeriodTo, setBillingPeriodTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected payments
  const [entries, setEntries] = useState<PaymentEntry[]>([])

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices?status=sent&status=pending&status=overdue')
      const result = await response.json()
      if (result.success) {
        const unpaid = result.data
          .map((inv: any) => {
            const totalPaid = (inv.payments || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0)
            const balance = inv.totalAmount - totalPaid
            return { ...inv, balance }
          })
          .filter((inv: any) => inv.balance > 0)
        setInvoices(unpaid)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Get unique client list for filter dropdown
  const clients = useMemo(() => {
    const map = new Map<string, string>()
    invoices.forEach(inv => map.set(inv.client.id, inv.client.clientName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [invoices])

  // Filter available invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => !entries.find(e => e.invoiceId === inv.id))
      .filter(inv => {
        if (clientFilter && inv.client.id !== clientFilter) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (!inv.invoiceNumber.toLowerCase().includes(q) && !inv.client.clientName.toLowerCase().includes(q)) return false
        }
        if (billingPeriodFrom && inv.billingPeriodStart.slice(0, 10) < billingPeriodFrom) return false
        if (billingPeriodTo && inv.billingPeriodEnd.slice(0, 10) > billingPeriodTo) return false
        return true
      })
  }, [invoices, entries, clientFilter, searchQuery, billingPeriodFrom, billingPeriodTo])

  const addInvoice = (invoiceId: string) => {
    if (entries.find(e => e.invoiceId === invoiceId)) return
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) return

    setEntries(prev => [...prev, {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.clientName,
      billingPeriod: `${formatShortDate(inv.billingPeriodStart)} - ${formatShortDate(inv.billingPeriodEnd)}`,
      balance: inv.balance,
      amount: inv.balance.toFixed(2),
    }])
  }

  const addAllFiltered = () => {
    const newEntries = filteredInvoices
      .filter(inv => !entries.find(e => e.invoiceId === inv.id))
      .map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.clientName,
        billingPeriod: `${formatShortDate(inv.billingPeriodStart)} - ${formatShortDate(inv.billingPeriodEnd)}`,
        balance: inv.balance,
        amount: inv.balance.toFixed(2),
      }))
    setEntries(prev => [...prev, ...newEntries])
  }

  const removeEntry = (invoiceId: string) => {
    setEntries(prev => prev.filter(e => e.invoiceId !== invoiceId))
  }

  const clearAllEntries = () => {
    setEntries([])
  }

  const updateAmount = (invoiceId: string, amount: string) => {
    setEntries(prev => prev.map(e =>
      e.invoiceId === invoiceId ? { ...e, amount } : e
    ))
  }

  const totalAmount = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  const handleSubmit = async () => {
    const validEntries = entries.filter(e => parseFloat(e.amount) > 0)
    if (validEntries.length === 0) {
      showToast('error', 'Add at least one payment')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/payments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments: validEntries.map(e => ({
            invoiceId: e.invoiceId,
            amount: parseFloat(e.amount),
          })),
          paymentDate,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
        }),
      })

      const result = await response.json()
      if (result.success) {
        showToast('success', result.message)
        router.push('/payments')
      } else {
        showToast('error', result.error || 'Failed to create payments')
      }
    } catch {
      showToast('error', 'Failed to create payments')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
  }

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <Header title="Batch Payment" showBack />

      <div className="mx-auto max-w-4xl p-6">
        {/* Common Payment Fields */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
                <Input
                  placeholder="Optional"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Selection with Filters */}
        <Card className="mt-4">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Select Invoices</h2>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <Input
                placeholder="Search invoice # or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Input
                type="date"
                value={billingPeriodFrom}
                onChange={(e) => setBillingPeriodFrom(e.target.value)}
                placeholder="Billing from"
                title="Billing period from"
              />
              <Input
                type="date"
                value={billingPeriodTo}
                onChange={(e) => setBillingPeriodTo(e.target.value)}
                placeholder="Billing to"
                title="Billing period to"
              />
            </div>

            {/* Action bar */}
            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} available
                </p>
                <Button variant="outline" size="sm" onClick={addAllFiltered}>
                  <CheckSquare className="mr-1 h-3 w-3" />
                  Add All ({filteredInvoices.length})
                </Button>
              </div>
            )}

            {/* Invoice list */}
            {loading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : filteredInvoices.length === 0 && entries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No unpaid invoices found.</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">All matching invoices have been added below.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => addInvoice(inv.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="text-left">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400">{inv.client.clientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatShortDate(inv.billingPeriodStart)} - {formatShortDate(inv.billingPeriodEnd)}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(inv.balance)}</span>
                      <Plus className="h-4 w-4 text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Entries */}
        {entries.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payments to Record</h2>
                <button
                  onClick={clearAllEntries}
                  className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.invoiceId} className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.invoiceNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{entry.clientName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{entry.billingPeriod} — Balance: {formatCurrency(entry.balance)}</p>
                    </div>
                    <div className="w-36">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={entry.balance}
                        value={entry.amount}
                        onChange={(e) => updateAmount(entry.invoiceId, e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <button
                      onClick={() => removeEntry(entry.invoiceId)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total ({entries.length} payment{entries.length !== 1 ? 's' : ''})</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleSubmit} disabled={submitting || entries.length === 0}>
                  {submitting ? (
                    <><Spinner size="sm" className="mr-2" />Processing...</>
                  ) : (
                    <><CreditCard className="mr-2 h-4 w-4" />Record {entries.length} Payment{entries.length !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
