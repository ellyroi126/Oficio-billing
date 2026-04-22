import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'
import { saveInvoiceFile, generateInvoiceFilename, generateClientCode } from '@/lib/invoice-storage'

// Calculate billing periods based on client settings
function calculateBillingPeriods(
  startDate: Date,
  endDate: Date,
  billingTerms: string
): { start: Date; end: Date }[] {
  const monthsPerPeriod: Record<string, number> = {
    'Monthly': 1,
    'Quarterly': 3,
    'Semi-Annual': 6,
    'Annual': 12,
  }
  const months = monthsPerPeriod[billingTerms] || 1

  const periods: { start: Date; end: Date }[] = []
  let periodStart = new Date(startDate)
  periodStart.setHours(12, 0, 0, 0)

  while (periodStart < endDate) {
    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + months)
    periodEnd.setDate(periodEnd.getDate() - 1)
    periodEnd.setHours(12, 0, 0, 0)

    // Cap at contract end date
    const actualEnd = periodEnd > endDate ? new Date(endDate) : periodEnd
    actualEnd.setHours(12, 0, 0, 0)

    periods.push({
      start: new Date(periodStart),
      end: actualEnd,
    })

    // Move to next period
    periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() + 1)
  }

  return periods
}

// Calculate due date (3 days before billing period start)
function calculateDueDate(billingPeriodStart: Date): Date {
  const dueDate = new Date(billingPeriodStart)
  dueDate.setDate(dueDate.getDate() - 3)
  dueDate.setHours(12, 0, 0, 0)
  return dueDate
}

// Generate invoice number inside a transaction context
async function generateInvoiceNumber(tx: any): Promise<string> {
  const lastInvoice = await tx.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let nextNumber = 219
  if (lastInvoice) {
    const lastNumberStr = lastInvoice.invoiceNumber.replace('OFC', '')
    const lastNumber = parseInt(lastNumberStr, 10)
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `OFC${String(nextNumber).padStart(8, '0')}`
}

// Calculate amounts with VAT and optional withholding tax
// Withholding tax is 5% of the base amount (before VAT)
function calculateAmounts(
  rentalRate: number,
  vatInclusive: boolean,
  hasWithholdingTax: boolean
): {
  amount: number
  vatAmount: number
  totalAmount: number
  withholdingTax: number
  netAmount: number
} {
  let amount: number
  let vatAmount: number
  let totalAmount: number

  if (vatInclusive) {
    // Rate includes VAT - need to extract base amount
    totalAmount = rentalRate
    amount = totalAmount / 1.12
    vatAmount = totalAmount - amount
  } else {
    // Rate is base amount - add VAT
    amount = rentalRate
    vatAmount = amount * 0.12
    totalAmount = amount + vatAmount
  }

  // Round to 2 decimal places
  amount = Math.round(amount * 100) / 100
  vatAmount = Math.round(vatAmount * 100) / 100
  totalAmount = Math.round(totalAmount * 100) / 100

  // Calculate withholding tax (5% of base amount)
  const withholdingTax = hasWithholdingTax ? Math.round(amount * 0.05 * 100) / 100 : 0
  const netAmount = Math.round((totalAmount - withholdingTax) * 100) / 100

  return { amount, vatAmount, totalAmount, withholdingTax, netAmount }
}

// Generate invoices for a single client
async function generateInvoicesForClient(
  clientId: string,
  upToDate: Date,
  includeFuture: boolean,
  hasWithholdingTax: boolean,
  company: any
): Promise<{ created: any[]; skipped: { clientName: string; periodStart: string; periodEnd: string }[] }> {
  // Fetch client with contracts and contacts
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      contracts: {
        where: { status: 'active' },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  })

  if (!client) {
    return { created: [], skipped: [] }
  }

  const primaryContact = client.contacts[0]

  // Use contract dates or client dates
  const contract = client.contracts[0]
  const startDate = contract?.startDate || client.startDate
  const endDate = contract?.endDate || client.endDate

  // Calculate all billing periods
  const allPeriods = calculateBillingPeriods(startDate, endDate, client.billingTerms)

  // Get existing invoices for this client to avoid duplicates
  const existingInvoices = await prisma.invoice.findMany({
    where: { clientId },
    select: {
      billingPeriodStart: true,
      billingPeriodEnd: true,
    },
  })

  // Filter out periods that already have invoices
  const existingPeriodKeys = new Set(
    existingInvoices.map((inv: any) =>
      `${inv.billingPeriodStart.toISOString()}-${inv.billingPeriodEnd.toISOString()}`
    )
  )

  const skippedPeriods: { clientName: string; periodStart: string; periodEnd: string }[] = []
  const periodsToGenerate: { start: Date; end: Date }[] = []

  for (const period of allPeriods) {
    const periodKey = `${period.start.toISOString()}-${period.end.toISOString()}`
    const isInDateRange = includeFuture || period.start <= upToDate

    if (existingPeriodKeys.has(periodKey) && isInDateRange) {
      skippedPeriods.push({
        clientName: client.clientName,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      })
    } else if (!existingPeriodKeys.has(periodKey) && isInDateRange) {
      periodsToGenerate.push(period)
    }
  }

  if (periodsToGenerate.length === 0) {
    return { created: [], skipped: skippedPeriods }
  }

  // Calculate amounts
  const amounts = calculateAmounts(client.rentalRate, client.vatInclusive, hasWithholdingTax)

  // Generate client code for file storage
  const clientCode = generateClientCode(client.clientName)

  // Create invoices for each period
  const createdInvoices = []
  for (const period of periodsToGenerate) {
    const dueDate = calculateDueDate(period.start)

    // Create invoice inside serializable transaction to prevent duplicate numbers
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx)

      return await tx.invoice.create({
        data: {
          clientId,
          invoiceNumber,
          amount: amounts.amount,
          vatAmount: amounts.vatAmount,
          totalAmount: amounts.totalAmount,
          withholdingTax: amounts.withholdingTax,
          netAmount: amounts.netAmount,
          hasWithholdingTax,
          billingPeriodStart: period.start,
          billingPeriodEnd: period.end,
          dueDate,
          status: 'pending',
        },
      })
    }, { isolationLevel: 'Serializable' })

    const invoiceNumber = invoice.invoiceNumber

    // Generate PDF
    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate,
      providerName: company.name,
      providerAddress: company.address,
      providerEmails: company.emails,
      providerMobiles: company.mobiles,
      providerTelephone: company.telephone,
      customerName: client.clientName,
      customerAddress: client.address,
      customerEmail: primaryContact?.email || '',
      customerMobile: primaryContact?.mobile || '',
      customerContactPerson: primaryContact?.contactPerson || '',
      amount: amounts.amount,
      vatAmount: amounts.vatAmount,
      totalAmount: amounts.totalAmount,
      withholdingTax: amounts.withholdingTax,
      netAmount: amounts.netAmount,
      hasWithholdingTax,
      vatInclusive: client.vatInclusive,
      billingPeriodStart: period.start,
      billingPeriodEnd: period.end,
      billingTerms: client.billingTerms,
    }

    const pdfBuffer = await generateInvoicePdf(invoiceData)
    const pdfFilename = generateInvoiceFilename(invoiceNumber, client.clientName)
    const pdfPath = await saveInvoiceFile(pdfFilename, pdfBuffer, clientCode)

    // Update invoice with PDF path
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { filePath: pdfPath },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    })

    createdInvoices.push(updatedInvoice)
  }

  return { created: createdInvoices, skipped: skippedPeriods }
}

