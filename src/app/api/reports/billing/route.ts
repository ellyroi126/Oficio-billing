import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all invoices with client and payment info
    const invoices = await prisma.invoice.findMany({
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate summary statistics
    const summary = {
      totalInvoices: invoices.length,
      pending: invoices.filter((inv: any) => inv.status === 'pending').length,
      sent: invoices.filter((inv: any) => inv.status === 'sent').length,
      paid: invoices.filter((inv: any) => inv.status === 'paid').length,
      totalAmount: invoices.reduce((sum: any, inv: any) => sum + inv.totalAmount, 0),
      totalPaid: invoices.reduce((sum: any, inv: any) => {
        const paid = inv.payments.reduce((psum: any, p: any) => psum + p.amount, 0)
        return sum + paid
      }, 0),
      totalOutstanding: 0,
    }
    summary.totalOutstanding = summary.totalAmount - summary.totalPaid

    // Group by client
    const byClient: Record<string, {
      clientId: string
      clientName: string
      invoiceCount: number
      totalAmount: number
      totalPaid: number
      outstanding: number
    }> = {}

    for (const invoice of invoices) {
      const clientId = invoice.client.id
      if (!byClient[clientId]) {
        byClient[clientId] = {
          clientId,
          clientName: invoice.client.clientName,
          invoiceCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          outstanding: 0,
        }
      }
      byClient[clientId].invoiceCount++
      byClient[clientId].totalAmount += invoice.totalAmount
      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
      byClient[clientId].totalPaid += paid
      byClient[clientId].outstanding += invoice.totalAmount - paid
    }

    const clientSummaries = Object.values(byClient).sort((a, b) => b.totalAmount - a.totalAmount)

    // Get overdue invoices
    const now = new Date()
    const overdueInvoices = invoices
      .filter(inv => inv.status !== 'paid' && new Date(inv.dueDate) < now)
      .map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.clientName,
        clientId: inv.client.id,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
        daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        balance: inv.totalAmount - inv.payments.reduce((sum, p) => sum + p.amount, 0),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        byClient: clientSummaries,
        overdueInvoices,
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
