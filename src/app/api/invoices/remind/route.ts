import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware/roleCheck'
import { createAuditLog, getRequestMetadata } from '@/lib/auditLog'
import { sendReminderEmail, isEmailConfigured } from '@/lib/email-reminder'

// POST - Send overdue reminders
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }
    const user = auth.user

    const body = await request.json()
    const { invoiceIds } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No invoice IDs provided' },
        { status: 400 }
      )
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 400 }
      )
    }

    // Fetch overdue invoices with client and contact info
    const now = new Date()
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        status: { in: ['sent', 'pending'] },
        dueDate: { lt: now },
      },
      include: {
        client: {
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    })

    if (invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No overdue invoices found among the selected' },
        { status: 400 }
      )
    }

    const company = await prisma.company.findFirst()
    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company settings not configured' },
        { status: 400 }
      )
    }

    const results: {
      invoiceId: string
      invoiceNumber: string
      success: boolean
      error?: string
    }[] = []

    for (const invoice of invoices) {
      const primaryContact = invoice.client.contacts[0]
      const recipientEmail = primaryContact?.email

      if (!recipientEmail) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: 'No primary contact email',
        })
        continue
      }

      try {
        const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))

        const emailResult = await sendReminderEmail({
          to: recipientEmail,
          clientName: invoice.client.clientName,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate,
          totalAmount: invoice.totalAmount,
          daysOverdue,
          providerName: company.name,
        })

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: emailResult.success,
          error: emailResult.error,
        })
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send reminder',
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      userRole: user.role as 'ADMIN' | 'EMPLOYEE',
      action: 'UPDATE',
      actionCategory: 'INVOICE',
      entityType: 'invoice',
      entityName: `Reminder sent for ${successCount} invoice(s)`,
      afterData: { invoiceNumbers: results.filter(r => r.success).map(r => r.invoiceNumber) },
      changesSummary: `Sent overdue reminders for ${successCount} invoice(s)`,
      ...metadata,
    })

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminder(s) out of ${results.length} invoice(s).`,
      results,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
