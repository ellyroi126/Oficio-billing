'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { PaymentEvidenceUpload } from './PaymentEvidenceUpload'

interface Invoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  status: string
  client: {
    id: string
    clientName: string
  }
  totalPaid?: number
  balance?: number
}

interface PaymentFormProps {
  onSuccess?: () => void
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'other', label: 'Other' },
]

export function PaymentForm({ onSuccess }: PaymentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedInvoiceId = searchParams.get('invoiceId')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    invoiceId: preselectedInvoiceId || '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    referenceNumber: '',
    notes: '',
    evidencePath: null as string | null,
  })

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    if (preselectedInvoiceId && invoices.length > 0) {
      const invoice = invoices.find(i => i.id === preselectedInvoiceId)
      if (invoice) {
        setSelectedInvoice(invoice)
        // Pre-fill amount with balance
        if (invoice.balance !== undefined) {
          setFormData(prev => ({ ...prev, amount: invoice.balance!.toString() }))
        }
      }
    }
  }, [preselectedInvoiceId, invoices])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      const result = await response.json()
      if (result.success) {
        // Filter to only unpaid invoices
        const unpaidInvoices = result.data.filter(
          (inv: Invoice) => inv.status !== 'paid' || inv.balance! > 0
        )
        setInvoices(unpaidInvoices)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvoiceChange = (invoiceId: string) => {
    setFormData({ ...formData, invoiceId })
    const invoice = invoices.find(i => i.id === invoiceId)
    setSelectedInvoice(invoice || null)
    if (invoice && invoice.balance !== undefined) {
      setFormData(prev => ({ ...prev, invoiceId, amount: invoice.balance!.toString() }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: formData.invoiceId,
          amount: parseFloat(formData.amount),
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          referenceNumber: formData.referenceNumber || null,
          notes: formData.notes || null,
          evidencePath: formData.evidencePath,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/payments')
        }
      } else {
        setError(result.error || 'Failed to record payment')
      }
    } catch (error) {
      setError('Failed to record payment')
      console.error('Error recording payment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Payment Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice <span className="text-red-500">*</span>
            </label>
            <Select
              name="invoiceId"
              value={formData.invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              required
            >
              <option value="">Select an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.client.clientName} ({formatCurrency(invoice.balance || invoice.totalAmount)} due)
                </option>
              ))}
            </Select>
          </div>

          {selectedInvoice && (
            <div className="rounded-md bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700">Invoice Info</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-900">Client:</span>{' '}
                  <span className="font-medium">{selectedInvoice.client.clientName}</span>
                </div>
                <div>
                  <span className="text-gray-900">Invoice Total:</span>{' '}
                  <span className="font-medium">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-900">Balance Due:</span>{' '}
                  <span className="font-medium text-red-600">
                    {formatCurrency(selectedInvoice.balance ?? selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-900">Status:</span>{' '}
                  <span className="font-medium capitalize">{selectedInvoice.status}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max={selectedInvoice?.balance || undefined}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                options={PAYMENT_METHODS}
                placeholder="Select method"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reference Number
              </label>
              <Input
                type="text"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleChange}
                placeholder="Transaction ID, check number, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional notes about this payment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Evidence (Optional)
            </label>
            <PaymentEvidenceUpload
              value={formData.evidencePath}
              onChange={(path) => setFormData({ ...formData, evidencePath: path })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner size="sm" className="mr-2" /> : null}
              Record Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
