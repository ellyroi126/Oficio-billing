import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { executeApprovedAction } from '@/lib/executeApprovedAction'
import { getRequestMetadata, createAuditLog } from '@/lib/auditLog'

/**
 * POST /api/approvals/[id]/approve
 * Approve an approval request (Admin only)
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { reviewNotes } = body

    // Fetch the approval request
    const request = await prisma.approvalRequest.findUnique({
      where: { id: params.id }
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

    // Update request status to APPROVED
    const approvedRequest = await prisma.approvalRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedBy: auth.user.id,
        reviewedByName: auth.user.name || auth.user.email,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      }
    })

    // Get request metadata for audit log
    const metadata = getRequestMetadata(req)

    // Execute the approved action
    await executeApprovedAction(
      request,
      {
        id: auth.user.id,
        name: auth.user.name || auth.user.email,
        email: auth.user.email
      },
      metadata
    )

    // Log the approval action
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.name || auth.user.email,
      userEmail: auth.user.email,
      userRole: 'ADMIN',
      action: 'APPROVE',
      actionCategory: 'APPROVAL',
      entityType: 'approval_request',
      entityId: request.id,
      entityName: `${request.actionType} - ${request.entityName}`,
      approvalRequestId: request.id,
      wasApproved: true,
      changesSummary: `Approved ${request.actionType} for ${request.entityName}`,
      reason: reviewNotes,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      data: approvedRequest,
      message: 'Approval request approved and executed successfully'
    })
  } catch (error) {
    console.error('Error approving request:', error)
    return NextResponse.json(
      { error: 'Failed to approve request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
