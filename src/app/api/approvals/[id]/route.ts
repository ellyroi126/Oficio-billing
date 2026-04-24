import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'

// DELETE - Cancel a pending approval request (requester only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user
    const { id } = await params

    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
    })

    if (!approvalRequest) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })
    }

    // Only the requester can cancel their own request
    if (approvalRequest.requestedBy !== user.id) {
      return NextResponse.json({ success: false, error: 'You can only cancel your own requests' }, { status: 403 })
    }

    // Can only cancel pending requests
    if (approvalRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a request that is already ${approvalRequest.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    await prisma.approvalRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'APPROVAL',
      entityType: 'approval_request',
      entityId: id,
      entityName: approvalRequest.entityName || undefined,
      approvalRequestId: id,
      changesSummary: `Cancelled approval request for ${approvalRequest.actionType} on ${approvalRequest.entityName || approvalRequest.entityId}`,
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling approval request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel request' },
      { status: 500 }
    )
  }
}
