import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Get contracts expiring in different time periods
    const [
      expiringIn30Days,
      expiringIn60Days,
      expiringIn90Days,
    ] = await Promise.all([
      // Expiring in next 30 days
      prisma.contract.findMany({
        where: {
          status: 'active',
          endDate: {
            gte: now,
            lte: thirtyDays,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              rentalRate: true,
              billingTerms: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
      }),

      // Expiring in 31-60 days
      prisma.contract.findMany({
        where: {
          status: 'active',
          endDate: {
            gt: thirtyDays,
            lte: sixtyDays,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              rentalRate: true,
              billingTerms: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
      }),

      // Expiring in 61-90 days
      prisma.contract.findMany({
        where: {
          status: 'active',
          endDate: {
            gt: sixtyDays,
            lte: ninetyDays,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              rentalRate: true,
              billingTerms: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
      }),
    ])

    const formatContract = (contract: typeof expiringIn30Days[0]) => ({
      id: contract.id,
      contractNumber: contract.contractNumber,
      clientId: contract.client.id,
      clientName: contract.client.clientName,
      rentalRate: contract.client.rentalRate,
      billingTerms: contract.client.billingTerms,
      startDate: contract.startDate,
      endDate: contract.endDate,
      daysUntilExpiry: Math.ceil(
        (contract.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          next30Days: expiringIn30Days.length,
          next60Days: expiringIn60Days.length,
          next90Days: expiringIn90Days.length,
          total: expiringIn30Days.length + expiringIn60Days.length + expiringIn90Days.length,
        },
        renewals: {
          next30Days: expiringIn30Days.map(formatContract),
          next60Days: expiringIn60Days.map(formatContract),
          next90Days: expiringIn90Days.map(formatContract),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching upcoming renewals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upcoming renewals' },
      { status: 500 }
    )
  }
}
