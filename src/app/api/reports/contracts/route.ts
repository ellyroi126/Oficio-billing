import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get contract counts by status
    const [draftCount, activeCount, expiredCount, terminatedCount] = await Promise.all([
      prisma.contract.count({ where: { status: 'draft' } }),
      prisma.contract.count({ where: { status: 'active' } }),
      prisma.contract.count({ where: { status: 'expired' } }),
      prisma.contract.count({ where: { status: 'terminated' } }),
    ])

    const totalContracts = draftCount + activeCount + expiredCount + terminatedCount

    // Get contracts with client info for the detailed list
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: totalContracts,
          draft: draftCount,
          active: activeCount,
          expired: expiredCount,
          terminated: terminatedCount,
        },
        contracts: contracts.map((contract: any) => ({
          id: contract.id,
          contractNumber: contract.contractNumber,
          clientName: contract.client.clientName,
          clientId: contract.client.id,
          status: contract.status,
          startDate: contract.startDate,
          endDate: contract.endDate,
          createdAt: contract.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching contract status report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contract status report' },
      { status: 500 }
    )
  }
}
