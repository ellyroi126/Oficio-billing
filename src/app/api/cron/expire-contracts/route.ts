import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { expireContracts } from '@/lib/contract-expiry'
import { timingSafeEqual } from 'crypto'

function verifyCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET
  if (!provided || !expected) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await expireContracts()

    // Log to audit if any contracts were expired
    if (result.expired > 0) {
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          userName: 'System',
          userEmail: 'system@oficio.app',
          userRole: 'SYSTEM',
          action: 'AUTO_EXPIRE_CONTRACTS',
          actionCategory: 'CONTRACT',
          entityType: 'contract',
          changesSummary: `Auto-expired ${result.expired} contract${result.expired !== 1 ? 's' : ''}: ${result.contractNumbers.join(', ')}`,
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Cron expire contracts error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
