import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Run all queries in parallel for better performance
    const [
      totalClients,
      activeContracts,
      expiringSoon,
      pendingInvoices,
      overdueInvoices,
      paidThisMonth,
      monthlyPayments,
    ] = await Promise.all([
      // Total clients
      prisma.client.count(),

      // Active contracts (status = 'active')
      prisma.contract.count({
        where: { status: 'active' },
      }),

      // Contracts expiring in the next 30 days
      prisma.contract.count({
        where: {
          status: 'active',
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),

      // Pending invoices (not paid)
      prisma.invoice.count({
        where: {
          status: { in: ['pending', 'sent'] },
        },
      }),

      // Overdue invoices (past due date and not paid)
      prisma.invoice.count({
        where: {
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: now },
        },
      }),

      // Invoices paid this month
      prisma.invoice.count({
        where: {
          status: 'paid',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // Total payments received this month
      prisma.payment.aggregate({
        where: {
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ])

    // Calculate total revenue this month
    const monthlyRevenue = monthlyPayments._sum.amount || 0

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        activeContracts,
        expiringSoon,
        pendingInvoices,
        overdueInvoices,
        paidThisMonth,
        monthlyRevenue,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
