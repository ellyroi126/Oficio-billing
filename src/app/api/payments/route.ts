import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateReceiptPdf, generateReceiptNumber, ReceiptData } from '@/lib/receipt-pdf'
import { saveReceiptFile, generateReceiptFilename } from '@/lib/receipt-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

// GET - List all payments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const invoiceId = searchParams.get('invoiceId')
    const clientId = searchParams.get('clientId')

    const payments = await prisma.payment.findMany({
      where: {
        ...(invoiceId && { invoiceId }),
        ...(clientId && { clientId }),
      },
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
      orderBy: { paymentDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST - Create new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.invoiceId || !body.amount || !body.paymentDate || !body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const amount = parseFloat(body.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // Verify invoice exists and get client ID
    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      include: {
        payments: {
          select: { amount: true },
        },
        client: {
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Calculate current balance
    const totalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
    const currentBalance = invoice.totalAmount - totalPaid

    if (amount > currentBalance) {
      return NextResponse.json(
        { success: false, error: `Payment amount exceeds balance of ${currentBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payment (clientId is required, get it from the invoice)
    const payment = await prisma.payment.create({
      data: {
        clientId: invoice.clientId,
        invoiceId: body.invoiceId,
        amount,
        paymentDate: parseLocalDate(body.paymentDate),
        paymentMethod: body.paymentMethod,
        referenceNumber: body.referenceNumber || null,
        remarks: body.notes || null,
        evidencePath: body.evidencePath || null,
      },
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

    // Generate receipt PDF
    try {
      const company = await prisma.company.findFirst()
      if (company) {
        const primaryContact = invoice.client.contacts[0]
        const receiptNumber = generateReceiptNumber()

        const receiptData: ReceiptData = {
          receiptNumber,
          receiptDate: parseLocalDate(body.paymentDate),
          paymentAmount: amount,
          paymentMethod: body.paymentMethod,
          referenceNumber: body.referenceNumber ?? undefined,
          invoiceNumber: invoice.invoiceNumber,
          invoiceAmount: invoice.totalAmount,
          billingPeriodStart: invoice.billingPeriodStart,
          billingPeriodEnd: invoice.billingPeriodEnd,
          providerName: company.name,
          providerAddress: company.address,
          providerEmails: company.emails,
          providerMobiles: company.mobiles,
          providerTelephone: company.telephone,
          customerName: invoice.client.clientName,
          customerAddress: invoice.client.address,
          customerEmail: primaryContact?.email ?? undefined,
          customerMobile: primaryContact?.mobile ?? undefined,
          customerContactPerson: primaryContact?.contactPerson ?? undefined,
        }

        const pdfBuffer = await generateReceiptPdf(receiptData)
        const filename = generateReceiptFilename(receiptNumber)
        const receiptPath = await saveReceiptFile(filename, pdfBuffer)

        // Update payment with receipt path (will work after migration)
        try {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { receiptPath } as Record<string, unknown>,
          })
        } catch {
          // Ignore if receiptPath field doesn't exist yet
          console.log('Note: receiptPath field not available - run migration to enable')
        }
      }
    } catch (receiptError) {
      console.error('Error generating receipt:', receiptError)
      // Don't fail the payment creation if receipt generation fails
    }

    // Check if invoice is fully paid and update status
    const newTotalPaid = totalPaid + amount
    if (newTotalPaid >= invoice.totalAmount) {
      await prisma.invoice.update({
        where: { id: body.invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      })
    }

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete payments
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payment IDs provided' },
        { status: 400 }
      )
    }

    // Get payments to find affected invoices
    const payments = await prisma.payment.findMany({
      where: { id: { in: ids } },
      select: { invoiceId: true },
    })

    // Filter out null invoiceIds and get unique ones
    const affectedInvoiceIds = [...new Set(
      payments
        .map(p => p.invoiceId)
        .filter((id): id is string => id !== null)
    )]

    // Delete all payments with the given IDs
    const result = await prisma.payment.deleteMany({
      where: { id: { in: ids } },
    })

    // Update invoice statuses if needed
    for (const invoiceId of affectedInvoiceIds) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
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
            where: { id: invoiceId },
            data: {
              status: 'sent',
              paidAt: null,
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} payment(s)`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payments' },
      { status: 500 }
    )
  }
}
