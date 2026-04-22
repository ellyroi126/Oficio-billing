import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { generateReceiptPdf, generateReceiptNumber, ReceiptData } from '@/lib/receipt-pdf'
import { saveReceiptFile, generateReceiptFilename } from '@/lib/receipt-storage'
import { withNotDeleted, softDelete } from '@/lib/softDelete'

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
    const search = searchParams.get('search') || ''
    const paymentMethod = searchParams.get('paymentMethod')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Pagination params
    const page = parseInt(searchParams.get('page') || '0')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
    const sortField = searchParams.get('sortField') || 'paymentDate'
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'

    // Build where clause
    const where: any = withNotDeleted({
      ...(invoiceId && { invoiceId }),
      ...(clientId && { clientId }),
      ...(paymentMethod && { paymentMethod }),
    })

    if (search) {
      where.referenceNumber = { contains: search, mode: 'insensitive' }
    }

    if (dateFrom || dateTo) {
      where.paymentDate = {}
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom)
      if (dateTo) where.paymentDate.lte = new Date(dateTo)
    }

    // Build orderBy based on sortField
    const sortFieldMap: Record<string, any> = {
      paymentDate: { paymentDate: sortDirection },
      amount: { amount: sortDirection },
      paymentMethod: { paymentMethod: sortDirection },
      clientName: { invoice: { client: { clientName: sortDirection } } },
      invoiceNumber: { invoice: { invoiceNumber: sortDirection } },
    }
    const orderBy = sortFieldMap[sortField] || { paymentDate: sortDirection }

    const includeClause = {
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
    }

    if (page > 0) {
      const [totalItems, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          include: includeClause,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])

      return NextResponse.json({
        success: true,
        data: payments,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      })
    }

    // Backward-compatible: no pagination metadata
    const payments = await prisma.payment.findMany({
      where,
      include: includeClause,
      orderBy,
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
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

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

    // Create payment and update invoice status atomically
    const { payment, invoiceFullyPaid } = await prisma.$transaction(async (tx) => {
      // Re-check balance inside transaction to prevent race conditions
      const freshInvoice = await tx.invoice.findUnique({
        where: { id: body.invoiceId },
        include: { payments: { select: { amount: true } } },
      })
      if (!freshInvoice) throw new Error('Invoice not found')

      const txTotalPaid = freshInvoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
      const txBalance = freshInvoice.totalAmount - txTotalPaid
      if (amount > txBalance) throw new Error(`Payment amount exceeds balance of ${txBalance.toFixed(2)}`)

      const created = await tx.payment.create({
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

      const newTotalPaid = txTotalPaid + amount
      const fullyPaid = newTotalPaid >= freshInvoice.totalAmount
      if (fullyPaid) {
        await tx.invoice.update({
          where: { id: body.invoiceId },
          data: { status: 'paid', paidAt: new Date() },
        })
      }

      return { payment: created, invoiceFullyPaid: fullyPaid }
    })

    // Generate receipt PDF (non-critical, outside transaction)
    try {
      const company = await prisma.company.findFirst()
      if (company) {
        const primaryContact = invoice.client.contacts[0]
        const receiptNumber = generateReceiptNumber(payment.id)

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

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'CREATE',
      actionCategory: 'PAYMENT',
      entityType: 'payment',
      entityId: payment.id,
      entityName: `Payment for ${invoice.invoiceNumber} - ${invoice.client.clientName}`,
      afterData: { amount, paymentMethod: body.paymentMethod, invoiceNumber: invoice.invoiceNumber },
      changesSummary: `Created payment of ${amount.toFixed(2)} for invoice ${invoice.invoiceNumber}`,
      ...metadata
    })

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
    const auth = await requireAdmin()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

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
        .map((p: any) => p.invoiceId)
        .filter((id: any): id is string => id !== null)
    )]

    // Soft delete all payments with the given IDs
    const result = await softDelete('payment', ids)

    // Update invoice statuses if needed (batch query instead of N+1)
    if (affectedInvoiceIds.length > 0) {
      const invoices = await prisma.invoice.findMany({
        where: { id: { in: affectedInvoiceIds } },
        include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
      })

      for (const invoice of invoices) {
        const totalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
        if (totalPaid < invoice.totalAmount && invoice.status === 'paid') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'sent', paidAt: null },
          })
        }
      }
    }

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'DELETE',
      actionCategory: 'PAYMENT',
      entityType: 'payment',
      entityId: ids.join(','),
      changesSummary: `Bulk deleted ${result.count} payment(s)`,
      ...metadata
    })

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
