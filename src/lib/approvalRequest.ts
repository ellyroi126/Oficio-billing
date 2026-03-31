import { prisma } from '@/lib/prisma'

type ApprovalActionType =
  | 'DELETE_CLIENT'
  | 'DELETE_CONTRACT'
  | 'DELETE_INVOICE'
  | 'DELETE_PAYMENT'
  | 'EDIT_INVOICE_AMOUNT'
  | 'EDIT_PAYMENT_AMOUNT'
  | 'TERMINATE_CONTRACT'
  | 'MODIFY_CONTRACT_SIGNER'
  | 'UPDATE_COMPANY_SETTINGS'

interface CreateApprovalParams {
  requestedBy: string
  requestedByName: string
  requestedByEmail: string
  actionType: ApprovalActionType
  entityType: string
  entityId: string
  entityName?: string
  reason?: string
  metadata?: any
}

/**
 * Create an approval request
 * Used when employees want to perform sensitive operations
 */
export async function createApprovalRequest(params: CreateApprovalParams) {
  return await prisma.approvalRequest.create({
    data: {
      requestedBy: params.requestedBy,
      requestedByName: params.requestedByName,
      requestedByEmail: params.requestedByEmail,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName || null,
      reason: params.reason || null,
      metadata: params.metadata || null,
      status: 'PENDING'
    }
  })
}

/**
 * Approve an approval request
 */
export async function approveRequest(
  requestId: string,
  adminUser: { id: string; name: string },
  notes?: string
) {
  return await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedByName: adminUser.name,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    }
  })
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  requestId: string,
  adminUser: { id: string; name: string },
  notes?: string
) {
  return await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedBy: adminUser.id,
      reviewedByName: adminUser.name,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    }
  })
}

/**
 * Cancel an approval request (by the requester)
 */
export async function cancelRequest(requestId: string, userId: string) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId }
  })

  // Can only cancel own pending requests
  if (!request || request.requestedBy !== userId || request.status !== 'PENDING') {
    throw new Error('Cannot cancel this request')
  }

  return await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' }
  })
}

/**
 * Get pending approval count (for notifications)
 */
export async function getPendingApprovalCount() {
  return await prisma.approvalRequest.count({
    where: { status: 'PENDING' }
  })
}
