import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'
import { saveInvoiceFile, generateInvoiceFilename, generateClientCode, deleteInvoiceByPath } from '@/lib/invoice-storage'

// POST - Regenerate PDFs for selected invoices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceIds } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No invoice IDs provided' },
        { status: 400 }
      )
    }

    // Fetch invoices with client and contact info
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
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
        { success: false, error: 'No invoices found' },
        { status: 404 }
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
    }[] = []

    for (const invoice of invoices) {
      const primaryContact = invoice.client.contacts[0]

      try {
        // Delete old PDF if exists
        if (invoice.filePath) {
          await deleteInvoiceByPath(invoice.filePath)
        }

        // Prepare invoice data for PDF generation
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
          withholdingTax: invoice.withholdingTax ?? undefined,
          netAmount: invoice.netAmount ?? undefined,
          hasWithholdingTax: invoice.hasWithholdingTax,
          vatInclusive: invoice.client.vatInclusive,
          billingPeriodStart: invoice.billingPeriodStart,
          billingPeriodEnd: invoice.billingPeriodEnd,
          billingTerms: invoice.client.billingTerms,
        }

        // Generate new PDF
        const pdfBuffer = await generateInvoicePdf(invoiceData)
        const pdfFilename = generateInvoiceFilename(invoice.invoiceNumber)
        const clientCode = generateClientCode(invoice.client.clientName)
        const pdfPath = await saveInvoiceFile(pdfFilename, pdfBuffer, clientCode)

        // Update invoice with new PDF path
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { filePath: pdfPath },
        })

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
        })
      } catch (error) {
        console.error(`Error regenerating PDF for invoice ${invoice.invoiceNumber}:`, error)
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to regenerate PDF',
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated ${successCount} of ${invoices.length} invoice PDF(s)`,
      results,
    })
  } catch (error) {
    console.error('Error regenerating invoice PDFs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate invoice PDFs' },
      { status: 500 }
    )
  }
}
