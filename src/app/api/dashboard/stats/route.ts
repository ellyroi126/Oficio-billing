import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel for better performance
    const [
      totalClients,
      activeContracts,
      expiringSoon,
    ] = await Promise.all([
      // Total clients
      prisma.client.count(),

      // Active contracts (status = 'active')
      prisma.contract.count({
        where: { status: 'active' },
      }),

      // Contracts expiring in the next 30 days
      prisma.contract.count({
        where: {
          status: 'active',
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        activeContracts,
        expiringSoon,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
