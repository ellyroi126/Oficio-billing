import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get contract counts by status
    const [draftCount, activeCount, expiredCount, terminatedCount, voidCount] = await Promise.all([
      prisma.contract.count({ where: { status: 'draft', deletedAt: null } }),
      prisma.contract.count({ where: { status: 'active', deletedAt: null } }),
      prisma.contract.count({ where: { status: 'expired', deletedAt: null } }),
      prisma.contract.count({ where: { status: 'terminated', deletedAt: null } }),
      prisma.contract.count({ where: { status: 'void', deletedAt: null } }),
    ])

    const totalContracts = draftCount + activeCount + expiredCount + terminatedCount + voidCount

    // Get contracts with client info for the detailed list
    const contracts = await prisma.contract.findMany({
      where: { deletedAt: null },
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

    // Find expired contracts without a newer active/draft contract for the same client
    const expiredContracts = await prisma.contract.findMany({
      where: { status: 'expired', deletedAt: null },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            rentalRate: true,
          },
        },
      },
      orderBy: { endDate: 'desc' },
    })

    // For each expired contract, check if the client has an active or draft contract
    // that starts on or after the expired contract's end date (i.e., a renewal)
    const expiredWithoutRenewal = []
    for (const contract of expiredContracts) {
      const renewal = await prisma.contract.findFirst({
        where: {
          clientId: contract.clientId,
          deletedAt: null,
          status: { in: ['active', 'draft'] },
          startDate: { gte: contract.endDate },
        },
      })
      if (!renewal) {
        expiredWithoutRenewal.push({
          id: contract.id,
          contractNumber: contract.contractNumber,
          clientId: contract.client.id,
          clientName: contract.client.clientName,
          rentalRate: contract.client.rentalRate,
          startDate: contract.startDate,
          endDate: contract.endDate,
          daysSinceExpiry: Math.ceil(
            (Date.now() - contract.endDate.getTime()) / (24 * 60 * 60 * 1000)
          ),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: totalContracts,
          draft: draftCount,
          active: activeCount,
          expired: expiredCount,
          terminated: terminatedCount,
          void: voidCount,
          expiredWithoutRenewal: expiredWithoutRenewal.length,
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
        expiredWithoutRenewal,
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
