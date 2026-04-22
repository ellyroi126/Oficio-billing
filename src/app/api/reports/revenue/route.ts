import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    // Fetch payments for the year with a reasonable limit
    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        paymentDate: { gte: startOfYear, lte: endOfYear },
      },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            client: {
              select: { id: true, clientName: true },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 10000, // Cap at 10k payments per year
    })

    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthBuckets = Array.from({ length: 12 }, () => ({ revenue: 0, count: 0 }))

    const byClient: Record<string, { clientId: string; clientName: string; totalPayments: number; paymentCount: number }> = {}
    const byMethod: Record<string, number> = {}
    let totalRevenue = 0

    for (const p of payments) {
      const month = new Date(p.paymentDate).getMonth()
      monthBuckets[month].revenue += p.amount
      monthBuckets[month].count++
      totalRevenue += p.amount

      // By client
      if (p.invoice) {
        const cid = p.invoice.client.id
        if (!byClient[cid]) {
          byClient[cid] = { clientId: cid, clientName: p.invoice.client.clientName, totalPayments: 0, paymentCount: 0 }
        }
        byClient[cid].totalPayments += p.amount
        byClient[cid].paymentCount++
      }

      // By method
      const method = p.paymentMethod || 'other'
      byMethod[method] = (byMethod[method] || 0) + p.amount
    }

    const monthlyRevenue = monthBuckets.map((b, i) => ({ month: monthNames[i], revenue: b.revenue, count: b.count }))
    const currentMonth = now.getMonth()
    const currentMonthRevenue = monthlyRevenue[currentMonth].revenue
    const previousMonthRevenue = currentMonth > 0 ? monthlyRevenue[currentMonth - 1].revenue : 0
    const revenueChange = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          currentMonthRevenue,
          previousMonthRevenue,
          revenueChange: Math.round(revenueChange * 10) / 10,
          totalPayments: payments.length,
          averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
        },
        monthlyRevenue,
        byClient: Object.values(byClient).sort((a, b) => b.totalPayments - a.totalPayments),
        paymentMethods: Object.entries(byMethod)
          .map(([method, amount]) => ({ method, amount }))
          .sort((a, b) => b.amount - a.amount),
        recentPayments: payments.slice(0, 10).map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          invoiceNumber: p.invoice?.invoiceNumber || 'N/A',
          clientName: p.invoice?.client.clientName || 'N/A',
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching revenue report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue report' },
      { status: 500 }
    )
  }
}
