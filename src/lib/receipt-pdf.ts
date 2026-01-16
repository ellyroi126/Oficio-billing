import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

// Receipt data interface
export interface ReceiptData {
  // Receipt details
  receiptNumber: string
  receiptDate: Date

  // Payment details
  paymentAmount: number
  paymentMethod: string
  referenceNumber?: string | null

  // Invoice reference
  invoiceNumber: string
  invoiceAmount: number
  billingPeriodStart: Date
  billingPeriodEnd: Date

  // Provider (from Company)
  providerName: string
  providerAddress: string
  providerEmails: string[]
  providerMobiles: string[]
  providerTelephone?: string | null

  // Customer (from Client)
  customerName: string
  customerAddress: string
  customerEmail?: string
  customerMobile?: string
  customerContactPerson?: string
}

// Sanitize text for PDF (replace unsupported characters)
const sanitizeText = (text: string): string => {
  if (!text) return ''
  let result = String(text)

  // Replace line breaks with spaces
  result = result.replace(/\r\n/g, ' ')
  result = result.replace(/\r/g, ' ')
  result = result.replace(/\n/g, ' ')
  result = result.replace(/\t/g, ' ')

  // Replace smart quotes with regular quotes
  result = result.replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
  result = result.replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'")

  // Em/en dashes
  result = result.replace(/[\u2013\u2014\u2015\u2212]/g, '-')

  // Ellipsis
  result = result.replace(/\u2026/g, '...')

  // Various spaces to regular space
  result = result.replace(/\u00A0/g, ' ')
  result = result.replace(/[\u2000-\u200B]/g, ' ')
  result = result.replace(/\u202F/g, ' ')
  result = result.replace(/\u205F/g, ' ')
  result = result.replace(/\u3000/g, ' ')

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim()

  // Remove any character not in WinAnsi range
  result = result.split('').filter(char => {
    const code = char.charCodeAt(0)
    return (code >= 0x20 && code <= 0x7E) || (code >= 0xA0 && code <= 0xFF)
  }).join('')

  return result
}

// Format currency number only (without PHP prefix)
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format short date
const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format mobile as (+63)XXXXXXXXX
const formatMobile = (mobile: string) => {
  if (!mobile) return ''
  const mobileStr = String(mobile).trim()
  if (!mobileStr) return ''
  let cleaned = mobileStr.replace(/[^\d+]/g, '').replace(/^(\+63|63|0)/, '')
  return '(+63)' + cleaned
}

