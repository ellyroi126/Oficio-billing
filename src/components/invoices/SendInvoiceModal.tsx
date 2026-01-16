'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { X, Send, CheckCircle, AlertCircle, Mail } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  client: {
    clientName: string
  }
}

interface SendResult {
  invoiceId: string
  invoiceNumber: string
  success: boolean
  error?: string
  emailSent?: boolean
}

interface SendInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedInvoices: Invoice[]
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInvoices,
}: SendInvoiceModalProps) {
  const [sending, setSending] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    results: SendResult[]
  } | null>(null)

  const handleSend = async () => {
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedInvoices.map((inv) => inv.id),
          sendEmail,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          results: data.results || [],
        })
        onSuccess()
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send invoices',
          results: [],
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Failed to send invoices',
        results: [],
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setSendEmail(true)
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send Invoices</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
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

            {result.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Invoice #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.results.map((res) => (
                      <tr key={res.invoiceId}>
                        <td className="px-3 py-2">{res.invoiceNumber}</td>
                        <td className="px-3 py-2">
                          {res.success ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {res.emailSent ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Mail className="h-4 w-4" /> Delivered
                            </span>
                          ) : (
                            <span className="text-gray-500">Not sent</span>
                          )}
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
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to mark {selectedInvoices.length} invoice(s) as
              sent. Only pending or overdue invoices will be processed.
            </p>

            <div className="max-h-48 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-900">
                      Invoice #
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-900">
                      Client
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-900">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2">{invoice.invoiceNumber}</td>
                      <td className="px-3 py-2">{invoice.client.clientName}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendEmail" className="text-sm text-blue-800">
                  <Mail className="mr-1 inline h-4 w-4" />
                  Send email with PDF attachment to clients
                </label>
              </div>
              <p className="ml-6 mt-1 text-xs text-blue-700">
                Emails will be sent to the primary contact of each client.
                Requires RESEND_API_KEY to be configured.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
