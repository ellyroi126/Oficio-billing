import { prisma } from '@/lib/prisma'

/**
 * Merges { deletedAt: null } into a Prisma where clause to exclude soft-deleted records.
 */
export function withNotDeleted<T extends Record<string, unknown>>(where: T): T & { deletedAt: null } {
  return { ...where, deletedAt: null }
}

/**
 * Soft-deletes records by setting deletedAt to the current timestamp.
 */
export async function softDelete(
  model: 'client' | 'contract' | 'invoice' | 'payment',
  ids: string[]
) {
  const now = new Date()
  const modelMap = {
    client: prisma.client,
    contract: prisma.contract,
    invoice: prisma.invoice,
    payment: prisma.payment,
  } as const

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (modelMap[model] as any).updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: now },
  })
}

/**
 * Restores soft-deleted records by setting deletedAt to null.
 */
export async function restoreDeleted(
  model: 'client' | 'contract' | 'invoice' | 'payment',
  ids: string[]
) {
  const modelMap = {
    client: prisma.client,
    contract: prisma.contract,
    invoice: prisma.invoice,
    payment: prisma.payment,
  } as const

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (modelMap[model] as any).updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: null },
  })
}

/**
 * Permanently deletes records (bypasses soft delete).
 */
export async function permanentDelete(
  model: 'client' | 'contract' | 'invoice' | 'payment',
  ids: string[]
) {
  const modelMap = {
    client: prisma.client,
    contract: prisma.contract,
    invoice: prisma.invoice,
    payment: prisma.payment,
  } as const

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (modelMap[model] as any).deleteMany({
    where: { id: { in: ids } },
  })
}
