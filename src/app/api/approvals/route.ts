import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

/**
 * GET /api/approvals
 * Get approval requests
 * - Admins see all requests
 * - Employees see only their own requests
 */
export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'

  let requests

  if (auth.user.role === 'ADMIN') {
    // Admin sees all requests
    requests = await prisma.approvalRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    // Employee sees only their own requests
    requests = await prisma.approvalRequest.findMany({
      where: {
        requestedBy: auth.user.id,
        status
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return NextResponse.json({ success: true, data: requests })
}

/**
 * POST /api/approvals
 * Create a new approval request (Employee only)
 */
export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const body = await req.json()
    const { actionType, entityType, entityId, entityName, reason, metadata } = body

    // Validate required fields
    if (!actionType || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields: actionType, entityType, entityId' },
        { status: 400 }
      )
    }

    // Create approval request
    const request = await prisma.approvalRequest.create({
      data: {
        requestedBy: auth.user.id,
        requestedByName: auth.user.name || auth.user.email,
        requestedByEmail: auth.user.email,
        actionType,
        entityType,
        entityId,
        entityName: entityName || null,
        reason: reason || null,
        metadata: metadata || null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      data: request,
      message: 'Approval request created successfully'
    })
  } catch (error) {
    console.error('Error creating approval request:', error)
    return NextResponse.json(
      { error: 'Failed to create approval request' },
      { status: 500 }
    )
  }
}
