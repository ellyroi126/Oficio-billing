import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // Use parallel queries for summary counts and aggregations
    const [statusCounts, totalAmountAgg, invoicesWithPayments, overdueInvoices] = await Promise.all([
      // Status counts via groupBy
      prisma.invoice.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      // Total amount aggregation
      prisma.invoice.aggregate({
        where: { deletedAt: null },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Invoices with client and payment totals (capped)
      prisma.invoice.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          dueDate: true,
          clientId: true,
          client: { select: { id: true, clientName: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000, // Cap to prevent unbounded load
      }),
      // Overdue invoices specifically
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          status: { not: 'paid' },
          dueDate: { lt: new Date() },
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          dueDate: true,
          client: { select: { id: true, clientName: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 100,
      }),
    ])

    // Build summary from aggregation results
    const statusMap: Record<string, number> = {}
    for (const s of statusCounts) {
      statusMap[s.status] = s._count
    }

    // Calculate total paid from the capped set
    let totalPaid = 0
    const byClient: Record<string, {
      clientId: string; clientName: string; invoiceCount: number;
      totalAmount: number; totalPaid: number; outstanding: number
    }> = {}

    for (const inv of invoicesWithPayments) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0)
      totalPaid += paid

      const cid = inv.client.id
      if (!byClient[cid]) {
        byClient[cid] = { clientId: cid, clientName: inv.client.clientName, invoiceCount: 0, totalAmount: 0, totalPaid: 0, outstanding: 0 }
      }
      byClient[cid].invoiceCount++
      byClient[cid].totalAmount += inv.totalAmount
      byClient[cid].totalPaid += paid
      byClient[cid].outstanding += inv.totalAmount - paid
    }

    const totalAmount = totalAmountAgg._sum.totalAmount || 0

    const summary = {
      totalInvoices: totalAmountAgg._count,
      pending: statusMap['pending'] || 0,
      sent: statusMap['sent'] || 0,
      paid: statusMap['paid'] || 0,
      totalAmount,
      totalPaid,
      totalOutstanding: totalAmount - totalPaid,
    }

    const now = new Date()
    const overdueList = overdueInvoices.map((inv) => {
      const balance = inv.totalAmount - inv.payments.reduce((sum, p) => sum + p.amount, 0)
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.clientName,
        clientId: inv.client.id,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
        daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        balance,
      }
    }).sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        byClient: Object.values(byClient).sort((a, b) => b.totalAmount - a.totalAmount),
        overdueInvoices: overdueList,
      },
    })
  } catch (error) {
    console.error('Error fetching billing report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing report' },
      { status: 500 }
    )
  }
}
