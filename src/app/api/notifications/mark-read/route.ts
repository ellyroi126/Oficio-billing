import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const body = await req.json()
    const { ids, all } = body

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: auth.user.id, isRead: false },
        data: { isRead: true },
      })
    } else if (ids && Array.isArray(ids)) {
      // Filter out virtual IDs (they start with "virtual-")
      const realIds = ids.filter((id: string) => !id.startsWith('virtual-'))
      if (realIds.length > 0) {
        await prisma.notification.updateMany({
          where: {
            id: { in: realIds },
            userId: auth.user.id,
          },
          data: { isRead: true },
        })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide "ids" array or "all: true"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
