'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface ApprovalRequestModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: string
  entityType: string
  entityId: string
  entityName: string
  onSubmit: (reason: string) => Promise<void>
}

const ACTION_LABELS: Record<string, string> = {
  DELETE_CLIENT: 'Delete Client',
  DELETE_CONTRACT: 'Delete Contract',
  DELETE_INVOICE: 'Delete Invoice',
  DELETE_PAYMENT: 'Delete Payment',
  EDIT_INVOICE_AMOUNT: 'Edit Invoice Amount',
  EDIT_PAYMENT_AMOUNT: 'Edit Payment Amount',
  TERMINATE_CONTRACT: 'Terminate Contract',
  MODIFY_CONTRACT_SIGNER: 'Modify Contract Signer',
  UPDATE_COMPANY_SETTINGS: 'Update Company Settings',
  BATCH_UPLOAD_CLIENTS: 'Batch Upload Clients',
  BATCH_GENERATE_CONTRACTS: 'Batch Generate Contracts',
  EXPORT_FINANCIAL_REPORT: 'Export Financial Report'
}

export default function ApprovalRequestModal({
  isOpen,
  onClose,
  actionType,
  entityType,
  entityId,
  entityName,
  onSubmit
}: ApprovalRequestModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      setError('Please provide a reason for this request')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(reason)
      setReason('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approval Required
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Admin approval is required for this action</p>
                <p className="text-blue-700">
                  Your request will be sent to an administrator for review.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <div className="text-sm text-gray-900 font-medium">
              {ACTION_LABELS[actionType] || actionType}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </label>
            <div className="text-sm text-gray-900">
              {entityName}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is needed..."
              rows={4}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Request Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
