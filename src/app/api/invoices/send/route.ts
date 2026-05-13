import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { sendInvoiceEmail, isEmailConfigured } from '@/lib/email'
import { getInvoiceFile, saveInvoiceFile, generateInvoiceFilename, generateClientCode } from '@/lib/invoice-storage'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'

// POST - Send invoices via email and mark as sent
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

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
        if (sendEmail && recipientEmail) {
          try {
            // Get PDF from R2, regenerate if not found
            let pdfBuffer: Buffer | null = null
            if (invoice.filePath) {
              try {
                pdfBuffer = await getInvoiceFile(invoice.filePath)
              } catch {
                // Not in R2, regenerate
              }
            }

            if (!pdfBuffer) {
              // Regenerate PDF
              const invoiceData: InvoiceData = {
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.createdAt,
                dueDate: invoice.dueDate,
                providerName: company.name,
                providerAddress: company.address,
                providerEmails: company.emails,
                providerMobiles: company.mobiles,
                providerTelephone: company.telephone,
                customerName: invoice.client.clientName,
                customerAddress: invoice.client.address,
                customerEmail: primaryContact?.email || '',
                customerMobile: primaryContact?.mobile || '',
                customerContactPerson: primaryContact?.contactPerson || '',
                amount: invoice.amount,
                vatAmount: invoice.vatAmount,
                totalAmount: invoice.totalAmount,
                withholdingTax: invoice.withholdingTax,
                netAmount: invoice.netAmount || undefined,
                hasWithholdingTax: invoice.hasWithholdingTax,
                vatInclusive: invoice.client.vatInclusive,
                billingPeriodStart: invoice.billingPeriodStart,
                billingPeriodEnd: invoice.billingPeriodEnd,
                billingTerms: invoice.client.billingTerms,
              }
              pdfBuffer = await generateInvoicePdf(invoiceData)

              // Save to R2 for future use
              const clientCode = generateClientCode(invoice.client.clientName)
              const pdfFilename = generateInvoiceFilename(invoice.invoiceNumber, invoice.client.clientName)
              const newPath = await saveInvoiceFile(pdfFilename, pdfBuffer, clientCode)
              await prisma.invoice.update({ where: { id: invoice.id }, data: { filePath: newPath } })
            }

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

    const metadata = getRequestMetadata(request)
    const successfulInvoices = results.filter((r: any) => r.success)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'INVOICE',
      entityType: 'invoice',
      entityName: `Send invoices: ${successCount} marked sent`,
      afterData: { invoiceNumbers: successfulInvoices.map((r: any) => r.invoiceNumber), emailsSent: emailSentCount },
      changesSummary: `Marked ${successCount} invoice(s) as sent, ${emailSentCount} email(s) sent`,
      ...metadata
    })

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
