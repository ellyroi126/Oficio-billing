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

// Generate receipt number from payment ID for consistent, readable naming
// Format: RCP-XXXXXXXX (last 8 chars of payment ID, uppercased)
export function generateReceiptNumber(paymentId: string): string {
  return `RCP-${paymentId.slice(-8).toUpperCase()}`
}

// Draw a row of label: value in a clean table style
function drawTableRow(
  page: any,
  label: string,
  value: string,
  y: number,
  opts: {
    labelX: number
    valueX: number
    labelFont: any
    valueFont: any
    labelSize: number
    valueSize: number
    labelColor: any
    valueColor: any
  }
) {
  page.drawText(label, {
    x: opts.labelX,
    y,
    size: opts.labelSize,
    font: opts.labelFont,
    color: opts.labelColor,
  })
  page.drawText(sanitizeText(value), {
    x: opts.valueX,
    y,
    size: opts.valueSize,
    font: opts.valueFont,
    color: opts.valueColor,
  })
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const { width, height } = page.getSize()

  // Load fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const darkText = rgb(0.13, 0.13, 0.13)
  const labelColor = rgb(0.45, 0.45, 0.45)
  const accentColor = rgb(0.16, 0.36, 0.56) // Professional blue
  const successColor = rgb(0.13, 0.55, 0.28) // Green
  const dividerColor = rgb(0.85, 0.85, 0.85)
  const bgColor = rgb(0.96, 0.97, 0.98) // Very light gray

  // Layout
  const ml = 55 // margin left
  const mr = 55 // margin right
  const contentWidth = width - ml - mr

  let y = height - 50

  // === LOGO ===
  let logoHeight = 0
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
    const logoBytes = fs.readFileSync(logoPath)

    let logoImage
    if (logoBytes[0] === 0x89 && logoBytes[1] === 0x50 && logoBytes[2] === 0x4E && logoBytes[3] === 0x47) {
      logoImage = await pdfDoc.embedPng(logoBytes)
    } else if (logoBytes[0] === 0xFF && logoBytes[1] === 0xD8 && logoBytes[2] === 0xFF) {
      logoImage = await pdfDoc.embedJpg(logoBytes)
    } else {
      throw new Error('Unsupported image format')
    }

    const logoDims = logoImage.scale(0.15)
    page.drawImage(logoImage, {
      x: ml - 20,
      y: y - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    })
    logoHeight = logoDims.height
  } catch (error) {
    console.error('Logo not found:', error)
  }

  // === HEADER ===
  y = y - logoHeight - 20

  // Title
  page.drawText('PAYMENT RECEIPT', {
    x: ml,
    y,
    size: 20,
    font: fontBold,
    color: accentColor,
  })

  // Receipt # and Date (right-aligned)
  const rightCol = width - mr
  const receiptNumText = `# ${sanitizeText(data.receiptNumber)}`
  const receiptNumWidth = fontBold.widthOfTextAtSize(receiptNumText, 11)
  page.drawText(receiptNumText, {
    x: rightCol - receiptNumWidth,
    y: y + 4,
    size: 11,
    font: fontBold,
    color: darkText,
  })

  const dateText = formatDate(data.receiptDate)
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, 9)
  page.drawText(dateText, {
    x: rightCol - dateWidth,
    y: y - 10,
    size: 9,
    font: fontRegular,
    color: labelColor,
  })

  y -= 30

  // Divider
  page.drawLine({
    start: { x: ml, y },
    end: { x: width - mr, y },
    thickness: 1.5,
    color: accentColor,
  })

  y -= 30

  // === PAID WATERMARK ===
  const paidFontSize = 60
  const paidText = 'PAID'
  const paidWidth = fontBold.widthOfTextAtSize(paidText, paidFontSize)
  page.drawText(paidText, {
    x: width - mr - paidWidth - 10,
    y: y - 50,
    size: paidFontSize,
    font: fontBold,
    color: successColor,
    opacity: 0.12,
  })

  // === AMOUNT HIGHLIGHT BOX ===
  const boxHeight = 70
  page.drawRectangle({
    x: ml,
    y: y - boxHeight,
    width: contentWidth,
    height: boxHeight,
    color: bgColor,
    borderColor: dividerColor,
    borderWidth: 1,
  })

  page.drawText('Amount Received', {
    x: ml + 20,
    y: y - 22,
    size: 9,
    font: fontRegular,
    color: labelColor,
  })

  page.drawText(`PHP ${formatAmount(data.paymentAmount)}`, {
    x: ml + 20,
    y: y - 48,
    size: 24,
    font: fontBold,
    color: successColor,
  })

  y -= boxHeight + 25

  // === PAYMENT DETAILS ===
  page.drawText('Payment Details', {
    x: ml,
    y,
    size: 11,
    font: fontBold,
    color: accentColor,
  })

  y -= 5
  page.drawLine({
    start: { x: ml, y },
    end: { x: ml + 120, y },
    thickness: 1,
    color: accentColor,
  })

  y -= 18

  const rowOpts = {
    labelX: ml,
    valueX: ml + 130,
    labelFont: fontRegular,
    valueFont: fontBold,
    labelSize: 9.5,
    valueSize: 9.5,
    labelColor: labelColor,
    valueColor: darkText,
  }

  drawTableRow(page, 'Payment Date', formatDate(data.receiptDate), y, rowOpts)
  y -= 16

  drawTableRow(page, 'Payment Method', data.paymentMethod || 'Not specified', y, rowOpts)
  y -= 16

  if (data.referenceNumber) {
    drawTableRow(page, 'Reference Number', data.referenceNumber, y, rowOpts)
    y -= 16
  }

  y -= 15

  // === INVOICE REFERENCE ===
  page.drawText('Invoice Reference', {
    x: ml,
    y,
    size: 11,
    font: fontBold,
    color: accentColor,
  })

  y -= 5
  page.drawLine({
    start: { x: ml, y },
    end: { x: ml + 125, y },
    thickness: 1,
    color: accentColor,
  })

  y -= 18

  drawTableRow(page, 'Invoice Number', data.invoiceNumber, y, rowOpts)
  y -= 16

  drawTableRow(page, 'Invoice Amount', `PHP ${formatAmount(data.invoiceAmount)}`, y, rowOpts)
  y -= 16

  drawTableRow(
    page,
    'Billing Period',
    `${formatShortDate(data.billingPeriodStart)} - ${formatShortDate(data.billingPeriodEnd)}`,
    y,
    rowOpts
  )

  y -= 30

  // Thin divider
  page.drawLine({
    start: { x: ml, y },
    end: { x: width - mr, y },
    thickness: 0.5,
    color: dividerColor,
  })

  y -= 25

  // === PARTIES ===
  const colWidth = (contentWidth - 30) / 2
  const col2X = ml + colWidth + 30

  // From
  page.drawText('FROM', {
    x: ml,
    y,
    size: 8,
    font: fontBold,
    color: accentColor,
  })

  // Received From
  page.drawText('RECEIVED FROM', {
    x: col2X,
    y,
    size: 8,
    font: fontBold,
    color: accentColor,
  })

  y -= 15

  // Provider name
  page.drawText(sanitizeText(data.providerName), {
    x: ml,
    y,
    size: 10,
    font: fontBold,
    color: darkText,
  })

  // Customer name
  page.drawText(sanitizeText(data.customerName), {
    x: col2X,
    y,
    size: 10,
    font: fontBold,
    color: darkText,
  })

  y -= 13

  // Provider address
  const provAddrLines = wrapText(sanitizeText(data.providerAddress), fontRegular, 8.5, colWidth)
  let provY = y
  for (const line of provAddrLines) {
    page.drawText(line, { x: ml, y: provY, size: 8.5, font: fontRegular, color: labelColor })
    provY -= 11
  }

  // Customer address
  const custAddrLines = wrapText(sanitizeText(data.customerAddress || 'N/A'), fontRegular, 8.5, colWidth)
  let custY = y
  for (const line of custAddrLines) {
    page.drawText(line, { x: col2X, y: custY, size: 8.5, font: fontRegular, color: labelColor })
    custY -= 11
  }

  // Provider contact
  if (data.providerEmails.length > 0) {
    page.drawText(sanitizeText(data.providerEmails.join(' / ')), {
      x: ml, y: provY, size: 8.5, font: fontRegular, color: labelColor,
    })
    provY -= 11
  }
  if (data.providerMobiles.length > 0) {
    page.drawText(data.providerMobiles.map(m => formatMobile(m)).join(' / '), {
      x: ml, y: provY, size: 8.5, font: fontRegular, color: labelColor,
    })
    provY -= 11
  }

  // Customer contact
  if (data.customerEmail) {
    page.drawText(sanitizeText(data.customerEmail), {
      x: col2X, y: custY, size: 8.5, font: fontRegular, color: labelColor,
    })
    custY -= 11
  }
  if (data.customerMobile) {
    page.drawText(formatMobile(data.customerMobile), {
      x: col2X, y: custY, size: 8.5, font: fontRegular, color: labelColor,
    })
  }

  // === FOOTER ===
  const footerY = 50
  page.drawLine({
    start: { x: ml, y: footerY + 15 },
    end: { x: width - mr, y: footerY + 15 },
    thickness: 0.5,
    color: dividerColor,
  })

  page.drawText('This is an official receipt for the payment received. Thank you for your payment.', {
    x: ml,
    y: footerY,
    size: 8,
    font: fontRegular,
    color: labelColor,
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
