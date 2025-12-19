import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Get all payments for the current year
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            client: {
              select: {
                id: true,
                clientName: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    })

    // Group payments by month
    const monthlyRevenue: { month: string; revenue: number; count: number }[] = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 0; i < 12; i++) {
      const monthPayments = payments.filter(p => new Date(p.paymentDate).getMonth() === i)
      monthlyRevenue.push({
        month: monthNames[i],
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        count: monthPayments.length,
      })
    }

    // Calculate summary
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const currentMonth = now.getMonth()
    const currentMonthRevenue = monthlyRevenue[currentMonth].revenue
    const previousMonthRevenue = currentMonth > 0 ? monthlyRevenue[currentMonth - 1].revenue : 0
    const revenueChange = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0

    // Group by client
    const byClient: Record<string, {
      clientId: string
      clientName: string
      totalPayments: number
      paymentCount: number
    }> = {}

    for (const payment of payments) {
      if (!payment.invoice) continue
      const clientId = payment.invoice.client.id
      if (!byClient[clientId]) {
        byClient[clientId] = {
          clientId,
          clientName: payment.invoice.client.clientName,
          totalPayments: 0,
          paymentCount: 0,
        }
      }
      byClient[clientId].totalPayments += payment.amount
      byClient[clientId].paymentCount++
    }

    const clientSummaries = Object.values(byClient).sort((a, b) => b.totalPayments - a.totalPayments)

    // Group by payment method
    const byMethod: Record<string, number> = {}
    for (const payment of payments) {
      const method = payment.paymentMethod || 'other'
      byMethod[method] = (byMethod[method] || 0) + payment.amount
    }

    const paymentMethods = Object.entries(byMethod)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Recent payments
    const recentPayments = payments.slice(0, 10).map(p => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      invoiceNumber: p.invoice?.invoiceNumber || 'N/A',
      clientName: p.invoice?.client.clientName || 'N/A',
    }))

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
        byClient: clientSummaries,
        paymentMethods,
        recentPayments,
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
