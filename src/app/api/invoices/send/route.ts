import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendInvoiceEmail, isEmailConfigured } from '@/lib/email'
import { getInvoiceFile } from '@/lib/invoice-storage'

// POST - Send invoices via email and mark as sent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceIds, sendEmail = true } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No invoice IDs provided' },
        { status: 400 }
      )
    }

    // Check email configuration if sending emails
    if (sendEmail && !isEmailConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured. Set RESEND_API_KEY in environment variables.' },
        { status: 400 }
      )
    }

    // Fetch invoices with client and contact info
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        status: { in: ['pending', 'overdue'] }, // Only send pending or overdue invoices
      },
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
    })

    if (invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible invoices found (must be pending or overdue)' },
        { status: 400 }
      )
    }

    // Fetch company settings
    const company = await prisma.company.findFirst()
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company settings not configured' },
        { status: 400 }
      )
    }

    const results: {
      invoiceId: string
      invoiceNumber: string
      success: boolean
      error?: string
      emailSent?: boolean
    }[] = []

    for (const invoice of invoices) {
      const primaryContact = invoice.client.contacts[0]
      const recipientEmail = primaryContact?.email

      try {
        // Send email if enabled and has recipient
        let emailSent = false
        if (sendEmail && recipientEmail && invoice.filePath) {
          try {
            const pdfBuffer = await getInvoiceFile(invoice.filePath)
            const emailResult = await sendInvoiceEmail({
              to: recipientEmail,
              clientName: invoice.client.clientName,
              invoiceNumber: invoice.invoiceNumber,
              dueDate: invoice.dueDate,
              totalAmount: invoice.totalAmount,
              billingPeriodStart: invoice.billingPeriodStart,
              billingPeriodEnd: invoice.billingPeriodEnd,
              pdfBuffer,
              providerName: company.name,
            })

            emailSent = emailResult.success
            if (!emailResult.success) {
              console.error(`Failed to send email for invoice ${invoice.invoiceNumber}:`, emailResult.error)
            }
          } catch (emailError) {
            console.error(`Error sending email for invoice ${invoice.invoiceNumber}:`, emailError)
          }
        }

        // Update invoice status to 'sent'
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        })

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
          emailSent,
        })
      } catch (error) {
        console.error(`Error processing invoice ${invoice.invoiceNumber}:`, error)
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process invoice',
        })
      }
    }

    const successCount = results.filter((r: any) => r.success).length
    const emailSentCount = results.filter((r: any) => r.emailSent).length

    return NextResponse.json({
      success: true,
      message: `Marked ${successCount} invoice(s) as sent. ${emailSentCount} email(s) sent.`,
      results,
    })
  } catch (error) {
    console.error('Error sending invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send invoices' },
      { status: 500 }
    )
  }
}
