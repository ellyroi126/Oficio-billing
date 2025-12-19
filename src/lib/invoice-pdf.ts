import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

// Invoice data interface
export interface InvoiceData {
  // Invoice details
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date

  // Provider (from Company)
  providerName: string
  providerAddress: string
  providerEmails: string[]
  providerMobiles: string[]
  providerTelephone?: string | null

  // Customer (from Client)
  customerName: string
  customerAddress: string
  customerEmail: string
  customerMobile: string
  customerContactPerson: string

  // Amounts
  amount: number
  vatAmount: number
  totalAmount: number
  vatInclusive: boolean

  // Billing period
  billingPeriodStart: Date
  billingPeriodEnd: Date
  billingTerms: string
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

// Format currency as "PHP X,XXX.XX"
const formatCurrency = (amount: number) => {
  return 'PHP ' + new Intl.NumberFormat('en-PH', {
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

// Get fee label based on billing terms
const getFeeLabel = (billingTerms: string): string => {
  switch (billingTerms) {
    case 'Monthly':
      return 'Monthly Service Fee'
    case 'Quarterly':
      return 'Quarterly Service Fee'
    case 'Semi-Annual':
      return 'Semi-Annual Service Fee'
    case 'Annual':
      return 'Annual Service Fee'
    default:
      return 'Service Fee'
  }
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
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

  // Margins
  const marginLeft = 50
  const marginRight = 50
  const contentWidth = width - marginLeft - marginRight

  let yPosition = height - 50

  // Load and draw logo
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImage.scale(0.15)
    page.drawImage(logoImage, {
      x: marginLeft,
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    })
    yPosition -= logoDims.height + 20
  } catch (error) {
    // Logo not found, continue without it
    console.error('Logo not found:', error)
  }

  // INVOICE title
  page.drawText('INVOICE', {
    x: marginLeft,
    y: yPosition,
    size: 28,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 30

  // Invoice details (right aligned)
  const detailsX = width - marginRight - 200
  page.drawText(`Invoice #: ${sanitizeText(data.invoiceNumber)}`, {
    x: detailsX,
    y: yPosition + 25,
    size: 10,
    font: fontBold,
    color: textColor,
  })
  page.drawText(`Date: ${formatDate(data.invoiceDate)}`, {
    x: detailsX,
    y: yPosition + 12,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })
  page.drawText(`Due Date: ${formatDate(data.dueDate)}`, {
    x: detailsX,
    y: yPosition - 1,
    size: 10,
    font: fontBold,
    color: rgb(0.8, 0.2, 0.2), // Red for due date
  })

  yPosition -= 40

  // Divider line
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 25

  // FROM section
  page.drawText('FROM:', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 15

  page.drawText(sanitizeText(data.providerName), {
    x: marginLeft,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: textColor,
  })
  yPosition -= 13

  // Wrap address
  const addressLines = wrapText(sanitizeText(data.providerAddress), fontRegular, 9, 250)
  for (const line of addressLines) {
    page.drawText(line, {
      x: marginLeft,
      y: yPosition,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 12
  }

  if (data.providerEmails.length > 0) {
    page.drawText(sanitizeText(data.providerEmails.join(' / ')), {
      x: marginLeft,
      y: yPosition,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 12
  }

  if (data.providerMobiles.length > 0) {
    page.drawText(data.providerMobiles.map(m => formatMobile(m)).join(' / '), {
      x: marginLeft,
      y: yPosition,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 12
  }

  // BILL TO section (right column)
  const billToX = width / 2 + 20
  let billToY = yPosition + 65

  page.drawText('BILL TO:', {
    x: billToX,
    y: billToY,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  billToY -= 15

  page.drawText(sanitizeText(data.customerName), {
    x: billToX,
    y: billToY,
    size: 11,
    font: fontBold,
    color: textColor,
  })
  billToY -= 13

  const custAddressLines = wrapText(sanitizeText(data.customerAddress), fontRegular, 9, 230)
  for (const line of custAddressLines) {
    page.drawText(line, {
      x: billToX,
      y: billToY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    billToY -= 12
  }

  page.drawText(`Attn: ${sanitizeText(data.customerContactPerson)}`, {
    x: billToX,
    y: billToY,
    size: 9,
    font: fontRegular,
    color: grayColor,
  })
  billToY -= 12

  if (data.customerEmail) {
    page.drawText(sanitizeText(data.customerEmail), {
      x: billToX,
      y: billToY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    billToY -= 12
  }

  if (data.customerMobile) {
    page.drawText(formatMobile(data.customerMobile), {
      x: billToX,
      y: billToY,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
  }

  yPosition -= 40

  // Billing Period
  page.drawText('BILLING PERIOD', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 15

  page.drawText(`${formatShortDate(data.billingPeriodStart)} - ${formatShortDate(data.billingPeriodEnd)}`, {
    x: marginLeft,
    y: yPosition,
    size: 11,
    font: fontRegular,
    color: textColor,
  })
  yPosition -= 30

  // Invoice Table Header
  const tableStartY = yPosition
  const colDescription = marginLeft
  const colAmount = width - marginRight - 100

  // Table header background
  page.drawRectangle({
    x: marginLeft,
    y: yPosition - 5,
    width: contentWidth,
    height: 20,
    color: primaryColor,
  })

  page.drawText('DESCRIPTION', {
    x: colDescription + 10,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1), // White
  })

  page.drawText('AMOUNT', {
    x: colAmount,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  yPosition -= 25

  // Table row - Service Fee
  page.drawText(getFeeLabel(data.billingTerms), {
    x: colDescription + 10,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  })

  page.drawText(formatCurrency(data.amount), {
    x: colAmount,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  })

  yPosition -= 18

  // Table row - VAT
  const vatLabel = data.vatInclusive ? 'VAT (12% inclusive)' : 'VAT (12%)'
  page.drawText(vatLabel, {
    x: colDescription + 10,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })

  page.drawText(formatCurrency(data.vatAmount), {
    x: colAmount,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })

  yPosition -= 20

  // Divider line before total
  page.drawLine({
    start: { x: colAmount - 50, y: yPosition + 5 },
    end: { x: width - marginRight, y: yPosition + 5 },
    thickness: 1,
    color: textColor,
  })

  // Total
  page.drawText('TOTAL', {
    x: colDescription + 10,
    y: yPosition - 5,
    size: 12,
    font: fontBold,
    color: textColor,
  })

  page.drawText(formatCurrency(data.totalAmount), {
    x: colAmount,
    y: yPosition - 5,
    size: 12,
    font: fontBold,
    color: primaryColor,
  })

  yPosition -= 50

  // Payment Terms section
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 20

  page.drawText('PAYMENT TERMS', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 15

  const paymentTerms = [
    '* Payment is due 3 days before the start of billing period',
    '* Late payments may incur 0.2% interest per day of delay',
    '* Please include the invoice number as reference when making payment',
  ]

  for (const term of paymentTerms) {
    page.drawText(sanitizeText(term), {
      x: marginLeft,
      y: yPosition,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 12
  }

  yPosition -= 15

  // Payment Methods section
  page.drawText('PAYMENT METHODS', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 15

  page.drawText('Bank Transfer:', {
    x: marginLeft,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: textColor,
  })
  yPosition -= 12

  const bankDetails = [
    'Bank: BDO (Banco de Oro)',
    'Account Name: Oficio Property Leasing',
    'Account Number: XXXX-XXXX-XXXX',
  ]

  for (const detail of bankDetails) {
    page.drawText(sanitizeText(detail), {
      x: marginLeft + 10,
      y: yPosition,
      size: 9,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 12
  }

  // Footer
  page.drawText('Thank you for your business!', {
    x: width / 2 - 60,
    y: 50,
    size: 10,
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
