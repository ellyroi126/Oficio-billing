'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { X, RefreshCw, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  client: {
    clientName: string
  }
}

interface RegenerateResult {
  invoiceId: string
  invoiceNumber: string
  success: boolean
  error?: string
}

interface RegeneratePdfModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedInvoices: Invoice[]
}

export function RegeneratePdfModal({
  isOpen,
  onClose,
  onSuccess,
  selectedInvoices,
}: RegeneratePdfModalProps) {
  const [regenerating, setRegenerating] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    results: RegenerateResult[]
  } | null>(null)

  const handleRegenerate = async () => {
    setRegenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/invoices/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedInvoices.map((inv) => inv.id),
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
          message: data.error || 'Failed to regenerate PDFs',
          results: [],
        })
      }
    } catch {
      setResult({
        success: false,
        message: 'Failed to regenerate PDFs',
        results: [],
      })
    } finally {
      setRegenerating(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Regenerate PDFs</h2>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.results.map((res) => (
                      <tr key={res.invoiceId}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            {res.invoiceNumber}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {res.success ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" /> Regenerated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" /> Failed
                            </span>
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
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-medium text-amber-800">
                  PDF Regeneration
                </h3>
              </div>
              <p className="mt-2 text-sm text-amber-700">
                This will regenerate the PDF files for {selectedInvoices.length}{' '}
                invoice(s) using the current template. The old PDFs will be
                replaced.
              </p>
            </div>

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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-3 py-2">{invoice.client.clientName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate PDFs
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
