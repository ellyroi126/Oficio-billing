import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePdf, InvoiceData } from '@/lib/invoice-pdf'
import { saveInvoiceFile, generateInvoiceFilename, generateClientCode } from '@/lib/invoice-storage'

// Parse date string (YYYY-MM-DD) to Date at noon local time to avoid timezone issues
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

// Calculate VAT amounts based on client settings
// Note: rentalRate is already the rate per billing period (e.g., quarterly rate for quarterly billing)
function calculateAmounts(
  rentalRate: number,
  vatInclusive: boolean
): { amount: number; vatAmount: number; totalAmount: number } {
  if (vatInclusive) {
    const totalAmount = rentalRate
    const amount = totalAmount / 1.12
    const vatAmount = totalAmount - amount
    return { amount: Math.round(amount * 100) / 100, vatAmount: Math.round(vatAmount * 100) / 100, totalAmount }
  } else {
    const amount = rentalRate
    const vatAmount = amount * 0.12
    const totalAmount = amount + vatAmount
    return { amount, vatAmount: Math.round(vatAmount * 100) / 100, totalAmount: Math.round(totalAmount * 100) / 100 }
  }
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

    // Calculate balance for each invoice
    const invoicesWithBalance = invoices.map(invoice => {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
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

    // Generate invoice number: INV-[ClientCode]-NNNN
    const clientCode = generateClientCode(client.clientName)
    const count = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: `INV-${clientCode}-`,
        },
      },
    })
    const invoiceNumber = `INV-${clientCode}-${String(count + 1).padStart(4, '0')}`

    // Calculate amounts (use provided amount or calculate from client rate)
    let amounts
    if (body.amount !== undefined) {
      // Manual amount provided
      const amount = parseFloat(body.amount)
      if (client.vatInclusive) {
        amounts = {
          totalAmount: amount,
          amount: amount / 1.12,
          vatAmount: amount - (amount / 1.12),
        }
      } else {
        amounts = {
          amount,
          vatAmount: amount * 0.12,
          totalAmount: amount * 1.12,
        }
      }
      amounts.amount = Math.round(amounts.amount * 100) / 100
      amounts.vatAmount = Math.round(amounts.vatAmount * 100) / 100
      amounts.totalAmount = Math.round(amounts.totalAmount * 100) / 100
    } else {
      // Calculate from client rental rate (already per billing period)
      amounts = calculateAmounts(client.rentalRate, client.vatInclusive)
    }

    // Create invoice first (without PDF path)
    const invoice = await prisma.invoice.create({
      data: {
        clientId: body.clientId,
        invoiceNumber,
        amount: amounts.amount,
        vatAmount: amounts.vatAmount,
        totalAmount: amounts.totalAmount,
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
