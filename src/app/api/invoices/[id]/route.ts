import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { softDelete } from '@/lib/softDelete'

// GET - Get single invoice with payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              orderBy: { isPrimary: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    if (!invoice || invoice.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice is overdue and update status
    const now = new Date()
    if (
      ['pending', 'sent'].includes(invoice.status) &&
      new Date(invoice.dueDate) < now
    ) {
      await prisma.invoice.update({
        where: { id },
        data: { status: 'overdue' }
      })
      invoice.status = 'overdue'
    }

    // Calculate balance
    const totalPaid = invoice.payments.reduce((sum: any, p: any) => sum + p.amount, 0)
    const balance = invoice.totalAmount - totalPaid

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        totalPaid,
        balance,
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PUT - Update invoice (status, dates, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const { id } = await params
    const body = await request.json()

    // Verify invoice exists
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Amount changes require admin
    if (body.amount !== undefined || body.vatAmount !== undefined || body.totalAmount !== undefined) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Editing invoice amounts requires admin approval' },
          { status: 403 }
        )
      }
      if (body.amount !== undefined) updateData.amount = body.amount
      if (body.vatAmount !== undefined) updateData.vatAmount = body.vatAmount
      if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount
    }

    if (body.status) {
      updateData.status = body.status

      // Set timestamps based on status
      if (body.status === 'sent' && !existing.sentAt) {
        updateData.sentAt = new Date()
      }
      if (body.status === 'paid') {
        updateData.paidAt = new Date()
      }
    }

    if (body.dueDate) {
      const [year, month, day] = body.dueDate.split('-').map(Number)
      updateData.dueDate = new Date(year, month - 1, day, 12, 0, 0)
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
        payments: true,
      },
    })

    // Calculate balance
    const totalPaid = invoice.payments.reduce((sum: any, p: any) => sum + p.amount, 0)
    const balance = invoice.totalAmount - totalPaid

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'INVOICE',
      entityType: 'invoice',
      entityId: id,
      entityName: `${existing.invoiceNumber} - ${invoice.client?.clientName || ''}`,
      beforeData: { status: existing.status },
      afterData: updateData,
      changesSummary: `Updated invoice ${existing.invoiceNumber}${body.status ? ` status to "${body.status}"` : ''}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        totalPaid,
        balance,
      },
    })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE - Delete single invoice — Admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const { id } = await params

    // Verify invoice exists
    const existing = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Soft delete invoice
    await softDelete('invoice', [id])

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'DELETE',
      actionCategory: 'INVOICE',
      entityType: 'invoice',
      entityId: id,
      entityName: existing.invoiceNumber,
      changesSummary: `Deleted invoice ${existing.invoiceNumber}`,
      ...metadata
    })

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
