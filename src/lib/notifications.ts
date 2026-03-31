import { prisma } from '@/lib/prisma'
import type { NotificationItem } from '@/types/notification'

const ACTION_LABELS: Record<string, string> = {
  DELETE_CLIENT: 'Delete Client',
  DELETE_CONTRACT: 'Delete Contract',
  DELETE_INVOICE: 'Delete Invoice',
  DELETE_PAYMENT: 'Delete Payment',
  EDIT_INVOICE_AMOUNT: 'Edit Invoice Amount',
  EDIT_PAYMENT_AMOUNT: 'Edit Payment Amount',
  TERMINATE_CONTRACT: 'Terminate Contract',
  MODIFY_CONTRACT_SIGNER: 'Modify Contract Signer',
  UPDATE_COMPANY_SETTINGS: 'Update Company Settings',
}

interface ApprovalRequestData {
  id: string
  requestedBy: string
  requestedByName: string
  actionType: string
  entityName: string | null
}

export async function createApprovalOutcomeNotification(
  request: ApprovalRequestData,
  outcome: 'APPROVED' | 'REJECTED'
) {
  const actionLabel = ACTION_LABELS[request.actionType] || request.actionType
  const outcomeWord = outcome === 'APPROVED' ? 'approved' : 'rejected'

  await prisma.notification.create({
    data: {
      userId: request.requestedBy,
      type: outcome === 'APPROVED' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      title: `Request ${outcome === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      message: `Your ${actionLabel.toLowerCase()} request for "${request.entityName || 'unknown'}" was ${outcomeWord}`,
      linkUrl: '/my-requests',
    }
  })
}

export async function createNewApprovalRequestNotification(
  request: ApprovalRequestData
) {
  const actionLabel = ACTION_LABELS[request.actionType] || request.actionType

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true }
  })

  if (admins.length === 0) return

  await prisma.notification.createMany({
    data: admins.map(admin => ({
      userId: admin.id,
      type: 'NEW_APPROVAL_REQUEST',
      title: 'New Approval Request',
      message: `${request.requestedByName} requested ${actionLabel.toLowerCase()} for "${request.entityName || 'unknown'}"`,
      linkUrl: '/approvals',
    }))
  })
}

export async function getOverdueInvoiceNotifications(): Promise<NotificationItem[]> {
  const now = new Date()

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['pending', 'sent'] },
      dueDate: { lt: now },
    },
    select: {
      id: true,
      invoiceNumber: true,
      dueDate: true,
      totalAmount: true,
      client: { select: { clientName: true } }
    },
    orderBy: { dueDate: 'desc' },
    take: 20,
  })

  return overdueInvoices.map(inv => ({
    id: `virtual-invoice-${inv.id}`,
    type: 'OVERDUE_INVOICE' as const,
    title: 'Invoice Overdue',
    message: `Invoice ${inv.invoiceNumber} for ${inv.client.clientName} is overdue`,
    linkUrl: `/invoices/${inv.id}`,
    isRead: false,
    createdAt: inv.dueDate.toISOString(),
    isVirtual: true,
  }))
}

export async function getExpiringContractNotifications(): Promise<NotificationItem[]> {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [expired, expiring] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { lt: now },
      },
      select: {
        id: true,
        contractNumber: true,
        endDate: true,
        client: { select: { clientName: true } }
      },
      orderBy: { endDate: 'desc' },
      take: 10,
    }),
    prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
      select: {
        id: true,
        contractNumber: true,
        endDate: true,
        client: { select: { clientName: true } }
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
  ])

  const expiredNotifs: NotificationItem[] = expired.map(c => ({
    id: `virtual-contract-expired-${c.id}`,
    type: 'CONTRACT_EXPIRED' as const,
    title: 'Contract Expired',
    message: `Contract ${c.contractNumber} for ${c.client.clientName} has expired`,
    linkUrl: `/contracts/${c.id}`,
    isRead: false,
    createdAt: c.endDate.toISOString(),
    isVirtual: true,
  }))

  const expiringNotifs: NotificationItem[] = expiring.map(c => {
    const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: `virtual-contract-expiring-${c.id}`,
      type: 'CONTRACT_EXPIRING' as const,
      title: 'Contract Expiring Soon',
      message: `Contract ${c.contractNumber} for ${c.client.clientName} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      linkUrl: `/contracts/${c.id}`,
      isRead: false,
      createdAt: c.endDate.toISOString(),
      isVirtual: true,
    }
  })

  return [...expiredNotifs, ...expiringNotifs]
}
