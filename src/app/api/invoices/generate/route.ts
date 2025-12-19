import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

// Generate invoice number: OFCXXXXXXXX (OFC + 8 digits, total 11 characters)
async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count()
  // Format: OFC + 8 digits (e.g., OFC00000001)
  return `OFC${String(count + 1).padStart(8, '0')}`
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

// POST - Auto-generate invoices for a client based on billing terms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Fetch client with contracts and contacts
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      include: {
        contracts: {
          where: { status: 'active' },
          orderBy: { startDate: 'desc' },
          take: 1, // Get most recent active contract
        },
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
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

    const primaryContact = client.contacts[0]

    // Use contract dates or client dates
    const contract = client.contracts[0]
    const startDate = contract?.startDate || client.startDate
    const endDate = contract?.endDate || client.endDate

    // Calculate all billing periods
    const allPeriods = calculateBillingPeriods(startDate, endDate, client.billingTerms)

    // Get existing invoices for this client to avoid duplicates
    const existingInvoices = await prisma.invoice.findMany({
      where: { clientId: body.clientId },
      select: {
        billingPeriodStart: true,
        billingPeriodEnd: true,
      },
    })

    // Filter out periods that already have invoices
    const existingPeriodKeys = new Set(
      existingInvoices.map(inv =>
        `${inv.billingPeriodStart.toISOString()}-${inv.billingPeriodEnd.toISOString()}`
      )
    )

    // Optional: Only generate up to a specific date
    const upToDate = body.upToDate ? new Date(body.upToDate) : new Date()
    upToDate.setHours(23, 59, 59, 999)

    const periodsToGenerate = allPeriods.filter(period => {
      const periodKey = `${period.start.toISOString()}-${period.end.toISOString()}`
      // Skip if already exists or if period hasn't started yet (unless specified otherwise)
      return !existingPeriodKeys.has(periodKey) &&
             (body.includeFuture || period.start <= upToDate)
    })

    if (periodsToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new billing periods to generate invoices for',
        data: [],
      })
    }

    // Check if withholding tax should be applied
    const hasWithholdingTax = body.hasWithholdingTax === true

    // Calculate amounts (rental rate is already per billing period)
    const amounts = calculateAmounts(client.rentalRate, client.vatInclusive, hasWithholdingTax)

    // Generate client code for file storage
    const clientCode = generateClientCode(client.clientName)

    // Create invoices for each period
    const createdInvoices = []
    for (const period of periodsToGenerate) {
      // Generate unique invoice number for each invoice
      const invoiceNumber = await generateInvoiceNumber()
      const dueDate = calculateDueDate(period.start)

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          clientId: body.clientId,
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
      const pdfFilename = generateInvoiceFilename(invoiceNumber)
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

    return NextResponse.json({
      success: true,
      message: `Generated ${createdInvoices.length} invoice(s)`,
      data: createdInvoices,
    })
  } catch (error) {
    console.error('Error generating invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
