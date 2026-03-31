'use client'

import { useState } from 'react'
import { Clock, CheckCircle, XCircle, User, Calendar, FileText, ArrowRight } from 'lucide-react'

interface ApprovalRequest {
  id: string
  requestedBy: string
  requestedByName: string
  requestedByEmail: string
  actionType: string
  entityType: string
  entityId: string
  entityName: string | null
  reason: string | null
  metadata: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  createdAt: Date
  updatedAt: Date
}

interface ApprovalCardProps {
  request: ApprovalRequest
  isAdmin?: boolean
  onApprove?: (id: string, notes: string) => Promise<void>
  onReject?: (id: string, notes: string) => Promise<void>
  onCancel?: (id: string) => Promise<void>
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
}

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    label: 'Pending'
  },
  APPROVED: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400',
    label: 'Approved'
  },
  REJECTED: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Rejected'
  },
  CANCELLED: {
    icon: XCircle,
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-800 dark:text-gray-300',
    iconColor: 'text-gray-600 dark:text-gray-400',
    label: 'Cancelled'
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}

function MetadataDisplay({ actionType, metadata }: { actionType: string; metadata: any }) {
  if (!metadata) return null

  switch (actionType) {
    case 'EDIT_INVOICE_AMOUNT': {
      const { newAmount, newVat, newTotal } = metadata
      if (newAmount == null) return null
      return (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 space-y-1">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Proposed Changes</div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 dark:text-blue-400">New Amount</span>
            <span className="font-medium text-blue-800 dark:text-blue-200">{formatCurrency(newAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 dark:text-blue-400">New VAT</span>
            <span className="font-medium text-blue-800 dark:text-blue-200">{formatCurrency(newVat)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-blue-200 dark:border-blue-700 pt-1">
            <span className="font-medium text-blue-700 dark:text-blue-300">New Total</span>
            <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(newTotal)}</span>
          </div>
        </div>
      )
    }

    case 'EDIT_PAYMENT_AMOUNT': {
      const { newPaymentAmount } = metadata
      if (newPaymentAmount == null) return null
      return (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Proposed Changes</div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 dark:text-blue-400">New Payment Amount</span>
            <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(newPaymentAmount)}</span>
          </div>
        </div>
      )
    }

    case 'MODIFY_CONTRACT_SIGNER': {
      const { newSignerName, newSignerPosition } = metadata
      if (!newSignerName) return null
      return (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Proposed Changes</div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 dark:text-blue-400">New Signer</span>
            <span className="font-medium text-blue-800 dark:text-blue-200">{newSignerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-600 dark:text-blue-400">Position</span>
            <span className="font-medium text-blue-800 dark:text-blue-200">{newSignerPosition}</span>
          </div>
        </div>
      )
    }

    case 'UPDATE_COMPANY_SETTINGS': {
      const { newData } = metadata
      if (!newData) return null
      return (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Proposed Settings</div>
          {newData.name && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400">Company</span>
              <span className="font-medium text-blue-800 dark:text-blue-200">{newData.name}</span>
            </div>
          )}
          {newData.contactPerson && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400">Contact</span>
              <span className="font-medium text-blue-800 dark:text-blue-200">{newData.contactPerson}</span>
            </div>
          )}
          {newData.plan && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400">Plan</span>
              <span className="font-medium text-blue-800 dark:text-blue-200">{newData.plan}</span>
            </div>
          )}
        </div>
      )
    }

    default:
      return null
  }
}

export default function ApprovalCard({
  request,
  isAdmin = false,
  onApprove,
  onReject,
  onCancel
}: ApprovalCardProps) {
  const [reviewNotes, setReviewNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)

  const statusConfig = STATUS_CONFIG[request.status]
  const StatusIcon = statusConfig.icon

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleReview = async () => {
    if (!reviewAction) return

    setIsProcessing(true)
    try {
      if (reviewAction === 'approve' && onApprove) {
        await onApprove(request.id, reviewNotes)
      } else if (reviewAction === 'reject' && onReject) {
        await onReject(request.id, reviewNotes)
      }
      setShowReviewForm(false)
      setReviewNotes('')
      setReviewAction(null)
    } catch (error) {
      console.error('Error processing review:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    setIsProcessing(true)
    try {
      await onCancel(request.id)
    } catch (error) {
      console.error('Error cancelling request:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const openReviewForm = (action: 'approve' | 'reject') => {
    setReviewAction(action)
    setShowReviewForm(true)
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border ${statusConfig.borderColor} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${statusConfig.bgColor} border-b ${statusConfig.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
            <span className={`text-sm font-medium ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatDate(request.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {/* Action Type */}
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {ACTION_LABELS[request.actionType] || request.actionType}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{request.entityType}:</span> {request.entityName || 'N/A'}
          </div>
        </div>

        {/* Requester Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>
            Requested by <span className="font-medium text-gray-900">{request.requestedByName}</span>
          </span>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{request.reason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Proposed Changes (metadata) */}
        <MetadataDisplay actionType={request.actionType} metadata={request.metadata} />

        {/* Review Info */}
        {(request.status === 'APPROVED' || request.status === 'REJECTED') && request.reviewedByName && (
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>
                Reviewed by <span className="font-medium text-gray-900">{request.reviewedByName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(request.reviewedAt)}</span>
            </div>
            {request.reviewNotes && (
              <div className="bg-gray-50 rounded-md p-3">
                <div className="text-xs font-medium text-gray-700 mb-1">Review Notes</div>
                <div className="text-sm text-gray-600">{request.reviewNotes}</div>
              </div>
            )}
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="border-t border-gray-200 pt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes for your decision..."
                rows={3}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReviewForm(false)
                  setReviewNotes('')
                  setReviewAction(null)
                }}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={isProcessing}
                className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Processing...' : reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {request.status === 'PENDING' && !showReviewForm && (
          <div className="flex gap-2 pt-2">
            {isAdmin ? (
              <>
                <button
                  onClick={() => openReviewForm('approve')}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve
                </button>
                <button
                  onClick={() => openReviewForm('reject')}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Request'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
