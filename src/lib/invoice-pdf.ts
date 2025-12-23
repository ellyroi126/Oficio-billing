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
  withholdingTax?: number
  netAmount?: number
  hasWithholdingTax?: boolean
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

// Calculate invoice date (7 days before billing period start)
const calculateInvoiceDate = (billingPeriodStart: Date): Date => {
  const invoiceDate = new Date(billingPeriodStart)
  invoiceDate.setDate(invoiceDate.getDate() - 7)
  return invoiceDate
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

  // Load and draw logo (aligned with BILLING INVOICE text)
  let logoHeight = 0
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Oficio_logo.png')
    const logoBytes = fs.readFileSync(logoPath)

    // Detect image format by checking magic bytes
    // PNG starts with: 89 50 4E 47 (‰PNG)
    // JPEG starts with: FF D8 FF
    let logoImage
    if (logoBytes[0] === 0x89 && logoBytes[1] === 0x50 && logoBytes[2] === 0x4E && logoBytes[3] === 0x47) {
      logoImage = await pdfDoc.embedPng(logoBytes)
    } else if (logoBytes[0] === 0xFF && logoBytes[1] === 0xD8 && logoBytes[2] === 0xFF) {
      logoImage = await pdfDoc.embedJpg(logoBytes)
    } else {
      throw new Error('Unsupported image format')
    }

    const logoDims = logoImage.scale(0.17)  // Adjusted scale
    page.drawImage(logoImage, {
      x: marginLeft - 23,  // Adjusted left position
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    })
    logoHeight = logoDims.height
  } catch (error) {
    // Logo not found, continue without it
    console.error('Logo not found:', error)
  }

  // Calculate invoice date as 7 days before billing period start
  const invoiceDate = calculateInvoiceDate(data.billingPeriodStart)

  // Position for header line (below logo)
  const headerLineY = yPosition - logoHeight - 30

  // BILLING INVOICE title (aligned with Due Date)
  page.drawText('BILLING INVOICE', {
    x: marginLeft,
    y: headerLineY - 23,
    size: 24,
    font: fontBold,
    color: primaryColor,
  })

  // Invoice number and date (right aligned, on same header line)
  const detailsX = width - marginRight - 180

  page.drawText(`Invoice #: ${sanitizeText(data.invoiceNumber)}`, {
    x: detailsX,
    y: headerLineY + 5,
    size: 12,
    font: fontBold,
    color: textColor,
  })
  page.drawText(`Date: ${formatDate(invoiceDate)}`, {
    x: detailsX,
    y: headerLineY - 10,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })
  page.drawText(`Due Date: ${formatDate(data.dueDate)}`, {
    x: detailsX,
    y: headerLineY - 23,
    size: 10,
    font: fontBold,
    color: rgb(0.8, 0.2, 0.2), // Red for due date
  })

  yPosition = headerLineY - 28  // Reduced gap to align BILLING INVOICE closer to divider

  // Header divider line
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 25

  // FROM and BILL TO sections (aligned on same row)
  const fromStartY = yPosition
  const billToX = marginLeft + 270 // Aligned closer to FROM

  // FROM section
  page.drawText('FROM:', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })

  // BILL TO section (same Y position)
  page.drawText('BILL TO:', {
    x: billToX,
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

  // BILL TO: Customer name
  page.drawText(sanitizeText(data.customerName), {
    x: billToX,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: textColor,
  })

  yPosition -= 13

  // FROM: Address
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

  // BILL TO: Customer Address
  const custAddressLines = wrapText(sanitizeText(data.customerAddress || 'N/A'), fontRegular, 9, 200)
  let billToY = yPosition
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

  // Continue FROM section
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

  // Continue BILL TO section (email and mobile only, no ATTN)
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

  // Set yPosition to lower of the two columns
  yPosition = Math.min(fromY, billToY) - 20

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
  yPosition -= 25

  // Invoice Table Header
  const colDescription = marginLeft

  // Table header background
  page.drawRectangle({
    x: marginLeft,
    y: yPosition - 5,
    width: contentWidth,
    height: 20,
    color: primaryColor,
  })

  page.drawText('DESCRIPTION', {
    x: colDescription + 5,  // Add spacing from left edge of header
    y: yPosition,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1), // White
  })

  // Right-align AMOUNT header
  const amountHeaderText = 'AMOUNT'
  const amountHeaderWidth = fontBold.widthOfTextAtSize(amountHeaderText, 10)
  page.drawText(amountHeaderText, {
    x: width - marginRight - amountHeaderWidth - 5,  // Right-aligned
    y: yPosition,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  yPosition -= 25

  // Amount column positions - PHP left-aligned, amounts right-aligned
  const phpX = width - marginRight - 130  // Fixed position for PHP
  const rightAlignX = width - marginRight - 5  // Right edge for amounts

  // Helper function to draw currency with PHP left-aligned and amount right-aligned
  const drawCurrencyAmount = (amount: number, yPos: number, fontSize: number, textFont: typeof fontRegular, color: ReturnType<typeof rgb>, isParenthesis: boolean = false) => {
    // Draw PHP at fixed left position
    page.drawText('PHP', {
      x: phpX,
      y: yPos,
      size: fontSize,
      font: textFont,
      color: color,
    })

    // Draw amount right-aligned
    const amountText = isParenthesis ? `(${formatAmount(amount)})` : formatAmount(amount)
    const amountWidth = textFont.widthOfTextAtSize(amountText, fontSize)
    page.drawText(amountText, {
      x: rightAlignX - amountWidth,
      y: yPos,
      size: fontSize,
      font: textFont,
      color: color,
    })
  }

  // Table row - Service Fee
  page.drawText(getFeeLabel(data.billingTerms), {
    x: colDescription + 5,  // Add spacing to align with DESCRIPTION header
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  })

  drawCurrencyAmount(data.amount, yPosition, 10, fontRegular, textColor)

  yPosition -= 18

  // Table row - VAT
  const vatLabel = data.vatInclusive ? 'VAT (12% inclusive)' : 'VAT (12%)'
  page.drawText(vatLabel, {
    x: colDescription + 5,  // Add spacing to align with DESCRIPTION header
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: grayColor,
  })

  drawCurrencyAmount(data.vatAmount, yPosition, 10, fontRegular, grayColor)

  yPosition -= 18

  // Table row - 5% Withholding Tax (if applicable, shown below VAT)
  if (data.hasWithholdingTax && data.withholdingTax && data.withholdingTax > 0) {
    page.drawText('Less: 5% Withholding Tax (EWT)', {
      x: colDescription + 5,  // Add spacing to align with DESCRIPTION header
      y: yPosition,
      size: 10,
      font: fontRegular,
      color: rgb(0.8, 0.2, 0.2), // Red color
    })

    drawCurrencyAmount(data.withholdingTax, yPosition, 10, fontRegular, rgb(0.8, 0.2, 0.2), true)

    yPosition -= 18
  }

  yPosition -= 5

  // Divider line before total
  page.drawLine({
    start: { x: phpX - 10, y: yPosition + 5 },
    end: { x: width - marginRight, y: yPosition + 5 },
    thickness: 1,
    color: textColor,
  })

  // TOTAL row
  const totalLabel = data.hasWithholdingTax ? 'NET AMOUNT DUE' : 'TOTAL'
  const totalAmount = data.hasWithholdingTax && data.netAmount ? data.netAmount : data.totalAmount

  page.drawText(totalLabel, {
    x: colDescription + 5,  // Add spacing to align with DESCRIPTION header
    y: yPosition - 8,
    size: 12,
    font: fontBold,
    color: primaryColor,
  })

  drawCurrencyAmount(totalAmount, yPosition - 8, 12, fontBold, primaryColor)

  yPosition -= 35

  // Payment Terms section
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: lightGray,
  })
  yPosition -= 18

  page.drawText('PAYMENT TERMS', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 13

  const paymentTerms = [
    '* Payment is due 3 days before the start of billing period',
    '* Late payments may incur 0.2% interest per day of delay',
    '* Please include the invoice number as reference when making payment',
  ]

  for (const term of paymentTerms) {
    page.drawText(sanitizeText(term), {
      x: marginLeft,
      y: yPosition,
      size: 8,
      font: fontRegular,
      color: grayColor,
    })
    yPosition -= 10
  }

  yPosition -= 10

  // Payment Instructions section
  page.drawText('PAYMENT INSTRUCTIONS', {
    x: marginLeft,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: primaryColor,
  })
  yPosition -= 15

  // Header payment instructions
  const headerInstructions = [
    { label: 'Please make the check payable to:', value: 'Oficio Property Leasing' },
    { label: 'Or remit by cable transfer to:', value: 'Oficio Property Leasing' },
    { label: 'Account Name:', value: 'Oficio Property Leasing' },
  ]

  for (const instruction of headerInstructions) {
    page.drawText(instruction.label, {
      x: marginLeft,
      y: yPosition,
      size: 8,
      font: fontRegular,
      color: grayColor,
    })
    page.drawText(instruction.value, {
      x: marginLeft + 160,
      y: yPosition,
      size: 8,
      font: fontBold,
      color: textColor,
    })
    yPosition -= 10
  }

  yPosition -= 5 // Space before first bank

  // Bank 1: BDO
  const bdoDetails = [
    { label: 'Bank:', value: 'Banco De Oro' },
    { label: 'Branch:', value: 'Pasig-Sixto Antonio Ave Stella M' },
    { label: 'Bank Code:', value: '1273' },
    { label: 'Account No:', value: '01273-80007-10' },
    { label: 'Swift Code:', value: 'BNORPHMM' },
  ]

  for (const detail of bdoDetails) {
    page.drawText(detail.label, {
      x: marginLeft,
      y: yPosition,
      size: 8,
      font: fontRegular,
      color: grayColor,
    })
    page.drawText(detail.value, {
      x: marginLeft + 160,
      y: yPosition,
      size: 8,
      font: fontBold,
      color: textColor,
    })
    yPosition -= 10
  }

  yPosition -= 5 // Space before second bank

  // Bank 2: Security Bank
  const securityBankDetails = [
    { label: 'Bank:', value: 'Security Bank' },
    { label: 'Branch:', value: 'San Miguel Ave' },
    { label: 'Bank Code:', value: '0381' },
    { label: 'Account No:', value: '00000-31948-733' },
    { label: 'Swift Code:', value: 'SETCPHMMXXX' },
  ]

  for (const detail of securityBankDetails) {
    page.drawText(detail.label, {
      x: marginLeft,
      y: yPosition,
      size: 8,
      font: fontRegular,
      color: grayColor,
    })
    page.drawText(detail.value, {
      x: marginLeft + 160,
      y: yPosition,
      size: 8,
      font: fontBold,
      color: textColor,
    })
    yPosition -= 10
  }

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
