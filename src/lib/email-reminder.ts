import { sendInvoiceEmail, isEmailConfigured as baseIsConfigured } from './email'

export { baseIsConfigured as isEmailConfigured }

export interface SendReminderEmailParams {
  to: string
  clientName: string
  invoiceNumber: string
  dueDate: Date
  totalAmount: number
  daysOverdue: number
  providerName: string
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function sendReminderEmail(params: SendReminderEmailParams): Promise<{
  success: boolean
  error?: string
}> {
  // We reuse the sendInvoiceEmail infrastructure but with a custom subject/body
  // Since sendInvoiceEmail requires a PDF, we'll use the Resend/Gmail directly
  // For simplicity, we'll import and use the email sending via the same mechanism

  try {
    const { Resend } = await import('resend')
    const { sendReminderEmailViaGmail } = await import('./email-reminder-gmail')

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
    const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'auto') as 'resend' | 'gmail' | 'auto'

    const { to, clientName, invoiceNumber, dueDate, totalAmount, daysOverdue, providerName } = params

    const subject = `Payment Reminder: Invoice #${invoiceNumber} is ${daysOverdue} day(s) overdue`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #c0392b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .invoice-details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .amount { font-size: 24px; color: #c0392b; font-weight: bold; }
            .overdue { color: #c0392b; font-weight: bold; font-size: 18px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>

              <p>This is a friendly reminder that Invoice <strong>#${invoiceNumber}</strong> is now <span class="overdue">${daysOverdue} day(s) overdue</span>.</p>

              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> <span class="amount">${formatCurrency(totalAmount)}</span></p>
                <p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>
                <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
              </div>

              <p>We kindly request that you arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.</p>

              <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

              <p>Thank you for your prompt attention to this matter.</p>

              <p>Best regards,<br>${providerName}</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
Dear ${clientName},

This is a friendly reminder that Invoice #${invoiceNumber} is now ${daysOverdue} day(s) overdue.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount Due: ${formatCurrency(totalAmount)}
- Due Date: ${formatDate(dueDate)}
- Days Overdue: ${daysOverdue}

We kindly request that you arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.

Thank you for your prompt attention to this matter.

Best regards,
${providerName}
    `.trim()

    // Try Resend first
    if ((EMAIL_PROVIDER === 'resend' || EMAIL_PROVIDER === 'auto') && resend) {
      try {
        const { error } = await resend.emails.send({
          from: `${providerName} <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
          to: [to],
          subject,
          html: htmlContent,
          text: textContent,
        })

        if (error) {
          if (EMAIL_PROVIDER === 'auto') {
            // Fall back to Gmail
            return sendReminderEmailViaGmail({ to, subject, html: htmlContent, text: textContent })
          }
          return { success: false, error: error.message }
        }
        return { success: true }
      } catch (e) {
        if (EMAIL_PROVIDER === 'auto') {
          return sendReminderEmailViaGmail({ to, subject, html: htmlContent, text: textContent })
        }
        return { success: false, error: e instanceof Error ? e.message : 'Failed to send via Resend' }
      }
    }

    // Try Gmail
    if (EMAIL_PROVIDER === 'gmail' || EMAIL_PROVIDER === 'auto') {
      return sendReminderEmailViaGmail({ to, subject, html: htmlContent, text: textContent })
    }

    return { success: false, error: 'No email provider configured' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send reminder' }
  }
}
