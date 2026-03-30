'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { X, Bell, CheckCircle, AlertCircle } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  totalAmount: number
  dueDate: string
  client: {
    clientName: string
  }
}

interface ReminderResult {
  invoiceId: string
  invoiceNumber: string
  success: boolean
  error?: string
}

interface SendReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedInvoices: Invoice[]
}

export function SendReminderModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInvoices,
}: SendReminderModalProps) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    results: ReminderResult[]
  } | null>(null)

  const overdueInvoices = selectedInvoices.filter(inv => new Date(inv.dueDate) < new Date())

  const handleSend = async () => {
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/invoices/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: overdueInvoices.map(inv => inv.id),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({ success: true, message: data.message, results: data.results || [] })
        onSuccess()
      } else {
        setResult({ success: false, message: data.error || 'Failed to send reminders', results: [] })
      }
    } catch {
      setResult({ success: false, message: 'Failed to send reminders', results: [] })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
  }

  const getDaysOverdue = (dueDate: string) => {
    const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Send Overdue Reminders</h2>
          <button onClick={handleClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 rounded-md p-4 ${result.success ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className={`font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {result.message}
              </p>
            </div>

            {result.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Invoice #</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                              <AlertCircle className="h-4 w-4" /> {res.error || 'Failed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {overdueInvoices.length === 0 ? (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4 text-sm text-yellow-800 dark:text-yellow-200">
                None of the selected invoices are overdue. Only overdue invoices can receive reminders.
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send payment reminders to {overdueInvoices.length} overdue invoice(s):
                </p>

                <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Invoice #</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">Client</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">Amount</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {overdueInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-3 py-2">{invoice.invoiceNumber}</td>
                          <td className="px-3 py-2">{invoice.client.clientName}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(invoice.totalAmount)}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">
                            {getDaysOverdue(invoice.dueDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sending || overdueInvoices.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {sending ? (
                  <><Spinner size="sm" className="mr-2" />Sending...</>
                ) : (
                  <><Bell className="mr-2 h-4 w-4" />Send Reminders</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
