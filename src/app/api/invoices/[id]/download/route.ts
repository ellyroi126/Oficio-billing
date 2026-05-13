import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInvoiceFile, saveInvoiceFile, generateInvoiceFilename, generateClientCode } from '@/lib/invoice-storage'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'
import { requireAuth } from '@/lib/middleware/roleCheck'

// GET - Download invoice PDF (regenerates if not found in R2)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const { id } = await params

    // Get invoice with client and contacts
    const invoice = await prisma.invoice.findUnique({
      where: { id },
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

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Try to fetch from R2
    let fileBuffer: Buffer | null = null

    if (invoice.filePath) {
      try {
        fileBuffer = await getInvoiceFile(invoice.filePath)
      } catch {
        // File not in R2 — will regenerate below
        console.warn(`Invoice PDF not found in R2 for ${invoice.invoiceNumber}, regenerating...`)
      }
    }

    // If not found, regenerate the PDF (with lock to prevent duplicate uploads)
    if (!fileBuffer) {
      // Re-fetch invoice to check if another request already regenerated it
      const freshInvoice = await prisma.invoice.findUnique({
        where: { id },
        select: { filePath: true },
      })

      // If filePath was updated since our first fetch, try R2 again
      if (freshInvoice?.filePath && freshInvoice.filePath !== invoice.filePath) {
        try {
          fileBuffer = await getInvoiceFile(freshInvoice.filePath)
        } catch {
          // Still not found, proceed with regeneration
        }
      }

      if (!fileBuffer) {
        const company = await prisma.company.findFirst()
      if (!company) {
        return NextResponse.json(
          { success: false, error: 'Company settings not configured' },
          { status: 500 }
        )
      }

      const primaryContact = invoice.client.contacts[0]

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

      fileBuffer = await generateInvoicePdf(invoiceData)

      // Upload to R2 and update database
      const clientCode = generateClientCode(invoice.client.clientName)
      const pdfFilename = generateInvoiceFilename(invoice.invoiceNumber, invoice.client.clientName)
      const newPath = await saveInvoiceFile(pdfFilename, fileBuffer, clientCode)

      await prisma.invoice.update({
        where: { id },
        data: { filePath: newPath },
      })
      }
    }

    // Extract filename for download header
    const filename = `${invoice.client.clientName}_${invoice.invoiceNumber}.pdf`
      .replace(/[^a-zA-Z0-9_.-]/g, '_')

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download invoice' },
      { status: 500 }
    )
  }
}
