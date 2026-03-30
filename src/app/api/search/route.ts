import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { clients: [], invoices: [], contracts: [], payments: [] } })
    }

    const [clients, invoices, contracts, payments] = await Promise.all([
      prisma.client.findMany({
        where: { clientName: { contains: q, mode: 'insensitive' } },
        select: { id: true, clientName: true },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { invoiceNumber: { contains: q, mode: 'insensitive' } },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
        take: 5,
      }),
      prisma.contract.findMany({
        where: { contractNumber: { contains: q, mode: 'insensitive' } },
        select: { id: true, contractNumber: true, status: true },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { referenceNumber: { contains: q, mode: 'insensitive' } },
        select: { id: true, referenceNumber: true, amount: true, paymentMethod: true },
        take: 5,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { clients, invoices, contracts, payments },
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    )
  }
}