// POST - Auto-generate invoices for a client or all clients based on billing terms
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()

    // Validate: either clientId or allClients must be provided
    if (!body.clientId && !body.allClients) {
      return NextResponse.json(
        { success: false, error: 'Client ID or allClients flag is required' },
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

    const upToDate = body.upToDate ? new Date(body.upToDate) : new Date()
    upToDate.setHours(23, 59, 59, 999)
    const hasWithholdingTax = body.hasWithholdingTax === true
    const includeFuture = body.includeFuture === true

    let allCreatedInvoices: any[] = []
    let allSkippedPeriods: { clientName: string; periodStart: string; periodEnd: string }[] = []

    if (body.allClients) {
      // Bulk generation for all active clients
      const clients = await prisma.client.findMany({
        where: { status: 'active' },
        select: { id: true },
      })

      for (const client of clients) {
        const { created, skipped } = await generateInvoicesForClient(
          client.id,
          upToDate,
          includeFuture,
          hasWithholdingTax,
          company
        )
        allCreatedInvoices.push(...created)
        allSkippedPeriods.push(...skipped)
      }

      if (allCreatedInvoices.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No new billing periods to generate invoices for any client',
          data: [],
          skipped: allSkippedPeriods,
        })
      }

      const metadata = getRequestMetadata(request)
      await createAuditLog({
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role as 'ADMIN' | 'EMPLOYEE',
        action: 'CREATE',
        actionCategory: 'INVOICE',
        entityType: 'invoice',
        entityName: `Auto-generate: ${allCreatedInvoices.length} invoices`,
        afterData: { invoiceNumbers: allCreatedInvoices.map((i: any) => i.invoiceNumber) },
        changesSummary: `Auto-generated ${allCreatedInvoices.length} invoice(s) for ${clients.length} client(s)`,
        ...metadata
      })

      return NextResponse.json({
        success: true,
        message: `Generated ${allCreatedInvoices.length} invoice(s) for ${clients.length} client(s)`,
        data: allCreatedInvoices,
        skipped: allSkippedPeriods,
      })
    } else {
      // Single client generation
      const { created: invoices, skipped } = await generateInvoicesForClient(
        body.clientId,
        upToDate,
        includeFuture,
        hasWithholdingTax,
        company
      )

      if (invoices.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No new billing periods to generate invoices for',
          data: [],
          skipped,
        })
      }

      const metadata = getRequestMetadata(request)
      await createAuditLog({
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role as 'ADMIN' | 'EMPLOYEE',
        action: 'CREATE',
        actionCategory: 'INVOICE',
        entityType: 'invoice',
        entityName: `Auto-generate: ${invoices.length} invoices`,
        afterData: { invoiceNumbers: invoices.map((i: any) => i.invoiceNumber), clientId: body.clientId },
        changesSummary: `Auto-generated ${invoices.length} invoice(s) for client`,
        ...metadata
      })

      return NextResponse.json({
        success: true,
        message: `Generated ${invoices.length} invoice(s)`,
        data: invoices,
        skipped,
      })
    }
  } catch (error) {
    console.error('Error generating invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
