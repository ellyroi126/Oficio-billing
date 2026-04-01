import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware/roleCheck'
import { restoreDeleted, permanentDelete } from '@/lib/softDelete'

/**
 * GET /api/trash
 * List all soft-deleted records across all entity types
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const [clients, contracts, invoices, payments] = await Promise.all([
      prisma.client.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, clientName: true, status: true, deletedAt: true },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.contract.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, contractNumber: true, status: true, deletedAt: true, client: { select: { clientName: true } } },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true, deletedAt: true, client: { select: { clientName: true } } },
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, amount: true, paymentDate: true, paymentMethod: true, deletedAt: true, client: { select: { clientName: true } } },
        orderBy: { deletedAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { clients, contracts, invoices, payments },
    })
  } catch (error) {
    console.error('Error fetching trash:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trash', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/trash
 * Restore soft-deleted records
 * Body: { model: 'client'|'contract'|'invoice'|'payment', ids: string[] }
 */
export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const body = await req.json()
    const { model, ids } = body

    if (!model || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'model and ids are required' }, { status: 400 })
    }

    if (!['client', 'contract', 'invoice', 'payment'].includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    await restoreDeleted(model, ids)

    return NextResponse.json({
      success: true,
      message: `Restored ${ids.length} ${model}(s)`,
    })
  } catch (error) {
    console.error('Error restoring records:', error)
    return NextResponse.json(
      { error: 'Failed to restore records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/trash
 * Permanently delete records
 * Body: { model: 'client'|'contract'|'invoice'|'payment', ids: string[] }
 */
export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const body = await req.json()
    const { model, ids } = body

    if (!model || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'model and ids are required' }, { status: 400 })
    }

    if (!['client', 'contract', 'invoice', 'payment'].includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    await permanentDelete(model, ids)

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${ids.length} ${model}(s)`,
    })
  } catch (error) {
    console.error('Error permanently deleting records:', error)
    return NextResponse.json(
      { error: 'Failed to permanently delete records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
