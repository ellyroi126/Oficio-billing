import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteEvidenceFile } from '@/lib/payment-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

// GET - Get single payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            billingPeriodStart: true,
            billingPeriodEnd: true,
            dueDate: true,
            client: {
              select: {
                id: true,
                clientName: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Calculate invoice balance (only if invoice exists)
    let responseData: Record<string, unknown> = { ...payment }
    if (payment.invoice) {
      const totalPaid = payment.invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
      const balance = payment.invoice.totalAmount - totalPaid
      responseData = {
        ...payment,
        invoice: {
          ...payment.invoice,
          totalPaid,
          balance,
        },
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

// PUT - Update payment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get existing payment
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            payments: {
              select: { id: true, amount: true },
            },
          },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Calculate what the new balance would be (only if invoice exists)
    if (body.amount !== undefined && existingPayment.invoice) {
      const newAmount = parseFloat(body.amount)
      const otherPaymentsTotal = existingPayment.invoice.payments
        .filter((p: { id: string }) => p.id !== id)
        .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
      const newBalance = existingPayment.invoice.totalAmount - otherPaymentsTotal - newAmount

      if (newBalance < 0) {
        return NextResponse.json(
          { success: false, error: 'Payment amount exceeds invoice balance' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.paymentDate) updateData.paymentDate = parseLocalDate(body.paymentDate)
    if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod
    if (body.referenceNumber !== undefined) updateData.referenceNumber = body.referenceNumber || null
    if (body.notes !== undefined) updateData.remarks = body.notes || null
    if (body.evidencePath !== undefined) updateData.evidencePath = body.evidencePath || null

    // Update payment
    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            client: {
              select: {
                id: true,
                clientName: true,
              },
            },
          },
        },
      },
    })

    // Check and update invoice status (only if invoice exists)
    if (existingPayment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: existingPayment.invoiceId },
        include: {
          payments: {
            select: { amount: true },
          },
        },
      })

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
        if (totalPaid >= invoice.totalAmount && invoice.status !== 'paid') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'paid', paidAt: new Date() },
          })
        } else if (totalPaid < invoice.totalAmount && invoice.status === 'paid') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'sent', paidAt: null },
          })
        }
      }
    }

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get payment first to get invoice ID and evidence path
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        invoiceId: true,
        evidencePath: true,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Delete evidence file if exists
    if (payment.evidencePath) {
      await deleteEvidenceFile(payment.evidencePath)
    }

    // Delete payment
    await prisma.payment.delete({
      where: { id },
    })

    // Update invoice status if needed (only if invoice exists)
    if (payment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: {
          payments: {
            select: { amount: true },
          },
        },
      })

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
        if (totalPaid < invoice.totalAmount && invoice.status === 'paid') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'sent', paidAt: null },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
