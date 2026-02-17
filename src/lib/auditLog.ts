import { prisma } from '@/lib/prisma'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE' | 'REJECT'
type AuditCategory = 'USER_MGMT' | 'CLIENT' | 'CONTRACT' | 'INVOICE' | 'PAYMENT' | 'SETTINGS' | 'AUTH' | 'APPROVAL'

interface AuditLogParams {
  userId: string
  userName: string
  userEmail: string
  userRole: 'ADMIN' | 'EMPLOYEE'
  action: AuditAction
  actionCategory: AuditCategory
  entityType?: string
  entityId?: string
  entityName?: string
  approvalRequestId?: string
  wasApproved?: boolean
  beforeData?: any
  afterData?: any
  changesSummary?: string
  ipAddress?: string
  userAgent?: string
  reason?: string
}

/**
 * Create an audit log entry
 * Used to track all sensitive operations in the system
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        actionCategory: params.actionCategory,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        approvalRequestId: params.approvalRequestId || null,
        wasApproved: params.wasApproved || false,
        beforeData: params.beforeData || null,
        afterData: params.afterData || null,
        changesSummary: params.changesSummary || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        reason: params.reason || null,
      }
    })
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit log failures shouldn't break the main operation
  }
}

/**
 * Helper to get IP address and User Agent from request
 */
export function getRequestMetadata(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  }
}

/**
 * Create an authentication log entry
 */
export async function createAuthLog(params: {
  userId?: string
  email: string
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET'
  ipAddress?: string
  userAgent?: string
  failureReason?: string
}) {
  try {
    return await prisma.authLog.create({
      data: {
        userId: params.userId || null,
        email: params.email,
        action: params.action,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        failureReason: params.failureReason || null,
      }
    })
  } catch (error) {
    console.error('Error creating auth log:', error)
  }
}
