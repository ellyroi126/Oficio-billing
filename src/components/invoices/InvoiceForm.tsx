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
  startDate: string
  endDate: string
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

  // Date helpers that operate entirely in UTC so that billing-period math does not
  // shift by a day in timezones west of UTC. The API stores dates at UTC midnight,
  // and <input type="date"> exchanges plain "YYYY-MM-DD" strings, so we normalise to
  // a UTC calendar date and format back with the UTC components.
  const toUtcDate = (value: string | Date): Date => {
    if (value instanceof Date) {
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
    }
    const [year, month, day] = value.split('T')[0].split('-').map(Number)
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
  }
  const formatUtcDate = (d: Date): string => d.toISOString().split('T')[0]
  const monthsForTerms = (billingTerms: string): number =>
    ({ Monthly: 1, Quarterly: 3, 'Semi-Annual': 6, Annual: 12 } as Record<string, number>)[billingTerms] || 1

  // Calculate the next billing period based on client's start date and billing terms
  const calculateNextBillingPeriod = (client: Client) => {
    const months = monthsForTerms(client.billingTerms)
    const clientStart = toUtcDate(client.startDate)
    const now = toUtcDate(new Date())

    // Find the current/next billing period
    let periodStart = new Date(clientStart)
    while (periodStart < now) {
      const nextStart = new Date(periodStart)
      nextStart.setUTCMonth(nextStart.getUTCMonth() + months)
      if (nextStart > now) break
      periodStart = nextStart
    }

    // Calculate period end (last day of the period)
    const periodEnd = new Date(periodStart)
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + months)
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 1)

    return {
      start: formatUtcDate(periodStart),
      end: formatUtcDate(periodEnd),
    }
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)

    if (client) {
      const period = calculateNextBillingPeriod(client)
      const dueDate = calculateDueDate(period.start)
      setFormData({
        ...formData,
        clientId,
        billingPeriodStart: period.start,
        billingPeriodEnd: period.end,
        dueDate,
      })
    } else {
      setFormData({
        ...formData,
        clientId,
        billingPeriodStart: '',
        billingPeriodEnd: '',
        dueDate: '',
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Calculate due date (3 days before billing period start)
  const calculateDueDate = (billingPeriodStart: string) => {
    if (!billingPeriodStart) return ''
    const startDate = toUtcDate(billingPeriodStart)
    startDate.setUTCDate(startDate.getUTCDate() - 3)
    return formatUtcDate(startDate)
  }

  const handleBillingPeriodStartChange = (value: string) => {
    const dueDate = calculateDueDate(value)

    // Calculate end date based on billing terms
    let endDate = ''
    if (value && selectedClient) {
      const start = toUtcDate(value)
      const months = monthsForTerms(selectedClient.billingTerms)
      const end = new Date(start)
      end.setUTCMonth(end.getUTCMonth() + months)
      end.setUTCDate(end.getUTCDate() - 1)
      endDate = formatUtcDate(end)
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
            <label className="block text-sm font-medium text-gray-900">
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
              <h3 className="text-sm font-medium text-gray-900">Client Billing Info</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-900">
                <div>
                  <span className="font-medium">Rental Rate:</span>{' '}
                  <span>{formatCurrency(selectedClient.rentalRate)}</span>
                </div>
                <div>
                  <span className="font-medium">Billing Terms:</span>{' '}
                  <span>{selectedClient.billingTerms}</span>
                </div>
                <div>
                  <span className="font-medium">VAT:</span>{' '}
                  <span>{selectedClient.vatInclusive ? 'Inclusive' : 'Exclusive'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">
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
              <label className="block text-sm font-medium text-gray-900">
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
            <label className="block text-sm font-medium text-gray-900">
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
            <label className="block text-sm font-medium text-gray-900">
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
            <label htmlFor="hasWithholdingTax" className="text-sm text-gray-900">
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
