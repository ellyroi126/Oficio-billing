import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const isAdmin = session.user.role === 'ADMIN'

    const [approvalsPending, overdueInvoices] = await Promise.all([
      isAdmin
        ? prisma.approvalRequest.count({ where: { status: 'PENDING' } })
        : Promise.resolve(0),
      prisma.invoice.count({
        where: {
          status: { in: ['pending', 'sent'] },
          dueDate: { lt: now },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { approvalsPending, overdueInvoices },
    })
  } catch (error) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sidebar counts' },
      { status: 500 }
    )
  }
}