// Generate receipt number: RCP + timestamp
export function generateReceiptNumber(): string {
  const timestamp = Date.now()
  return `RCP${timestamp}`
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()

  // Load fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const primaryColor = rgb(0.2, 0.4, 0.6) // Blue
  const textColor = rgb(0.1, 0.1, 0.1)
  const grayColor = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.9, 0.9, 0.9)
  const successColor = rgb(0.1, 0.6, 0.3) // Green for PAID

  // Margins
  const marginLeft = 50
  const marginRight = 50
  const contentWidth = width - marginLeft - marginRight

  let yPosition = height - 50

  // Load and draw logo
  let logoHeight = 0
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
    const logoBytes = fs.readFileSync(logoPath)

    // Detect image format by magic bytes
    let logoImage
    if (logoBytes[0] === 0x89 && logoBytes[1] === 0x50 && logoBytes[2] === 0x4E && logoBytes[3] === 0x47) {
      logoImage = await pdfDoc.embedPng(logoBytes)
    } else if (logoBytes[0] === 0xFF && logoBytes[1] === 0xD8 && logoBytes[2] === 0xFF) {
      logoImage = await pdfDoc.embedJpg(logoBytes)
    } else {
      throw new Error('Unsupported image format')
    }

    const logoDims = logoImage.scale(0.17)
    page.drawImage(logoImage, {
      x: marginLeft - 23,
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    })
    logoHeight = logoDims.height
  } catch (error) {
    console.error('Logo not found:', error)
  }

  // Position for header line (below logo)
  const headerLineY = yPosition - logoHeight - 30

  // PAYMENT RECEIPT title
  page.drawText('PAYMENT RECEIPT', {
    x: marginLeft,
    y: headerLineY - 10,
    size: 24,
    font: fontBold,
    color: primaryColor,
  })

  // Receipt number and date (right aligned)
  const detailsX = width - marginRight - 180

  page.drawText(`Receipt #: ${sanitizeText(data.receiptNumber)}`, {
    x: detailsX,
    y: headerLineY + 5,
    size: 12,
    font: fontBold,
    color: textColor,
  })
  page.drawText(`Date: ${formatDate(data.receiptDate)}`, {
    x: detailsX,
    y: headerLineY - 10,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })

  yPosition = headerLineY - 28

  // Header divider line
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 25

  // PAID stamp
  const paidText = 'PAID'
  const paidFontSize = 48
  const paidWidth = fontBold.widthOfTextAtSize(paidText, paidFontSize)
  page.drawText(paidText, {
    x: width - marginRight - paidWidth - 20,
    y: yPosition - 30,
    size: paidFontSize,
    font: fontBold,
    color: successColor,
    opacity: 0.3,
  })

  // FROM and RECEIVED FROM sections
  const fromStartY = yPosition
  const receivedFromX = marginLeft + 270

  // FROM section
  page.drawText('FROM:', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })

  // RECEIVED FROM section
  page.drawText('RECEIVED FROM:', {
    x: receivedFromX,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })

  yPosition -= 15

  // FROM: Provider name
  page.drawText(sanitizeText(data.providerName), {
    x: marginLeft,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: textColor,
  })

  // RECEIVED FROM: Customer name
  page.drawText(sanitizeText(data.customerName), {
    x: receivedFromX,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: textColor,
  })

  yPosition -= 13

  // Provider address
  const addressLines = wrapText(sanitizeText(data.providerAddress), fontRegular, 9, 200)
  let fromY = yPosition
  for (const line of addressLines) {
    page.drawText(line, {
      x: marginLeft,
      y: fromY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    fromY -= 12
  }

  // Customer address
  const custAddressLines = wrapText(sanitizeText(data.customerAddress || 'N/A'), fontRegular, 9, 200)
  let custY = yPosition
  for (const line of custAddressLines) {
    page.drawText(line, {
      x: receivedFromX,
      y: custY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    custY -= 12
  }

  // Provider contact info
  if (data.providerEmails.length > 0) {
    page.drawText(sanitizeText(data.providerEmails.join(' / ')), {
      x: marginLeft,
      y: fromY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    fromY -= 12
  }

  if (data.providerMobiles.length > 0) {
    page.drawText(data.providerMobiles.map(m => formatMobile(m)).join(' / '), {
      x: marginLeft,
      y: fromY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    fromY -= 12
  }

  // Customer contact info
  if (data.customerEmail) {
    page.drawText(sanitizeText(data.customerEmail), {
      x: receivedFromX,
      y: custY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    custY -= 12
  }

  if (data.customerMobile) {
    page.drawText(formatMobile(data.customerMobile), {
      x: receivedFromX,
      y: custY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
  }

  yPosition = Math.min(fromY, custY) - 30

  // Payment Details Section
  page.drawText('PAYMENT DETAILS', {
    x: marginLeft,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 20

  // Payment details table background
  page.drawRectangle({
    x: marginLeft,
    y: yPosition - 80,
    width: contentWidth,
    height: 100,
    color: lightGray,
  })

  // Payment amount (large)
  page.drawText('Amount Received:', {
    x: marginLeft + 10,
    y: yPosition - 5,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })
  page.drawText(`PHP ${formatAmount(data.paymentAmount)}`, {
    x: marginLeft + 10,
    y: yPosition - 25,
    size: 20,
    font: fontBold,
    color: successColor,
  })

  // Payment method
  page.drawText('Payment Method:', {
    x: marginLeft + 10,
    y: yPosition - 50,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })
  page.drawText(sanitizeText(data.paymentMethod || 'Not specified'), {
    x: marginLeft + 110,
    y: yPosition - 50,
    size: 10,
    font: fontBold,
    color: textColor,
  })

  // Reference number
  if (data.referenceNumber) {
    page.drawText('Reference #:', {
      x: marginLeft + 10,
      y: yPosition - 68,
      size: 10,
      font: fontRegular,
      color: grayColor,
    })
    page.drawText(sanitizeText(data.referenceNumber), {
      x: marginLeft + 110,
      y: yPosition - 68,
      size: 10,
      font: fontBold,
      color: textColor,
    })
  }

  yPosition -= 110

  // Invoice Reference Section
  page.drawText('INVOICE REFERENCE', {
    x: marginLeft,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 20

  // Invoice details
  const invoiceDetails = [
    { label: 'Invoice Number:', value: data.invoiceNumber },
    { label: 'Invoice Amount:', value: `PHP ${formatAmount(data.invoiceAmount)}` },
    { label: 'Billing Period:', value: `${formatShortDate(data.billingPeriodStart)} - ${formatShortDate(data.billingPeriodEnd)}` },
  ]

  for (const detail of invoiceDetails) {
    page.drawText(detail.label, {
      x: marginLeft,
      y: yPosition,
      size: 10,
      font: fontRegular,
      color: grayColor,
    })
    page.drawText(sanitizeText(detail.value), {
      x: marginLeft + 120,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: textColor,
    })
    yPosition -= 15
  }

  yPosition -= 30

  // Divider
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 20

  // Footer note
  page.drawText('This is an official receipt for the payment received.', {
    x: marginLeft,
    y: yPosition,
    size: 9,
    font: fontRegular,
    color: grayColor,
  })
  yPosition -= 12
  page.drawText('Thank you for your payment.', {
    x: marginLeft,
    y: yPosition,
    size: 9,
    font: fontRegular,
    color: grayColor,
  })

  // Save and return
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// Helper function to wrap text
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}
