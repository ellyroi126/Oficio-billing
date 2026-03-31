'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Bell, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Check } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { NotificationItem, NotificationType } from '@/types/notification'

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  APPROVAL_APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  APPROVAL_REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  NEW_APPROVAL_REQUEST: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  OVERDUE_INVOICE: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  CONTRACT_EXPIRED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  CONTRACT_EXPIRING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const result = await res.json()
      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => n.isVirtual ? n : { ...n, isRead: true }))
      setUnreadCount(notifications.filter(n => n.isVirtual).length)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleClick = async (notification: NotificationItem) => {
    if (!notification.isVirtual && !notification.isRead) {
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(console.error)

      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    if (notification.linkUrl) {
      router.push(notification.linkUrl)
    }
  }

  return (
    <div>
      <Header title="Notifications" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {notifications.map(notification => {
                  const config = TYPE_CONFIG[notification.type] || { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' }
                  const Icon = config.icon

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleClick(notification)}
                      className={`w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                        !notification.isRead ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 rounded-full p-2 ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 pt-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
