import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'

/**
 * GET /api/audit-logs
 * Get audit logs (Admin only)
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const actionCategory = searchParams.get('actionCategory')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = {}
    if (action) where.action = action
    if (actionCategory) where.actionCategory = actionCategory
    if (userId) where.userId = userId

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
