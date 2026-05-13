import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'

// Parse date string (YYYY-MM-DD) to Date at noon local time
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

interface BatchPaymentItem {
  invoiceId: string
  amount: number
  evidencePath?: string
}

// POST - Create multiple payments at once
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()
    const { payments, paymentDate, paymentMethod, referenceNumber } = body as {
      payments: BatchPaymentItem[]
      paymentDate: string
      paymentMethod: string
      referenceNumber?: string
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ success: false, error: 'No payments provided' }, { status: 400 })
    }

    if (!paymentDate || !paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment date and method are required' }, { status: 400 })
    }

    // Validate all invoices exist and check balances
    const invoiceIds = payments.map(p => p.invoiceId)
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null }, select: { amount: true } },
        client: { select: { id: true, clientName: true } },
      },
    })

    const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]))

    const errors: string[] = []
    for (const item of payments) {
      const invoice = invoiceMap.get(item.invoiceId)
      if (!invoice) {
        errors.push(`Invoice ${item.invoiceId} not found`)
        continue
      }
      if (item.amount <= 0) {
        errors.push(`Invalid amount for ${invoice.invoiceNumber}`)
        continue
      }
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = invoice.totalAmount - totalPaid
      if (item.amount > balance) {
        errors.push(`Amount exceeds balance for ${invoice.invoiceNumber} (balance: ${balance.toFixed(2)})`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 400 })
    }

    // Create all payments inside a transaction for atomicity and fresh balance checks
    const results: { invoiceNumber: string; paymentId: string; amount: number }[] = []
    const parsedDate = parseLocalDate(paymentDate)

    await prisma.$transaction(async (tx) => {
      for (const item of payments) {
        // Re-validate balance inside transaction to prevent stale data
        const freshInvoice = await tx.invoice.findUnique({
          where: { id: item.invoiceId },
          include: { payments: { where: { deletedAt: null }, select: { amount: true } }, client: { select: { id: true } } },
        })
        if (!freshInvoice) throw new Error(`Invoice ${item.invoiceId} not found`)

        const totalPaid = freshInvoice.payments.reduce((sum, p) => sum + p.amount, 0)
        const balance = freshInvoice.totalAmount - totalPaid
        if (item.amount > balance) {
          throw new Error(`Amount exceeds balance for invoice (balance: ${balance.toFixed(2)})`)
        }

        const payment = await tx.payment.create({
          data: {
            clientId: freshInvoice.client.id,
            invoiceId: item.invoiceId,
            amount: item.amount,
            paymentDate: parsedDate,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            evidencePath: item.evidencePath || null,
            remarks: null,
          },
        })

        const newTotalPaid = totalPaid + item.amount
        if (newTotalPaid >= freshInvoice.totalAmount) {
          await tx.invoice.update({
            where: { id: item.invoiceId },
            data: { status: 'paid', paidAt: new Date() },
          })
        }

        const invoice = invoiceMap.get(item.invoiceId)!
        results.push({
          invoiceNumber: invoice.invoiceNumber,
          paymentId: payment.id,
          amount: item.amount,
        })
      }
    }, { timeout: 30000 })

    const totalAmount = results.reduce((sum, r) => sum + r.amount, 0)

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'CREATE',
      actionCategory: 'PAYMENT',
      entityType: 'payment',
      entityName: `Batch payment: ${results.length} payment(s)`,
      afterData: { payments: results, paymentMethod, totalAmount },
      changesSummary: `Batch created ${results.length} payment(s) totaling ₱${totalAmount.toFixed(2)}`,
      ...metadata,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully created ${results.length} payment(s) totaling ₱${totalAmount.toFixed(2)}`,
      data: results,
    })
  } catch (error) {
    console.error('Error creating batch payments:', error)
    const message = error instanceof Error ? error.message : 'Failed to create batch payments'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
