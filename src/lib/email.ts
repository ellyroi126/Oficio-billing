import { Resend } from 'resend'
import { sendInvoiceEmailViaGmail, isGmailConfigured } from './email-gmail'
import { prisma } from './prisma'

// Initialize Resend client (only if API key is available)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Email provider preference: 'resend', 'gmail', or 'auto' (tries Resend first, falls back to Gmail)
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'auto') as 'resend' | 'gmail' | 'auto'

// Escape HTML to prevent XSS in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Log email to database for audit trail
async function logEmail(recipient: string, subject: string, type: string, status: string, errorMessage?: string) {
  try {
    await prisma.emailLog.create({
      data: { recipient, subject, type, status, errorMessage: errorMessage || null },
    })
  } catch (err) {
    console.error('Failed to write email log:', err)
  }
}

export interface SendInvoiceEmailParams {
  to: string
  clientName: string
  invoiceNumber: string
  dueDate: Date
  totalAmount: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
  pdfBuffer: Buffer
  providerName: string
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Send invoice email with PDF attachment
// Supports multiple providers: Resend or Gmail SMTP
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
  provider?: string
}> {
  try {
    // Determine which provider to use
    let useResend = false
    let useGmail = false

    if (EMAIL_PROVIDER === 'resend') {
      useResend = !!resend
    } else if (EMAIL_PROVIDER === 'gmail') {
      useGmail = isGmailConfigured()
    } else {
      // Auto mode: try Resend first, fall back to Gmail
      useResend = !!resend
      useGmail = !useResend && isGmailConfigured()
    }

    // Try Resend first
    if (useResend && resend) {
      const result = await sendViaResend(params)
      const subject = `Invoice #${params.invoiceNumber} from ${params.providerName}`
      if (result.success) {
        await logEmail(params.to, subject, 'invoice', 'sent')
        return { ...result, provider: 'resend' }
      }
      // If Resend fails and Gmail is available, try Gmail as fallback
      if (EMAIL_PROVIDER === 'auto' && isGmailConfigured()) {
        console.warn('Resend failed, falling back to Gmail:', result.error)
        const gmailResult = await sendInvoiceEmailViaGmail(params)
        await logEmail(params.to, subject, 'invoice', gmailResult.success ? 'sent' : 'failed', gmailResult.error)
        return { ...gmailResult, provider: 'gmail' }
      }
      await logEmail(params.to, subject, 'invoice', 'failed', result.error)
      return { ...result, provider: 'resend' }
    }

    // Try Gmail
    if (useGmail) {
      const result = await sendInvoiceEmailViaGmail(params)
      const subject = `Invoice #${params.invoiceNumber} from ${params.providerName}`
      await logEmail(params.to, subject, 'invoice', result.success ? 'sent' : 'failed', result.error)
      return { ...result, provider: 'gmail' }
    }

    // No provider configured
    console.warn('No email provider configured')
    return { success: false, error: 'Email service not configured' }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// Send via Resend
async function sendViaResend(params: SendInvoiceEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!resend) {
      return { success: false, error: 'Resend not configured' }
    }

    const {
      to,
      clientName,
      invoiceNumber,
      dueDate,
      totalAmount,
      billingPeriodStart,
      billingPeriodEnd,
      pdfBuffer,
      providerName,
    } = params

    // Email HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1a5276; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .invoice-details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .amount { font-size: 24px; color: #1a5276; font-weight: bold; }
            .due-date { color: #c0392b; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .bank-info { background-color: #eef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${escapeHtml(providerName)}</h1>
            </div>
            <div class="content">
              <p>Dear ${escapeHtml(clientName)},</p>

              <p>Please find attached Invoice <strong>#${escapeHtml(invoiceNumber)}</strong> for your billing period.</p>

              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${escapeHtml(invoiceNumber)}</p>
                <p><strong>Billing Period:</strong> ${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}</p>
                <p><strong>Amount Due:</strong> <span class="amount">${formatCurrency(totalAmount)}</span></p>
                <p><strong>Due Date:</strong> <span class="due-date">${formatDate(dueDate)}</span></p>
              </div>

              <div class="bank-info">
                <h3>Payment Instructions</h3>
                <p><strong>Please make the check payable to:</strong> Oficio Property Leasing</p>
                <p><strong>Or remit by cable transfer to:</strong></p>
                <p>
                  <strong>Bank:</strong> Banco De Oro<br>
                  <strong>Branch:</strong> Pasig-Sixto Antonio Ave Stella M<br>
                  <strong>Account No:</strong> 01273-80007-10<br>
                  <strong>Swift Code:</strong> BNORPHMM
                </p>
                <p>
                  <strong>Bank:</strong> Security Bank<br>
                  <strong>Branch:</strong> San Miguel Ave<br>
                  <strong>Account No:</strong> 00000-31948-733<br>
                  <strong>Swift Code:</strong> SETCPHMMXXX
                </p>
              </div>

              <p>Please include the invoice number as reference when making payment.</p>

              <p>Thank you for your business.</p>

              <p>Best regards,<br>${escapeHtml(providerName)}</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textContent = `
Dear ${clientName},

Please find attached Invoice #${invoiceNumber} for your billing period.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Billing Period: ${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}
- Amount Due: ${formatCurrency(totalAmount)}
- Due Date: ${formatDate(dueDate)}

Payment Instructions:
Please make the check payable to: Oficio Property Leasing
Or remit by cable transfer to:

Bank: Banco De Oro
Branch: Pasig-Sixto Antonio Ave Stella M
Account No: 01273-80007-10
Swift Code: BNORPHMM

Bank: Security Bank
Branch: San Miguel Ave
Account No: 00000-31948-733
Swift Code: SETCPHMMXXX

Please include the invoice number as reference when making payment.

Thank you for your business.

Best regards,
${providerName}
    `.trim()

    const { data, error } = await resend.emails.send({
      from: `${providerName} <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: [to],
      subject: `Invoice #${invoiceNumber} from ${providerName}`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Error sending via Resend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email via Resend',
    }
  }
}

// Check if any email service is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY || isGmailConfigured()
}

// Get configured email provider
export function getEmailProvider(): 'resend' | 'gmail' | 'none' {
  if (EMAIL_PROVIDER === 'gmail' && isGmailConfigured()) {
    return 'gmail'
  }
  if (EMAIL_PROVIDER === 'resend' && resend) {
    return 'resend'
  }
  // Auto mode
  if (resend) return 'resend'
  if (isGmailConfigured()) return 'gmail'
  return 'none'
}
