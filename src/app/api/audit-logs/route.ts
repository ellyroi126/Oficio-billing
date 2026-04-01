import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'

/**
 * GET /api/audit-logs
 * Get audit logs (Admin only)
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const actionCategory = searchParams.get('actionCategory')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Pagination params
    const page = parseInt(searchParams.get('page') || '0')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)

    const where: any = {}
    if (action) where.action = action
    if (actionCategory) where.actionCategory = actionCategory
    if (userId) where.userId = userId

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    if (page > 0) {
      const [totalItems, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return NextResponse.json({
        success: true,
        data: logs,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      })
    }

    // Backward-compatible: no pagination metadata
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
