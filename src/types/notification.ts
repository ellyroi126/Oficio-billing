export type NotificationType =
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'NEW_APPROVAL_REQUEST'
  | 'OVERDUE_INVOICE'
  | 'CONTRACT_EXPIRED'
  | 'CONTRACT_EXPIRING'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  createdAt: string
  isVirtual?: boolean
}
