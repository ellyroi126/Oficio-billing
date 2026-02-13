import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'
import { saveInvoiceFile, generateInvoiceFilename, generateClientCode } from '@/lib/invoice-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

// Generate invoice number: OFCXXXXXXXX (OFC + 8 digits, total 11 characters)
// Starting from OFC00000219
async function generateInvoiceNumber(): Promise<string> {
  // Find the highest existing invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let nextNumber = 219 // Starting number
  if (lastInvoice) {
    // Extract the number from the last invoice number (e.g., "OFC00000219" -> 219)
    const lastNumberStr = lastInvoice.invoiceNumber.replace('OFC', '')
    const lastNumber = parseInt(lastNumberStr, 10)
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  // Format: OFC + 8 digits
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

// GET - List all invoices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(status && { status }),
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            billingTerms: true,
            rentalRate: true,
            vatInclusive: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Check for overdue invoices and update their status
    const now = new Date()
    const overdueIds = invoices
      .filter((inv: any) =>
        ['pending', 'sent'].includes(inv.status) &&
        new Date(inv.dueDate) < now
      )
      .map((inv: any) => inv.id)

    if (overdueIds.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'overdue' }
      })

      // Update local data to reflect the change
      invoices.forEach((inv: any) => {
        if (overdueIds.includes(inv.id)) {
          inv.status = 'overdue'
        }
      })
    }

    // Calculate balance for each invoice
    const invoicesWithBalance = invoices.map((invoice: any) => {
      const totalPaid = invoice.payments.reduce((sum: any, p: any) => sum + p.amount, 0)
      const balance = invoice.totalAmount - totalPaid
      return {
        ...invoice,
        totalPaid,
        balance,
      }
    })

    return NextResponse.json({ success: true, data: invoicesWithBalance })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.clientId || !body.billingPeriodStart || !body.billingPeriodEnd || !body.dueDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch client with contacts
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      include: {
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

    // Generate invoice number: OFCXXXXXXXX (11 characters)
    const invoiceNumber = await generateInvoiceNumber()
    const clientCode = generateClientCode(client.clientName)

    // Check if withholding tax should be applied
    const hasWithholdingTax = body.hasWithholdingTax === true

    // Calculate amounts (use provided amount or calculate from client rate)
    let amounts
    if (body.amount !== undefined) {
      // Manual amount provided
      const baseAmount = parseFloat(body.amount)
      if (client.vatInclusive) {
        const totalAmount = baseAmount
        const amount = totalAmount / 1.12
        const vatAmount = totalAmount - amount
        const withholdingTax = hasWithholdingTax ? Math.round(amount * 0.05 * 100) / 100 : 0
        const netAmount = Math.round((totalAmount - withholdingTax) * 100) / 100
        amounts = {
          amount: Math.round(amount * 100) / 100,
          vatAmount: Math.round(vatAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          withholdingTax,
          netAmount,
        }
      } else {
        const amount = baseAmount
        const vatAmount = amount * 0.12
        const totalAmount = amount + vatAmount
        const withholdingTax = hasWithholdingTax ? Math.round(amount * 0.05 * 100) / 100 : 0
        const netAmount = Math.round((totalAmount - withholdingTax) * 100) / 100
        amounts = {
          amount,
          vatAmount: Math.round(vatAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          withholdingTax,
          netAmount,
        }
      }
    } else {
      // Calculate from client rental rate (already per billing period)
      amounts = calculateAmounts(client.rentalRate, client.vatInclusive, hasWithholdingTax)
    }

    // Create invoice first (without PDF path)
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
        billingPeriodStart: parseLocalDate(body.billingPeriodStart),
        billingPeriodEnd: parseLocalDate(body.billingPeriodEnd),
        dueDate: parseLocalDate(body.dueDate),
        status: 'pending',
      },
    })

    // Generate PDF
    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: parseLocalDate(body.dueDate),
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
      billingPeriodStart: parseLocalDate(body.billingPeriodStart),
      billingPeriodEnd: parseLocalDate(body.billingPeriodEnd),
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

    return NextResponse.json({ success: true, data: updatedInvoice })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete invoices
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No invoice IDs provided' },
        { status: 400 }
      )
    }

    // Delete all invoices with the given IDs
    const result = await prisma.invoice.deleteMany({
      where: {
        id: { in: ids },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} invoice(s)`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoices' },
      { status: 500 }
    )
  }
}
