'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Check } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { NotificationItem, NotificationType } from '@/types/notification'

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  APPROVAL_APPROVED: { icon: CheckCircle, color: 'text-green-500' },
  APPROVAL_REJECTED: { icon: XCircle, color: 'text-red-500' },
  NEW_APPROVAL_REQUEST: { icon: FileText, color: 'text-blue-500' },
  OVERDUE_INVOICE: { icon: AlertTriangle, color: 'text-orange-500' },
  CONTRACT_EXPIRED: { icon: AlertTriangle, color: 'text-red-500' },
  CONTRACT_EXPIRING: { icon: Clock, color: 'text-amber-500' },
}

export function NotificationDropdown() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    }
  }, [])

  // Initial fetch + poll every 60s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Listen for refresh events (e.g., after approving a request)
  useEffect(() => {
    const handleRefresh = () => fetchNotifications()
    window.addEventListener('notifications-refresh', handleRefresh)
    return () => window.removeEventListener('notifications-refresh', handleRefresh)
  }, [fetchNotifications])

  // Re-fetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
    }
  }, [isOpen, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => n.isVirtual ? n : { ...n, isRead: true }))
      setUnreadCount(prev => {
        const virtualCount = notifications.filter(n => n.isVirtual && !n.isRead).length
        return virtualCount
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    // Mark as read if not virtual
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

    setIsOpen(false)

    if (notification.linkUrl) {
      router.push(notification.linkUrl)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 20).map(notification => {
                const config = TYPE_CONFIG[notification.type] || { icon: Bell, color: 'text-gray-500' }
                const Icon = config.icon

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 pt-1.5">
                      {!notification.isRead ? (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      ) : (
                        <div className="h-2 w-2" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0 pt-0.5">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications')
                }}
                className="w-full py-2.5 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                View All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
