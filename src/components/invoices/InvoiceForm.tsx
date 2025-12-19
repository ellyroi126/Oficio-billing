'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface Client {
  id: string
  clientName: string
  rentalRate: number
  billingTerms: string
  vatInclusive: boolean
}

interface InvoiceFormProps {
  onSuccess?: () => void
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    clientId: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    dueDate: '',
    amount: '', // Optional - will use client rate if empty
    hasWithholdingTax: false,
  })

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (clientId: string) => {
    setFormData({ ...formData, clientId })
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Calculate due date (3 days before billing period start)
  const calculateDueDate = (billingPeriodStart: string) => {
    if (!billingPeriodStart) return ''
    const startDate = new Date(billingPeriodStart)
    startDate.setDate(startDate.getDate() - 3)
    return startDate.toISOString().split('T')[0]
  }

  const handleBillingPeriodStartChange = (value: string) => {
    const dueDate = calculateDueDate(value)

    // Calculate end date based on billing terms
    let endDate = ''
    if (value && selectedClient) {
      const start = new Date(value)
      const monthsMap: Record<string, number> = {
        'Monthly': 1,
        'Quarterly': 3,
        'Semi-Annual': 6,
        'Annual': 12,
      }
      const months = monthsMap[selectedClient.billingTerms] || 1
      const end = new Date(start)
      end.setMonth(end.getMonth() + months)
      end.setDate(end.getDate() - 1)
      endDate = end.toISOString().split('T')[0]
    }

    setFormData({
      ...formData,
      billingPeriodStart: value,
      billingPeriodEnd: endDate,
      dueDate,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          billingPeriodStart: formData.billingPeriodStart,
          billingPeriodEnd: formData.billingPeriodEnd,
          dueDate: formData.dueDate,
          hasWithholdingTax: formData.hasWithholdingTax,
          ...(formData.amount && { amount: parseFloat(formData.amount) }),
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/invoices')
        }
      } else {
        setError(result.error || 'Failed to create invoice')
      }
    } catch (error) {
      setError('Failed to create invoice')
      console.error('Error creating invoice:', error)
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
          <h2 className="text-lg font-semibold">Invoice Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </label>
            <Select
              name="clientId"
              value={formData.clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName}
                </option>
              ))}
            </Select>
          </div>

          {selectedClient && (
            <div className="rounded-md bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700">Client Billing Info</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-900">Rental Rate:</span>{' '}
                  <span className="font-medium">{formatCurrency(selectedClient.rentalRate)}</span>
                </div>
                <div>
                  <span className="text-gray-900">Billing Terms:</span>{' '}
                  <span className="font-medium">{selectedClient.billingTerms}</span>
                </div>
                <div>
                  <span className="text-gray-900">VAT:</span>{' '}
                  <span className="font-medium">{selectedClient.vatInclusive ? 'Inclusive' : 'Exclusive'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Billing Period Start <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="billingPeriodStart"
                value={formData.billingPeriodStart}
                onChange={(e) => handleBillingPeriodStartChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Billing Period End <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="billingPeriodEnd"
                value={formData.billingPeriodEnd}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
            />
            <p className="mt-1 text-xs text-gray-900">
              Auto-calculated as 3 days before billing period start
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custom Amount (Optional)
            </label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder={selectedClient ? `Default: ${formatCurrency(selectedClient.rentalRate)}` : 'Enter amount'}
              step="0.01"
              min="0"
            />
            <p className="mt-1 text-xs text-gray-900">
              Leave empty to use client&apos;s rental rate
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasWithholdingTax"
              checked={formData.hasWithholdingTax}
              onChange={(e) => setFormData({ ...formData, hasWithholdingTax: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hasWithholdingTax" className="text-sm text-gray-700">
              Apply 5% Withholding Tax (EWT)
            </label>
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
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
