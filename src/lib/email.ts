import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

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
export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
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
              <h1>${providerName}</h1>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>

              <p>Please find attached Invoice <strong>#${invoiceNumber}</strong> for your billing period.</p>

              <div class="invoice-details">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
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

              <p>Best regards,<br>${providerName}</p>
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
    console.error('Error sending invoice email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// Check if email service is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
