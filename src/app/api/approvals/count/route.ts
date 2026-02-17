import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'

/**
 * GET /api/approvals/count
 * Get count of pending approval requests (Admin only)
 * Used for notification badges
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const pendingCount = await prisma.approvalRequest.count({
      where: { status: 'PENDING' }
    })

    return NextResponse.json({
      success: true,
      data: { count: pendingCount }
    })
  } catch (error) {
    console.error('Error fetching approval count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval count' },
      { status: 500 }
    )
  }
}
