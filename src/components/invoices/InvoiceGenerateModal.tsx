'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { X, FileText, CheckCircle, AlertCircle, Users } from 'lucide-react'

interface Client {
  id: string
  clientName: string
  billingTerms: string
  rentalRate: number
  vatInclusive: boolean
  startDate: string
  endDate: string
}

interface GeneratedInvoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  dueDate: string
  client?: {
    clientName: string
  }
}

interface InvoiceGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InvoiceGenerateModal({ isOpen, onClose, onSuccess }: InvoiceGenerateModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [upToDate, setUpToDate] = useState('')
  const [includeFuture, setIncludeFuture] = useState(false)
  const [hasWithholdingTax, setHasWithholdingTax] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    invoices: GeneratedInvoice[]
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      // Set default upToDate to today
      setUpToDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      if (data.success) {
        setClients(data.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedClientId) return

    setGenerating(true)
    setResult(null)

    try {
      // Check if generating for all clients
      const isAllClients = selectedClientId === 'all'

      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: isAllClients ? undefined : selectedClientId,
          allClients: isAllClients,
          upToDate,
          includeFuture,
          hasWithholdingTax,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          invoices: data.data || [],
        })
        if (data.data && data.data.length > 0) {
          onSuccess()
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to generate invoices',
          invoices: [],
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to generate invoices',
        invoices: [],
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    setSelectedClientId('')
    setResult(null)
    setIncludeFuture(false)
    setHasWithholdingTax(false)
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const selectedClient = selectedClientId !== 'all' ? clients.find(c => c.id === selectedClientId) : null
  const isAllClients = selectedClientId === 'all'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Invoices</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div
              className={`flex items-start gap-3 rounded-md p-4 ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>

            {result.invoices.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Invoice #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Client
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Period
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-900" />
                            {invoice.invoiceNumber}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {invoice.client?.clientName || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {formatDate(invoice.billingPeriodStart)} -{' '}
                          {formatDate(invoice.billingPeriodEnd)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setResult(null)}>
                Generate More
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Select Client <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Choose a client</option>
                <option value="all">All Active Clients (Bulk Generate)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.clientName}
                  </option>
                ))}
              </Select>
            </div>

            {isAllClients && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-800">
                    Bulk Generation Mode
                  </h3>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  This will generate invoices for all {clients.length} active clients
                  based on their individual billing terms and rates.
                </p>
              </div>
            )}

            {selectedClient && (
              <div className="rounded-md bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Client Billing Info
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-900">
                  <div>
                    <span className="font-medium">Billing Terms:</span>{' '}
                    <span>{selectedClient.billingTerms}</span>
                  </div>
                  <div>
                    <span className="font-medium">Rate:</span>{' '}
                    <span>
                      {formatCurrency(selectedClient.rentalRate)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">VAT:</span>{' '}
                    <span>
                      {selectedClient.vatInclusive ? 'Inclusive' : 'Exclusive'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Contract:</span>{' '}
                    <span>
                      {formatDate(selectedClient.startDate)} -{' '}
                      {formatDate(selectedClient.endDate)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Generate Invoices Up To
              </label>
              <Input
                type="date"
                value={upToDate}
                onChange={(e) => setUpToDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-900">
                Only generate invoices up to this billing date
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasWithholdingTax"
                checked={hasWithholdingTax}
                onChange={(e) => setHasWithholdingTax(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hasWithholdingTax" className="text-sm text-gray-900">
                Apply 5% Withholding Tax (EWT)
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeFuture"
                  checked={includeFuture}
                  onChange={(e) => setIncludeFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeFuture" className="text-sm text-gray-900">
                  Include future billing periods
                </label>
              </div>
              <p className="ml-6 text-xs text-gray-900">
                Generate invoices for billing periods that have not yet started
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedClientId || generating}
              >
                {generating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : isAllClients ? (
                  'Generate All Invoices'
                ) : (
                  'Generate Invoices'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
