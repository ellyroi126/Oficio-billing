import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { getRequestMetadata, createAuditLog } from '@/lib/auditLog'
import { createApprovalOutcomeNotification } from '@/lib/notifications'

/**
 * POST /api/approvals/[id]/reject
 * Reject an approval request (Admin only)
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

    // Update request status to REJECTED
    const rejectedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: auth.user.id,
        reviewedByName: auth.user.name || auth.user.email,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      }
    })

    // Notify the requester (non-blocking)
    createApprovalOutcomeNotification(request, 'REJECTED').catch(console.error)

    // Get request metadata for audit log
    const metadata = getRequestMetadata(req)

    // Log the rejection action
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.name || auth.user.email,
      userEmail: auth.user.email,
      userRole: auth.user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'REJECT',
      actionCategory: 'APPROVAL',
      entityType: 'approval_request',
      entityId: request.id,
      entityName: `${request.actionType} - ${request.entityName}`,
      approvalRequestId: request.id,
      wasApproved: false,
      changesSummary: `Rejected ${request.actionType} for ${request.entityName}`,
      reason: reviewNotes,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      data: rejectedRequest,
      message: 'Approval request rejected successfully'
    })
  } catch (error) {
    console.error('Error rejecting request:', error)
    return NextResponse.json(
      { error: 'Failed to reject request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
