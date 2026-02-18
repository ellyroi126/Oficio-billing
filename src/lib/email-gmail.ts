import nodemailer from 'nodemailer'

// Initialize Gmail transporter (only if credentials are available)
const createGmailTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
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

// Send invoice email with PDF attachment using Gmail SMTP
export async function sendInvoiceEmailViaGmail(params: SendInvoiceEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    const transporter = createGmailTransporter()

    // Check if Gmail is configured
    if (!transporter) {
      console.warn('Gmail SMTP not configured')
      return { success: false, error: 'Gmail SMTP not configured' }
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

    // Send email
    const info = await transporter.sendMail({
      from: `"${providerName}" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Invoice #${invoiceNumber} from ${providerName}`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending invoice email via Gmail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// Check if Gmail SMTP is configured
export function isGmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}
