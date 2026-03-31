import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { getOverdueInvoiceNotifications, getExpiringContractNotifications } from '@/lib/notifications'
import type { NotificationItem } from '@/types/notification'

export async function GET() {
  const auth = await requireAuth()
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
  }

  try {
    const stored = await prisma.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const storedItems: NotificationItem[] = stored.map(n => ({
      id: n.id,
      type: n.type as NotificationItem['type'],
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }))

    // Compute virtual notifications
    const [overdueNotifs, contractNotifs] = await Promise.all([
      getOverdueInvoiceNotifications(),
      getExpiringContractNotifications(),
    ])

    const all = [...storedItems, ...overdueNotifs, ...contractNotifs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const storedUnread = stored.filter(n => !n.isRead).length
    const virtualCount = overdueNotifs.length + contractNotifs.length
    const unreadCount = storedUnread + virtualCount

    return NextResponse.json({
      success: true,
      data: {
        notifications: all,
        unreadCount,
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
