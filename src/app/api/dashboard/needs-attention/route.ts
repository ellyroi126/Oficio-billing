import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

export async function GET() {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const isAdmin = auth.user.role === 'ADMIN'
    const now = new Date()
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const [approvals, overdueInvoices, expiringContracts] = await Promise.all([
      // For admins: pending approvals to review
      // For employees: own pending requests
      isAdmin
        ? prisma.approvalRequest.findMany({
            where: { status: 'PENDING' },
            select: { id: true, actionType: true, entityName: true, requestedByName: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : prisma.approvalRequest.findMany({
            where: { requestedBy: auth.user.id, status: 'PENDING' },
            select: { id: true, actionType: true, entityName: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: {
          status: { in: ['pending', 'sent', 'overdue'] },
          dueDate: { lt: now },
          deletedAt: null,
        },
        select: { id: true, invoiceNumber: true, totalAmount: true, dueDate: true, client: { select: { clientName: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      // Expiring contracts in next 14 days
      prisma.contract.findMany({
        where: {
          status: 'active',
          endDate: { gte: now, lte: fourteenDaysFromNow },
          deletedAt: null,
        },
        select: { id: true, contractNumber: true, endDate: true, client: { select: { clientName: true } } },
        orderBy: { endDate: 'asc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { approvals, overdueInvoices, expiringContracts },
    })
  } catch (error) {
    console.error('Error fetching needs-attention:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
