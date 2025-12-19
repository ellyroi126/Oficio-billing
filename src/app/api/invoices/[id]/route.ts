import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Calculate balance
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
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
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
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
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE - Delete single invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Delete invoice (payments will be disconnected but not deleted)
    await prisma.invoice.delete({
      where: { id },
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
