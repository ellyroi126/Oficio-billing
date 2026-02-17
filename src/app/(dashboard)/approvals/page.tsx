'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import ApprovalCard from '@/components/approvals/ApprovalCard'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

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

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all'

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = statusFilter === 'all'
        ? '/api/approvals'
        : `/api/approvals?status=${statusFilter}`

      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch requests')
      }

      setRequests(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchRequests()
    }
  }, [session, statusFilter])

  const handleApprove = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes: notes })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve request')
      }

      toast.success('Request approved successfully')
      // Refresh list
      await fetchRequests()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve request'
      toast.error(errorMessage)
      throw err
    }
  }

  const handleReject = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes: notes })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject request')
      }

      toast.success('Request rejected successfully')
      // Refresh list
      await fetchRequests()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject request'
      toast.error(errorMessage)
      throw err
    }
  }

  if (status === 'loading' || (session?.user?.role !== 'ADMIN' && status !== 'unauthenticated')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Approval Requests
          </h1>
          <p className="text-gray-600">
            Review and manage pending approval requests from employees
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Pending</span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Approved</span>
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Rejected</span>
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-3">
              <Clock className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No {statusFilter.toLowerCase()} requests
            </h3>
            <p className="text-sm text-gray-600">
              {statusFilter === 'PENDING'
                ? 'All approval requests have been processed'
                : `No ${statusFilter.toLowerCase()} approval requests found`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                isAdmin={true}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
