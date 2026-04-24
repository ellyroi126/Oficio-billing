import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { executeApprovedAction } from '@/lib/executeApprovedAction'
import { getRequestMetadata, createAuditLog } from '@/lib/auditLog'
import { createApprovalOutcomeNotification } from '@/lib/notifications'

/**
 * POST /api/approvals/[id]/approve
 * Approve an approval request (Admin only)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { reviewNotes } = body

    // Fetch the approval request
    const request = await prisma.approvalRequest.findUnique({
      where: { id }
    })

    if (!request) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request already ${request.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Prevent self-approval
    if (request.requestedBy === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot approve your own request' },
        { status: 403 }
      )
    }

    const metadata = getRequestMetadata(req)

    // Wrap status update + action execution in transaction
    // If execution fails, status stays PENDING (not stuck as APPROVED)
    const approvedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: auth.user!.id,
          reviewedByName: auth.user!.name || auth.user!.email,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      })

      // Execute the approved action inside the same transaction context
      // Note: executeApprovedAction uses prisma directly (not tx), so the action
      // itself is separate. But the status update will roll back if this throws.
      await executeApprovedAction(
        request,
        {
          id: auth.user!.id,
          name: auth.user!.name || auth.user!.email,
          email: auth.user!.email,
        },
        metadata
      )

      return updated
    })

    // Notify the requester (non-blocking, after successful transaction)
    createApprovalOutcomeNotification(request, 'APPROVED').catch(console.error)

    // Log the approval action
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.name || auth.user.email,
      userEmail: auth.user.email,
      userRole: auth.user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'APPROVE',
      actionCategory: 'APPROVAL',
      entityType: 'approval_request',
      entityId: request.id,
      entityName: `${request.actionType} - ${request.entityName}`,
      approvalRequestId: request.id,
      wasApproved: true,
      changesSummary: `Approved ${request.actionType} for ${request.entityName}`,
      reason: reviewNotes,
      ...metadata,
    })

    return NextResponse.json({
      success: true,
      data: approvedRequest,
      message: 'Approval request approved and executed successfully',
    })
  } catch (error) {
    console.error('Error approving request:', error)
    return NextResponse.json(
      { error: 'Failed to approve request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
