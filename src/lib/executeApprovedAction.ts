import { prisma } from '@/lib/prisma'
import { createAuditLog } from './auditLog'

interface ApprovalRequest {
  id: string
  actionType: string
  entityType: string
  entityId: string
  entityName: string | null
  reason: string | null
  metadata: any
}

/**
 * Execute an approved action
 * This function is called after an admin approves a request
 */
export async function executeApprovedAction(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  const { actionType, entityType, entityId, metadata: requestMetadata } = request

  switch (actionType) {
    case 'DELETE_CLIENT':
      await executeDeleteClient(request, approver, metadata)
      break

    case 'DELETE_CONTRACT':
      await executeDeleteContract(request, approver, metadata)
      break

    case 'DELETE_INVOICE':
      await executeDeleteInvoice(request, approver, metadata)
      break

    case 'DELETE_PAYMENT':
      await executeDeletePayment(request, approver, metadata)
      break

    case 'EDIT_INVOICE_AMOUNT':
      await executeEditInvoiceAmount(request, approver, metadata)
      break

    case 'EDIT_PAYMENT_AMOUNT':
    case 'EDIT_PAYMENT':
      await executeEditPayment(request, approver, metadata)
      break

    case 'UPDATE_COMPANY_SETTINGS':
      await executeUpdateCompanySettings(request, approver, metadata)
      break

    case 'TERMINATE_CONTRACT':
      await executeTerminateContract(request, approver, metadata)
      break

    case 'MODIFY_CONTRACT_SIGNER':
      await executeModifyContractSigner(request, approver, metadata)
      break

    default:
      throw new Error(`Unknown action type: ${actionType}`)
  }
}

