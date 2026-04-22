import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

interface Activity {
  id: string
  type: 'client' | 'contract' | 'invoice' | 'payment'
  action: string
  description: string
  timestamp: Date
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const typeFilter = request.nextUrl.searchParams.get('type')

    const shouldFetch = (type: string) => !typeFilter || typeFilter === type

    const [recentClients, recentContracts, recentInvoices, recentPayments] = await Promise.all([
      shouldFetch('client')
        ? prisma.client.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              clientName: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      shouldFetch('contract')
        ? prisma.contract.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              client: {
                select: { clientName: true },
              },
            },
          })
        : Promise.resolve([]),

      shouldFetch('invoice')
        ? prisma.invoice.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              client: {
                select: { clientName: true },
              },
            },
          })
        : Promise.resolve([]),

      shouldFetch('payment')
        ? prisma.payment.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              createdAt: true,
              invoice: {
                select: {
                  invoiceNumber: true,
                  client: {
                    select: { clientName: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ])

    // Combine and format activities
    const activities: Activity[] = []

    for (const client of recentClients) {
      activities.push({
        id: `client-${client.id}`,
        type: 'client',
        action: 'New Client',
        description: `${client.clientName} was added`,
        timestamp: client.createdAt,
      })
    }

    for (const contract of recentContracts) {
      activities.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        action: 'Contract Created',
        description: `Contract ${contract.contractNumber} for ${contract.client.clientName}`,
        timestamp: contract.createdAt,
      })
    }

    for (const invoice of recentInvoices) {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        action: invoice.status === 'paid' ? 'Invoice Paid' : 'Invoice Created',
        description: `${invoice.invoiceNumber} for ${invoice.client.clientName} — ₱${invoice.totalAmount.toLocaleString()}`,
        timestamp: invoice.createdAt,
      })
    }

    for (const payment of recentPayments) {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        action: 'Payment Received',
        description: `₱${payment.amount.toLocaleString()} via ${payment.paymentMethod}${payment.invoice ? ` for ${payment.invoice.invoiceNumber}` : ''}`,
        timestamp: payment.createdAt,
      })
    }

    // Sort by timestamp descending and take top 10
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const recentActivities = activities.slice(0, 10)

    return NextResponse.json({
      success: true,
      data: recentActivities,
    })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
