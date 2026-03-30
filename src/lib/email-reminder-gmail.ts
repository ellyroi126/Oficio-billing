import nodemailer from 'nodemailer'

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

export async function sendReminderEmailViaGmail(params: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createGmailTransporter()
    if (!transporter) {
      return { success: false, error: 'Gmail SMTP not configured' }
    }

    await transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME || 'Oficio Property Leasing'}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send via Gmail' }
  }
}
