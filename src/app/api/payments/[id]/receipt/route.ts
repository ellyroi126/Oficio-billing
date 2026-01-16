import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateReceiptPdf, generateReceiptNumber, ReceiptData } from '@/lib/receipt-pdf'
import { saveReceiptFile, generateReceiptFilename, getReceiptFile, receiptFileExists } from '@/lib/receipt-storage'

// Type for payment with receiptPath (will be available after migration)
interface PaymentWithReceipt {
  receiptPath?: string | null
}

// GET - Download or generate receipt for a payment
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
          include: {
            client: {
              include: {
                contacts: {
                  where: { isPrimary: true },
                  take: 1,
                },
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

    // Check if invoice exists
    if (!payment.invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found for this payment' },
        { status: 404 }
      )
    }

    // Cast to include receiptPath (available after migration)
    const paymentWithReceipt = payment as typeof payment & PaymentWithReceipt

    // Check if receipt already exists
    if (paymentWithReceipt.receiptPath && await receiptFileExists(paymentWithReceipt.receiptPath)) {
      const pdfBuffer = await getReceiptFile(paymentWithReceipt.receiptPath)
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Receipt-${payment.id.slice(-8).toUpperCase()}.pdf"`,
        },
      })
    }

    // Generate receipt if not exists
    const company = await prisma.company.findFirst()
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company settings not configured' },
        { status: 400 }
      )
    }

    const invoice = payment.invoice
    const client = invoice.client
    const primaryContact = client.contacts[0]

    const receiptNumber = generateReceiptNumber()

    const receiptData: ReceiptData = {
      receiptNumber,
      receiptDate: payment.paymentDate,
      paymentAmount: payment.amount,
      paymentMethod: payment.paymentMethod ?? 'other',
      referenceNumber: payment.referenceNumber ?? undefined,
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: invoice.totalAmount,
      billingPeriodStart: invoice.billingPeriodStart,
      billingPeriodEnd: invoice.billingPeriodEnd,
      providerName: company.name,
      providerAddress: company.address,
      providerEmails: company.emails,
      providerMobiles: company.mobiles,
      providerTelephone: company.telephone,
      customerName: client.clientName,
      customerAddress: client.address,
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
        where: { id },
        data: { receiptPath } as Record<string, unknown>,
      })
    } catch {
      // Ignore if receiptPath field doesn't exist yet (migration not run)
      console.log('Note: receiptPath field not available - run migration to enable')
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt-${receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}