async function executeDeleteClient(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  await prisma.client.delete({ where: { id: request.entityId } })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'DELETE',
    actionCategory: 'CLIENT',
    entityType: 'client',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    changesSummary: `Deleted client: ${request.entityName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeDeleteContract(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  await prisma.contract.delete({ where: { id: request.entityId } })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'DELETE',
    actionCategory: 'CONTRACT',
    entityType: 'contract',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    changesSummary: `Deleted contract: ${request.entityName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeDeleteInvoice(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  await prisma.invoice.delete({ where: { id: request.entityId } })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'DELETE',
    actionCategory: 'INVOICE',
    entityType: 'invoice',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    changesSummary: `Deleted invoice: ${request.entityName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeDeletePayment(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  await prisma.payment.delete({ where: { id: request.entityId } })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'DELETE',
    actionCategory: 'PAYMENT',
    entityType: 'payment',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    changesSummary: `Deleted payment: ${request.entityName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeEditInvoiceAmount(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  const oldInvoice = await prisma.invoice.findUnique({ where: { id: request.entityId } })
  if (!oldInvoice) throw new Error('Invoice not found')

  const { newAmount, newVat, newTotal } = request.metadata

  if (typeof newAmount !== 'number' || newAmount <= 0 || typeof newTotal !== 'number' || newTotal <= 0) {
    throw new Error('Invalid amount values in approval metadata')
  }

  // Check that new total isn't less than existing payments
  const existingPayments = await prisma.payment.aggregate({
    where: { invoiceId: request.entityId, deletedAt: null },
    _sum: { amount: true },
  })
  const totalPaid = existingPayments._sum.amount || 0
  if (newTotal < totalPaid) {
    throw new Error(`New total (${newTotal}) cannot be less than total payments already recorded (${totalPaid})`)
  }

  await prisma.invoice.update({
    where: { id: request.entityId },
    data: {
      amount: newAmount,
      vatAmount: newVat,
      totalAmount: newTotal
    }
  })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'UPDATE',
    actionCategory: 'INVOICE',
    entityType: 'invoice',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    beforeData: { amount: oldInvoice.amount, totalAmount: oldInvoice.totalAmount },
    afterData: { amount: newAmount, totalAmount: newTotal },
    changesSummary: `Updated invoice amount from ₱${oldInvoice.amount} to ₱${newAmount}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeEditPayment(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  const oldPayment = await prisma.payment.findUnique({ where: { id: request.entityId } })
  if (!oldPayment) throw new Error('Payment not found')

  const { newPaymentAmount, newPaymentDate, newPaymentMethod, newReferenceNumber, newNotes } = request.metadata || {}

  const updateData: Record<string, unknown> = {}
  const changes: string[] = []

  // Handle amount change (with validation)
  if (newPaymentAmount !== undefined) {
    if (typeof newPaymentAmount !== 'number' || newPaymentAmount <= 0) {
      throw new Error('Invalid payment amount in approval metadata')
    }

    if (oldPayment.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: oldPayment.invoiceId },
        include: { payments: { where: { deletedAt: null }, select: { id: true, amount: true } } },
      })
      if (invoice) {
        const otherPayments = invoice.payments.filter(p => p.id !== request.entityId).reduce((sum, p) => sum + p.amount, 0)
        if (newPaymentAmount > invoice.totalAmount - otherPayments) {
          throw new Error('New payment amount exceeds invoice balance')
        }
      }
    }

    updateData.amount = newPaymentAmount
    changes.push(`amount: ₱${oldPayment.amount} → ₱${newPaymentAmount}`)
  }

  // Handle other field changes
  if (newPaymentDate !== undefined) {
    const [year, month, day] = newPaymentDate.split('-').map(Number)
    updateData.paymentDate = new Date(year, month - 1, day, 12, 0, 0)
    changes.push(`date changed`)
  }
  if (newPaymentMethod !== undefined) {
    updateData.paymentMethod = newPaymentMethod
    changes.push(`method: ${oldPayment.paymentMethod} → ${newPaymentMethod}`)
  }
  if (newReferenceNumber !== undefined) {
    updateData.referenceNumber = newReferenceNumber || null
    changes.push(`reference number updated`)
  }
  if (newNotes !== undefined) {
    updateData.remarks = newNotes || null
    changes.push(`notes updated`)
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No changes to apply')
  }

  await prisma.payment.update({
    where: { id: request.entityId },
    data: updateData,
  })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'UPDATE',
    actionCategory: 'PAYMENT',
    entityType: 'payment',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    beforeData: { amount: oldPayment.amount, paymentDate: oldPayment.paymentDate, paymentMethod: oldPayment.paymentMethod },
    afterData: updateData,
    changesSummary: `Updated payment: ${changes.join(', ')}`,
    reason: request.reason || undefined,
    ...metadata,
  })
}

async function executeUpdateCompanySettings(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  const oldCompany = await prisma.company.findUnique({ where: { id: request.entityId } })
  if (!oldCompany) throw new Error('Company not found')

  const { newData } = request.metadata

  await prisma.company.update({
    where: { id: request.entityId },
    data: {
      name: newData.name,
      contactPerson: newData.contactPerson,
      contactPosition: newData.contactPosition,
      address: newData.address,
      emails: newData.emails,
      mobiles: newData.mobiles,
      telephone: newData.telephone,
      plan: newData.plan,
      signers: newData.signers,
    }
  })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'UPDATE',
    actionCategory: 'SETTINGS',
    entityType: 'company',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    beforeData: oldCompany,
    afterData: newData,
    changesSummary: 'Updated company settings',
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeTerminateContract(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  await prisma.contract.update({
    where: { id: request.entityId },
    data: { status: 'terminated' }
  })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'UPDATE',
    actionCategory: 'CONTRACT',
    entityType: 'contract',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    changesSummary: `Terminated contract: ${request.entityName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}

async function executeModifyContractSigner(
  request: ApprovalRequest,
  approver: { id: string; name: string; email: string },
  metadata: { ipAddress: string; userAgent: string }
) {
  const oldContract = await prisma.contract.findUnique({ where: { id: request.entityId } })
  if (!oldContract) throw new Error('Contract not found')

  const { newSignerName, newSignerPosition } = request.metadata

  await prisma.contract.update({
    where: { id: request.entityId },
    data: {
      signerName: newSignerName,
      signerPosition: newSignerPosition
    }
  })

  await createAuditLog({
    userId: approver.id,
    userName: approver.name,
    userEmail: approver.email,
    userRole: 'ADMIN' as const,
    action: 'UPDATE',
    actionCategory: 'CONTRACT',
    entityType: 'contract',
    entityId: request.entityId,
    entityName: request.entityName || undefined,
    approvalRequestId: request.id,
    wasApproved: true,
    beforeData: { signerName: oldContract.signerName, signerPosition: oldContract.signerPosition },
    afterData: { signerName: newSignerName, signerPosition: newSignerPosition },
    changesSummary: `Modified contract signer from ${oldContract.signerName} to ${newSignerName}`,
    reason: request.reason || undefined,
    ...metadata
  })
}
