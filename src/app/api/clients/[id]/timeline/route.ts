import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

interface TimelineItem {
  type: 'contract' | 'invoice' | 'payment' | 'audit'
  date: string
  title: string
  description: string
  linkUrl?: string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      )
    }

    const { id } = await params

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    })

    if (!client || client.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch all activity sources in parallel
    const [contracts, invoices, payments, auditLogs] = await Promise.all([
      prisma.contract.findMany({
        where: { clientId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          contractNumber: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { clientId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          dueDate: true,
          billingPeriodStart: true,
          billingPeriodEnd: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { clientId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          referenceNumber: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { entityType: 'client', entityId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          changesSummary: true,
          userName: true,
          createdAt: true,
        },
      }),
    ])

    // Build unified timeline items
    const items: TimelineItem[] = []

    for (const contract of contracts) {
      items.push({
        type: 'contract',
        date: contract.createdAt.toISOString(),
        title: `Contract ${contract.contractNumber} created`,
        description: `Status: ${contract.status}. Period: ${contract.startDate.toISOString().split('T')[0]} to ${contract.endDate.toISOString().split('T')[0]}`,
        linkUrl: `/contracts/${contract.id}`,
      })

      // If updatedAt differs significantly from createdAt, add an update entry
      if (contract.updatedAt.getTime() - contract.createdAt.getTime() > 1000) {
        items.push({
          type: 'contract',
          date: contract.updatedAt.toISOString(),
          title: `Contract ${contract.contractNumber} updated`,
          description: `Current status: ${contract.status}`,
          linkUrl: `/contracts/${contract.id}`,
        })
      }
    }

    for (const invoice of invoices) {
      items.push({
        type: 'invoice',
        date: invoice.createdAt.toISOString(),
        title: `Invoice ${invoice.invoiceNumber} generated`,
        description: `Amount: ${formatCurrency(invoice.totalAmount)}. Due: ${invoice.dueDate.toISOString().split('T')[0]}. Status: ${invoice.status}`,
        linkUrl: `/invoices/${invoice.id}`,
      })
    }

    for (const payment of payments) {
      const methodText = payment.paymentMethod ? ` via ${payment.paymentMethod}` : ''
      const refText = payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : ''
      items.push({
        type: 'payment',
        date: payment.createdAt.toISOString(),
        title: `Payment of ${formatCurrency(payment.amount)} recorded`,
        description: `Payment date: ${payment.paymentDate.toISOString().split('T')[0]}${methodText}${refText}`,
        linkUrl: `/payments/${payment.id}`,
      })
    }

    for (const log of auditLogs) {
      items.push({
        type: 'audit',
        date: log.createdAt.toISOString(),
        title: `${log.action} by ${log.userName}`,
        description: log.changesSummary || `${log.action} action performed`,
      })
    }

    // Sort by date descending and limit to 50
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const limited = items.slice(0, 50)

    return NextResponse.json({ success: true, data: limited })
  } catch (error) {
    console.error('Error fetching client timeline:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client timeline' },
      { status: 500 }
    )
  }
}
