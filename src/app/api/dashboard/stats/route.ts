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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Aging bucket boundaries
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel for better performance
    const [
      totalClients,
      activeContracts,
      expiringSoon,
      pendingInvoices,
      overdueInvoices,
      paidThisMonth,
      monthlyPayments,
      overdue1to30,
      overdue31to60,
      overdue60plus,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({ where: { deletedAt: null } }),

      // Active contracts (status = 'active')
      prisma.contract.count({
        where: { status: 'active', deletedAt: null },
      }),

      // Contracts expiring in the next 30 days
      prisma.contract.count({
        where: {
          status: 'active',
          deletedAt: null,
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),

      // Pending invoices (not paid)
      prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'sent'] },
        },
      }),

      // Overdue invoices (past due date and not paid)
      prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: now },
        },
      }),

      // Invoices paid this month
      prisma.invoice.count({
        where: {
          deletedAt: null,
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
          deletedAt: null,
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Overdue 1-30 days
      prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: now, gte: thirtyDaysAgo },
        },
      }),

      // Overdue 31-60 days
      prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
        },
      }),

      // Overdue 60+ days
      prisma.invoice.count({
        where: {
          deletedAt: null,
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: sixtyDaysAgo },
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
        aging: {
          current: overdue1to30,
          thirtyToSixty: overdue31to60,
          sixtyPlus: overdue60plus,
        },
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
