import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Activity {
  id: string
  type: 'client' | 'contract'
  action: string
  description: string
  timestamp: Date
}

export async function GET() {
  try {
    // Fetch recent clients and contracts
    const [recentClients, recentContracts] = await Promise.all([
      prisma.client.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          clientName: true,
          createdAt: true,
        },
      }),
      prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: {
            select: {
              clientName: true,
            },
          },
        },
      }),
    ])

    // Combine and format activities
    const activities: Activity[] = []

    for (const client of recentClients) {
      activities.push({
        id: `client-${client.id}`,
        type: 'client',
        action: 'New Client',
        description: `${client.clientName} was added`,
        timestamp: client.createdAt,
      })
    }

    for (const contract of recentContracts) {
      activities.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        action: 'Contract Created',
        description: `Contract ${contract.contractNumber} for ${contract.client.clientName}`,
        timestamp: contract.createdAt,
      })
    }

    // Sort by timestamp descending and take top 10
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const recentActivities = activities.slice(0, 10)

    return NextResponse.json({
      success: true,
      data: recentActivities,
    })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
