'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface EditPaymentAmountModalProps {
  isOpen: boolean
  onClose: () => void
  paymentId: string
  invoiceNumber: string
  currentAmount: number
  invoiceTotalAmount: number
  invoiceTotalPaid: number
  isAdmin: boolean
  onSuccess: () => void
}

export default function EditPaymentAmountModal({
  isOpen,
  onClose,
  paymentId,
  invoiceNumber,
  currentAmount,
  invoiceTotalAmount,
  invoiceTotalPaid,
  isAdmin,
  onSuccess,
}: EditPaymentAmountModalProps) {
  const [newAmount, setNewAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setNewAmount(currentAmount.toString())
      setReason('')
      setError(null)
    }
  }, [isOpen, currentAmount])

  if (!isOpen) return null

  const parsedAmount = parseFloat(newAmount)
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0

  // Max allowed = invoice total - other payments (excluding current one)
  const otherPayments = invoiceTotalPaid - currentAmount
  const maxAllowed = invoiceTotalAmount - otherPayments
  const exceedsMax = isValidAmount && parsedAmount > maxAllowed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidAmount || exceedsMax) return
    if (!isAdmin && !reason.trim()) {
      setError('Please provide a reason for this change')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isAdmin) {
        const response = await fetch(`/api/payments/${paymentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parsedAmount }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to update payment amount')
      } else {
        const response = await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType: 'EDIT_PAYMENT_AMOUNT',
            entityType: 'payment',
            entityId: paymentId,
            entityName: `Payment for ${invoiceNumber}`,
            reason,
            metadata: {
              newPaymentAmount: parsedAmount,
            },
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to submit approval request')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Edit Payment Amount
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-700 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Current Amount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(currentAmount)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-500 dark:text-gray-400">Invoice Total</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(invoiceTotalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Max Allowed</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(maxAllowed)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAllowed}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {exceedsMax && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Amount cannot exceed {formatCurrency(maxAllowed)}
              </p>
            )}
          </div>

          {!isAdmin && (
            <div className="mb-4">
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This change requires admin approval.
                  </p>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this amount needs to change..."
                rows={3}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none text-sm"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValidAmount || exceedsMax}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting && <Spinner size="sm" className="mr-2" />}
              {isAdmin ? 'Update Amount' : 'Request Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
