import { prisma } from '@/lib/prisma'

/**
 * Find active contracts past their end date and update them to "expired".
 * Called by both the cron endpoint and inline when notifications are fetched.
 */
export async function expireContracts() {
  const now = new Date()

  const expiredContracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      endDate: { lt: now },
    },
    select: {
      id: true,
      contractNumber: true,
    },
  })

  if (expiredContracts.length === 0) {
    return { expired: 0, contractNumbers: [] as string[] }
  }

  await prisma.contract.updateMany({
    where: {
      id: { in: expiredContracts.map(c => c.id) },
    },
    data: {
      status: 'expired',
    },
  })

  return {
    expired: expiredContracts.length,
    contractNumbers: expiredContracts.map(c => c.contractNumber),
  }
}
